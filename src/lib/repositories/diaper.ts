import { db } from '../db/db'
import type { Diaper, DiaperType } from '../db/schema'
import { dayKeyOf, type DayKey, type TimeRange, DEFAULT_DAY_START_HOUR } from '../time/day'
import { byChild, createEntityRepository, type EntityRepository } from './base'

export interface DiaperInput {
  childId: string
  at: Date
  type: DiaperType
  note?: string
}

export interface DiaperRepository extends EntityRepository<Diaper> {
  /** Все записи ребёнка, новые сверху. */
  listByChild(childId: string): Promise<Diaper[]>
  /** Записи указанного «дня малыша». */
  listForDay(childId: string, dayKey: DayKey, dayStartHour?: number): Promise<Diaper[]>
  /** Записи в промежутке. */
  listInRange(childId: string, range: TimeRange): Promise<Diaper[]>
  add(input: DiaperInput): Promise<Diaper>
}

function newestFirst(rows: Diaper[]): Diaper[] {
  return [...rows].sort((a, b) => b.at.getTime() - a.at.getTime())
}

const base = createEntityRepository(db.diapers)

async function listByChild(childId: string): Promise<Diaper[]> {
  return newestFirst(await byChild(db.diapers, childId).toArray())
}

async function listForDay(childId: string, dayKey: DayKey, dayStartHour = DEFAULT_DAY_START_HOUR): Promise<Diaper[]> {
  const rows = await byChild(db.diapers, childId).toArray()
  return newestFirst(rows.filter((row) => dayKeyOf(row.at, dayStartHour) === dayKey))
}

async function listInRange(childId: string, range: TimeRange): Promise<Diaper[]> {
  const rows = await byChild(db.diapers, childId).toArray()
  return newestFirst(rows.filter((row) => row.at >= range.from && row.at < range.to))
}

export const diapers: DiaperRepository = {
  ...base,
  listByChild,
  listForDay,
  listInRange,
  add: (input) =>
    base.create({ childId: input.childId, at: input.at, type: input.type, note: input.note ?? '' }),
}
