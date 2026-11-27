import type { Table } from 'dexie'
import { db } from '../db/db'
import type { BaseEntity, StoredFile } from '../db/schema'
import { arrayBufferToBase64, base64ToArrayBuffer } from '../bytes'
import { now } from '../clock'
import { backupSchema, type BackupData } from '../validation/schemas'
import { settingsRepository } from '../repositories/settings'
import { toDateInputValue } from '../time/format'

/**
 * Резервная копия — один JSON-файл со всеми данными пользователя.
 * Она же — формат, в котором локальные данные переедут в аккаунт, когда появится сервер.
 */

export const BACKUP_FORMAT = 'baby-tracker-backup'
export const BACKUP_VERSION = 1

export const BACKUP_TABLES = [
  'children',
  'sleepSessions',
  'feedings',
  'diapers',
  'measurements',
  'milestones',
  'reminders',
  'reminderCompletions',
  'files',
] as const

export type BackupTable = (typeof BACKUP_TABLES)[number]

export class BackupError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackupError'
  }
}

/** Данные копии после чтения: всё как в базе, у файлов восстановлены байты. */
export type RestoredData = Omit<BackupData, 'files'> & { files: StoredFile[] }

// Поля с датами в записях. При чтении JSON строки в них превращаются обратно в Date.
const DATE_KEYS = new Set([
  'createdAt',
  'updatedAt',
  'deletedAt',
  'startAt',
  'endAt',
  'at',
  'from',
  'to',
  'dueAt',
  'doneAt',
  'snoozedUntil',
])
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/

function reviveDates(key: string, value: unknown): unknown {
  if (typeof value === 'string' && DATE_KEYS.has(key) && ISO_DATETIME.test(value)) return new Date(value)
  return value
}

async function live<T extends BaseEntity>(table: Table<T, string>): Promise<T[]> {
  return table.filter((row) => row.deletedAt === null).toArray()
}

/** Собирает содержимое резервной копии из базы. Настройки устройства не входят. */
export async function buildBackup(): Promise<string> {
  const [children, sleepSessions, feedings, diapers, measurements, milestones, reminders, reminderCompletions, files] =
    await Promise.all([
      live(db.children),
      live(db.sleepSessions),
      live(db.feedings),
      live(db.diapers),
      live(db.measurements),
      live(db.milestones),
      live(db.reminders),
      live(db.reminderCompletions),
      live(db.files),
    ])

  // JSON.stringify превращает Date в ISO-строки сам (через toJSON).
  return JSON.stringify({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now().toISOString(),
    data: {
      children,
      sleepSessions,
      feedings,
      diapers,
      measurements,
      milestones,
      reminders,
      reminderCompletions,
      files: files.map((file) => ({
        id: file.id,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
        deletedAt: file.deletedAt,
        name: file.name,
        mimeType: file.mimeType,
        dataBase64: arrayBufferToBase64(file.data),
      })),
    },
  })
}

export interface ParsedBackup {
  exportedAt: Date | null
  /** Число записей по таблицам — чтобы показать пользователю до импорта. */
  counts: Record<BackupTable, number>
  data: RestoredData
}

/** Читает и проверяет файл копии. Бросает BackupError с понятным текстом. */
export function parseBackup(text: string): ParsedBackup {
  let raw: unknown
  try {
    raw = JSON.parse(text, reviveDates)
  } catch {
    throw new BackupError('Файл повреждён: не удалось прочитать JSON.')
  }

  const result = backupSchema.safeParse(raw)
  if (!result.success) {
    const details = result.error.issues
      .slice(0, 3)
      .map((issue) => (issue.path.length > 0 ? `${issue.path.join('.')}: ${issue.message}` : issue.message))
      .join('; ')
    throw new BackupError(`Файл не похож на резервную копию Baby Tracker. ${details}`)
  }

  let files: StoredFile[]
  try {
    files = result.data.data.files.map(({ dataBase64, ...rest }) => ({
      ...rest,
      data: base64ToArrayBuffer(dataBase64),
    }))
  } catch {
    throw new BackupError('Файл повреждён: не удалось прочитать фотографии.')
  }

  const source = result.data.data
  const data: RestoredData = {
    children: source.children,
    sleepSessions: source.sleepSessions,
    feedings: source.feedings,
    diapers: source.diapers,
    measurements: source.measurements,
    milestones: source.milestones,
    reminders: source.reminders,
    reminderCompletions: source.reminderCompletions,
    files,
  }
  const counts = Object.fromEntries(BACKUP_TABLES.map((name) => [name, data[name].length])) as Record<
    BackupTable,
    number
  >

  const exportedAt = new Date(result.data.exportedAt)
  return { exportedAt: Number.isNaN(exportedAt.getTime()) ? null : exportedAt, counts, data }
}

export interface TableSummary {
  added: number
  updated: number
  skipped: number
}

export interface ImportSummary {
  added: number
  updated: number
  skipped: number
  tables: Record<BackupTable, TableSummary>
}

/**
 * Импортирует копию, объединяя с существующими данными по `id`:
 * новой записи не было — добавляем; в копии она новее — заменяем; иначе пропускаем.
 * Ничего не удаляется.
 */
export async function importBackup(text: string): Promise<ImportSummary> {
  const { data } = parseBackup(text)
  const tables = Object.fromEntries(
    BACKUP_TABLES.map((name) => [name, { added: 0, updated: 0, skipped: 0 }]),
  ) as Record<BackupTable, TableSummary>

  // Таблица настроек тоже входит в транзакцию: в конце импорта в неё пишется onboardingDone.
  const stores = [...BACKUP_TABLES.map((name) => db.table(name)), db.settings]

  await db.transaction('rw', stores, async () => {
    await merge(db.children, data.children, 'children', tables)
    await merge(db.sleepSessions, data.sleepSessions, 'sleepSessions', tables)
    await merge(db.feedings, data.feedings, 'feedings', tables)
    await merge(db.diapers, data.diapers, 'diapers', tables)
    await merge(db.measurements, data.measurements, 'measurements', tables)
    await merge(db.milestones, data.milestones, 'milestones', tables)
    await merge(db.reminders, data.reminders, 'reminders', tables)
    await merge(db.reminderCompletions, data.reminderCompletions, 'reminderCompletions', tables)
    await merge(db.files, data.files, 'files', tables)

    // Раз в базе появился ребёнок, экран первого включения больше не нужен.
    const hasChildren = (await db.children.filter((row) => row.deletedAt === null).count()) > 0
    if (hasChildren) await settingsRepository.set('onboardingDone', true)
  })

  const summary: ImportSummary = { added: 0, updated: 0, skipped: 0, tables }
  for (const table of Object.values(tables)) {
    summary.added += table.added
    summary.updated += table.updated
    summary.skipped += table.skipped
  }
  return summary
}

async function merge<T extends BaseEntity>(
  table: Table<T, string>,
  incoming: T[],
  name: BackupTable,
  tables: Record<BackupTable, TableSummary>,
): Promise<void> {
  for (const row of incoming) {
    const existing = await table.get(row.id)
    if (!existing) {
      await table.add(row)
      tables[name].added += 1
    } else if (row.updatedAt.getTime() > existing.updatedAt.getTime()) {
      await table.put(row)
      tables[name].updated += 1
    } else {
      tables[name].skipped += 1
    }
  }
}

/** Имя файла копии: baby-tracker-backup-2026-11-27.json */
export function backupFileName(date = now()): string {
  return `baby-tracker-backup-${toDateInputValue(date)}.json`
}

/** Предлагает браузеру сохранить текст как файл. */
export function downloadTextFile(text: string, fileName: string, type = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Максимальный размер файла копии. Достаточно для тысяч фотографий. */
export const MAX_BACKUP_BYTES = 200 * 1024 * 1024

/** Проверяет, что выбранный файл — резервная копия, и возвращает его текст. */
export async function readBackupFile(file: Blob): Promise<string> {
  if (file.size === 0) throw new BackupError('Файл пуст.')
  if (file.size > MAX_BACKUP_BYTES) throw new BackupError('Файл слишком большой для резервной копии.')

  let text: string
  try {
    text = await file.text()
  } catch {
    throw new BackupError('Не удалось прочитать файл.')
  }
  parseBackup(text)
  return text
}
