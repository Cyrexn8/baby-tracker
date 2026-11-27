import { db } from '../db/db'
import type { FeedingType } from '../db/schema'
import { isTheme, type Theme } from '../theme'
import { DEFAULT_DAY_START_HOUR } from '../time/day'

/** Настройки устройства. Хранятся в таблице `settings` по одной записи на ключ. */
export interface Settings {
  theme: Theme
  /** Ребёнок, который сейчас выбран в переключателе. `null` — берётся первый. */
  activeChildId: string | null
  /** Экран первого включения показывается, пока здесь `false`. */
  onboardingDone: boolean
  /** Час, с которого начинается «день малыша» (см. src/lib/time/day.ts). */
  dayStartHour: number
  /** Последняя выбранная вкладка кормления: с неё начнёт следующая запись. */
  lastFeedingTab: FeedingType
}

const DEFAULTS: Settings = {
  theme: 'system',
  activeChildId: null,
  onboardingDone: false,
  dayStartHour: DEFAULT_DAY_START_HOUR,
  lastFeedingTab: 'bottle',
}

const FEEDING_TYPES: readonly FeedingType[] = ['breast', 'bottle', 'solid']

/** Возвращает значение, если оно подходит для ключа, иначе `undefined`. */
function sanitize(key: keyof Settings, value: unknown): unknown {
  switch (key) {
    case 'theme':
      return isTheme(value) ? value : undefined
    case 'activeChildId':
      return typeof value === 'string' ? value : undefined
    case 'onboardingDone':
      return typeof value === 'boolean' ? value : undefined
    case 'dayStartHour':
      return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 12 ? value : undefined
    case 'lastFeedingTab':
      return FEEDING_TYPES.includes(value as FeedingType) ? value : undefined
  }
}

async function get(): Promise<Settings> {
  const rows = await db.settings.toArray()
  const stored = new Map(rows.map((row) => [row.key, row.value]))
  const result: Record<string, unknown> = { ...DEFAULTS }
  for (const key of Object.keys(DEFAULTS) as (keyof Settings)[]) {
    const value = sanitize(key, stored.get(key))
    if (value !== undefined) result[key] = value
  }
  return result as unknown as Settings
}

async function set<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
  if (sanitize(key, value) === undefined) throw new Error(`Недопустимое значение настройки ${key}: ${String(value)}`)
  await db.settings.put({ key, value })
}

async function setMany(patch: Partial<Settings>): Promise<void> {
  await db.settings.bulkPut(Object.entries(patch).map(([key, value]) => ({ key, value })))
}

/** Полный сброс настроек до значений по умолчанию. */
async function reset(): Promise<void> {
  await db.settings.clear()
}

export const settingsRepository = { get, set, setMany, reset, DEFAULTS }
