import { db } from '../lib/db/db'

/** Очищает все таблицы тестовой базы. Вызывайте в beforeEach. */
export async function clearDatabase(): Promise<void> {
  await Promise.all(db.tables.map((table) => table.clear()))
}

/** Локальная дата и время: at(2026, 5, 12, 9, 30) → 12 мая 2026, 09:30. */
export function at(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(year, month - 1, day, hour, minute, 0, 0)
}

export const DAY_MS = 24 * 60 * 60 * 1000
export const MINUTE_MS = 60 * 1000
export const HOUR_MS = 60 * MINUTE_MS
