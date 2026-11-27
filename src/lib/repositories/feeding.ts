import { db } from '../db/db'
import type { Feeding, FeedingReaction, FeedingType } from '../db/schema'
import { dayKeyOf, type DayKey, type TimeRange, DEFAULT_DAY_START_HOUR } from '../time/day'
import { byChild, createEntityRepository, newestFirst, type EntityRepository } from './base'

export interface FeedingInput {
  childId: string
  type: FeedingType
  startAt: Date
  /** Для грудного кормления: `null` или без значения, пока идёт таймер. */
  endAt?: Date | null
  side?: 'left' | 'right' | 'both' | null
  amountMl?: number | null
  food?: string | null
  reaction?: FeedingReaction | null
  note?: string
}

export interface FeedingRepository extends EntityRepository<Feeding> {
  /** Все записи ребёнка, новые сверху. */
  listByChild(childId: string): Promise<Feeding[]>
  /** Кормления, начавшиеся в указанном «дне малыша». */
  listForDay(childId: string, dayKey: DayKey, dayStartHour?: number): Promise<Feeding[]>
  /** Кормления, начавшиеся в промежутке. */
  listInRange(childId: string, range: TimeRange): Promise<Feeding[]>
  /** Идущее грудное кормление (таймер запущен и не остановлен). */
  getRunning(childId: string): Promise<Feeding | undefined>
  add(input: FeedingInput): Promise<Feeding>
}

type FeedingFields = Omit<Feeding, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>

function toFields(input: FeedingInput): FeedingFields {
  return {
    childId: input.childId,
    type: input.type,
    startAt: input.startAt,
    endAt: input.endAt ?? null,
    side: input.side ?? null,
    amountMl: input.amountMl ?? null,
    food: input.food ?? null,
    reaction: input.reaction ?? null,
    note: input.note ?? '',
  }
}

const base = createEntityRepository(db.feedings)

async function listByChild(childId: string): Promise<Feeding[]> {
  return newestFirst(await byChild(db.feedings, childId).toArray())
}

async function listForDay(
  childId: string,
  dayKey: DayKey,
  dayStartHour = DEFAULT_DAY_START_HOUR,
): Promise<Feeding[]> {
  const rows = await byChild(db.feedings, childId).toArray()
  return newestFirst(rows.filter((row) => dayKeyOf(row.startAt, dayStartHour) === dayKey))
}

async function listInRange(childId: string, range: TimeRange): Promise<Feeding[]> {
  const rows = await byChild(db.feedings, childId).toArray()
  return newestFirst(rows.filter((row) => row.startAt >= range.from && row.startAt < range.to))
}

async function getRunning(childId: string): Promise<Feeding | undefined> {
  const rows = await byChild(db.feedings, childId)
    .and((row) => row.type === 'breast' && row.endAt === null)
    .toArray()
  return newestFirst(rows)[0]
}

export const feedings: FeedingRepository = {
  ...base,
  listByChild,
  listForDay,
  listInRange,
  getRunning,
  add: (input) => base.create(toFields(input)),
}
