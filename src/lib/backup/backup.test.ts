import { beforeEach, describe, expect, it } from 'vitest'
import {
  BackupError,
  BACKUP_TABLES,
  BACKUP_VERSION,
  backupFileName,
  buildBackup,
  importBackup,
  parseBackup,
} from './backup'
import { base64ToBytes } from '../bytes'
import { db } from '../db/db'
import {
  childProfiles,
  diapers,
  feedings,
  files,
  measurements,
  milestones,
  reminderCompletions,
  reminders,
  settingsRepository,
  sleepSessions,
} from '../repositories'
import { at, clearDatabase } from '../../test/helpers'

const PHOTO_BYTES = new TextEncoder().encode('байты фотографии').buffer as ArrayBuffer
/** Строк во всех таблицах после seedEverything(). */
const ROW_COUNT = 9

/** Заполняет все таблицы так, чтобы строки ссылались друг на друга как в жизни. */
async function seedEverything() {
  const child = await childProfiles.add({ name: 'Соня', birthDate: '2026-02-15', avatarColor: '#d95d6e' })
  await sleepSessions.add({
    childId: child.id,
    startAt: at(2026, 5, 12, 23, 30),
    endAt: at(2026, 5, 13, 6, 30),
    note: 'ночь',
  })
  await feedings.add({ childId: child.id, type: 'bottle', startAt: at(2026, 5, 13, 7), amountMl: 120 })
  await diapers.add({ childId: child.id, at: at(2026, 5, 13, 8), type: 'pee' })
  await measurements.add({ childId: child.id, measuredOn: '2026-05-13', weightKg: 4.2, heightCm: 53 })
  const photo = await files.add(PHOTO_BYTES, { name: 'first-smile.jpg', mimeType: 'image/jpeg' })
  await milestones.add({ childId: child.id, title: 'Первая улыбка', date: '2026-05-13', photoId: photo.id })
  const reminder = await reminders.add({
    childId: null,
    title: 'Упражнения',
    rule: { kind: 'interval', everyMinutes: 180, from: at(2026, 5, 13, 8), to: at(2026, 5, 13, 20) },
    note: 'мяч',
  })
  await reminderCompletions.markDone(reminder.id, at(2026, 5, 13, 8), at(2026, 5, 13, 8, 5))
  return child
}

/** Содержимое всех таблиц: ключ — имя таблицы, значение — её строки. */
async function snapshot(): Promise<Record<string, unknown[]>> {
  const tables = BACKUP_TABLES.map((name) => db.table(name))
  const rows = await Promise.all(tables.map((table) => table.toArray()))
  return Object.fromEntries(BACKUP_TABLES.map((name, index) => [name, rows[index] ?? []]))
}

const EMPTY_SNAPSHOT = Object.fromEntries(BACKUP_TABLES.map((name) => [name, []]))

describe('buildBackup', () => {
  beforeEach(clearDatabase)

  it('создаёт JSON с меткой формата и датами в виде строк', async () => {
    await seedEverything()

    const parsed = JSON.parse(await buildBackup())

    expect(parsed.format).toBe('baby-tracker-backup')
    expect(parsed.version).toBe(BACKUP_VERSION)
    expect(typeof parsed.exportedAt).toBe('string')
    expect(parsed.data.children).toHaveLength(1)
    expect(typeof parsed.data.children[0].createdAt).toBe('string')
    expect(typeof parsed.data.sleepSessions[0].startAt).toBe('string')
    expect(parsed.data.sleepSessions[0].endAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('кодирует фотографии в base64', async () => {
    await seedEverything()

    const parsed = JSON.parse(await buildBackup())

    expect(parsed.data.files[0].name).toBe('first-smile.jpg')
    expect(new TextDecoder().decode(base64ToBytes(parsed.data.files[0].dataBase64))).toBe('байты фотографии')
  })

  it('не включает настройки устройства и удалённые записи', async () => {
    await settingsRepository.set('theme', 'dark')
    const child = await childProfiles.add({ name: 'Соня', birthDate: '2026-02-15', avatarColor: '#d95d6e' })
    const removed = await diapers.add({ childId: child.id, at: at(2026, 5, 13, 8), type: 'pee' })
    await diapers.remove(removed.id)

    const parsed = JSON.parse(await buildBackup())

    expect(parsed.data).not.toHaveProperty('settings')
    expect(parsed.data.diapers).toEqual([])
  })

  it('backupFileName содержит дату', async () => {
    expect(backupFileName(at(2026, 5, 13))).toBe('baby-tracker-backup-2026-05-13.json')
  })
})

describe('parseBackup', () => {
  beforeEach(clearDatabase)

  it('восстанавливает даты, байты и считает записи', async () => {
    await seedEverything()
    const text = await buildBackup()

    const parsed = parseBackup(text)

    expect(parsed.exportedAt).toBeInstanceOf(Date)
    expect(parsed.data.children[0]?.createdAt).toBeInstanceOf(Date)
    expect(parsed.data.reminders[0]?.rule).toEqual({
      kind: 'interval',
      everyMinutes: 180,
      from: expect.any(Date),
      to: expect.any(Date),
    })
    expect(new TextDecoder().decode(parsed.data.files[0]?.data)).toBe('байты фотографии')
    expect(parsed.counts).toEqual({
      children: 1,
      sleepSessions: 1,
      feedings: 1,
      diapers: 1,
      measurements: 1,
      milestones: 1,
      reminders: 1,
      reminderCompletions: 1,
      files: 1,
    })
  })

  it('отбрасывает не-JSON', () => {
    expect(() => parseBackup('это не json')).toThrow(BackupError)
    expect(() => parseBackup('')).toThrow(/не удалось прочитать JSON/)
  })

  it('отбрасывает JSON без метки формата', () => {
    expect(() => parseBackup('{"hello":"world"}')).toThrow(BackupError)
    expect(() => parseBackup('{"format":"baby-tracker-backup"}')).toThrow(/не похож на резервную копию/)
  })

  it('отбрасывает запись с полем неверного типа', async () => {
    await seedEverything()
    const payload = JSON.parse(await buildBackup())
    payload.data.children[0].name = 5
    payload.data.children[0].birthDate = 'завтра'

    expect(() => parseBackup(JSON.stringify(payload))).toThrow(/children\.0\.(name|birthDate)/)
  })

  it('отбрасывает испорченную фотографию', async () => {
    await seedEverything()
    const payload = JSON.parse(await buildBackup())
    payload.data.files[0].dataBase64 = '%%% не base64 %%%'

    expect(() => parseBackup(JSON.stringify(payload))).toThrow(/фотографи/)
  })
})

describe('importBackup', () => {
  beforeEach(clearDatabase)

  it('экспорт → очистка → импорт восстанавливает базу дословно', async () => {
    await seedEverything()
    const before = await snapshot()
    const text = await buildBackup()
    await clearDatabase()
    expect(await snapshot()).toEqual(EMPTY_SNAPSHOT)

    const summary = await importBackup(text)

    expect(summary.added).toBe(ROW_COUNT)
    expect(summary.updated).toBe(0)
    expect(summary.skipped).toBe(0)
    expect(await snapshot()).toEqual(before)
  })

  it('повторный импорт той же копии ничего не меняет', async () => {
    await seedEverything()
    const text = await buildBackup()

    const summary = await importBackup(text)

    expect(summary).toEqual({
      added: 0,
      updated: 0,
      skipped: ROW_COUNT,
      tables: expect.any(Object),
    })
  })

  it('не затирает более новые локальные изменения', async () => {
    await seedEverything()
    const text = await buildBackup()
    const child = (await childProfiles.list())[0]!
    await childProfiles.update(child.id, { name: 'Сонечка' })

    const summary = await importBackup(text)

    expect(summary.skipped).toBe(ROW_COUNT)
    expect((await childProfiles.get(child.id))?.name).toBe('Сонечка')
  })

  it('заменяет запись, если в копии она новее', async () => {
    await seedEverything()
    const child = (await childProfiles.list())[0]!
    const payload = JSON.parse(await buildBackup())
    const newer = new Date(child.updatedAt.getTime() + 60_000)
    payload.data.children[0].name = 'Соня из копии'
    payload.data.children[0].updatedAt = newer.toISOString()
    await childProfiles.update(child.id, { name: 'Локальная правка' })

    const summary = await importBackup(JSON.stringify(payload))

    expect(summary.tables.children).toEqual({ added: 0, updated: 1, skipped: 0 })
    expect((await childProfiles.get(child.id))?.name).toBe('Соня из копии')
  })

  it('объединяет с существующими данными, ничего не удаляя', async () => {
    // Копия с другого устройства: в ней нет Миши.
    await seedEverything()
    const text = await buildBackup()
    await clearDatabase()

    // А на этом устройстве уже ведут дневник Миши.
    const misha = await childProfiles.add({ name: 'Миша', birthDate: '2025-01-10', avatarColor: '#2e75b5' })
    const diaper = await diapers.add({ childId: misha.id, at: at(2026, 5, 13, 8), type: 'pee' })

    const summary = await importBackup(text)

    // Порядок — по времени создания: у Сони из копии оно раньше.
    expect((await childProfiles.list()).map((child) => child.name)).toEqual(['Соня', 'Миша'])
    const diaperIds = (await diapers.list()).map((entry) => entry.id)
    expect(diaperIds).toHaveLength(2)
    expect(diaperIds).toContain(diaper.id)
    expect(summary.added).toBe(ROW_COUNT)
  })

  it('после импорта ребёнка экран первого включения больше не нужен', async () => {
    await seedEverything()
    const text = await buildBackup()
    await clearDatabase()
    await settingsRepository.set('onboardingDone', false)

    await importBackup(text)

    expect((await settingsRepository.get()).onboardingDone).toBe(true)
  })

  it('импорт копии без детей не трогает экран первого включения', async () => {
    await settingsRepository.set('onboardingDone', false)
    const reminder = await reminders.add({ childId: null, title: 'Упражнения', rule: { kind: 'daily', time: '10:00' } })
    const text = await buildBackup()
    await reminders.remove(reminder.id)

    await importBackup(text)

    expect((await settingsRepository.get()).onboardingDone).toBe(false)
  })

  it('ничего не записывает, если копия повреждена', async () => {
    await expect(importBackup('{"format":"чужой"}')).rejects.toThrow(BackupError)
    expect(await snapshot()).toEqual(EMPTY_SNAPSHOT)
  })
})
