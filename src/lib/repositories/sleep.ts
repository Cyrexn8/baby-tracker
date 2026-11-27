import { db } from '../db/db'
import type { SleepSession } from '../db/schema'
import { dayKeyOf, type DayKey, type TimeRange, DEFAULT_DAY_START_HOUR } from '../time/day'
import { byChild, createEntityRepository, newestFirst, type EntityRepository } from './base'
import { now } from '../clock'

export interface SleepSessionInput {
  childId: string
  startAt: Date
  /** `null` или без значения — сон ещё идёт (запущен таймер). */
  endAt?: Date | null
  note?: string
  source?: SleepSession['source']
}

export interface SleepRepository extends EntityRepository<SleepSession> {
  /** Все записи ребёнка, новые сверху. */
  listByChild(childId: string): Promise<SleepSession[]>
  /** Сны, начавшиеся в указанном «дне малыша» (ночной сон через полночь остаётся в дне начала). */
  listForDay(childId: string, dayKey: DayKey, dayStartHour?: number): Promise<SleepSession[]>
  /** Сны, пересекающиеся с промежутком: начались до `to` и не закончились раньше `from`. */
  listOverlapping(childId: string, range: TimeRange): Promise<SleepSession[]>
  /** Идущий сон (таймер запущен и не остановлен). */
  getRunning(childId: string): Promise<SleepSession | undefined>
  add(input: SleepSessionInput): Promise<SleepSession>
  /** Запускает таймер сна: создаёт запись с незаполненным `endAt`. */
  start(childId: string, startAt?: Date): Promise<SleepSession>
  /** Останавливает таймер сна. Уже законченный сон не меняет. */
  stop(id: string, endAt?: Date): Promise<SleepSession>
}

type SessionFields = Omit<SleepSession, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>

function toFields(input: SleepSessionInput): SessionFields {
  return {
    childId: input.childId,
    startAt: input.startAt,
    endAt: input.endAt ?? null,
    note: input.note ?? '',
    source: input.source ?? 'manual',
  }
}

const base = createEntityRepository(db.sleepSessions)

async function listByChild(childId: string): Promise<SleepSession[]> {
  return newestFirst(await byChild(db.sleepSessions, childId).toArray())
}

async function listForDay(
  childId: string,
  dayKey: DayKey,
  dayStartHour = DEFAULT_DAY_START_HOUR,
): Promise<SleepSession[]> {
  const rows = await byChild(db.sleepSessions, childId).toArray()
  return newestFirst(rows.filter((row) => dayKeyOf(row.startAt, dayStartHour) === dayKey))
}

async function listOverlapping(childId: string, range: TimeRange): Promise<SleepSession[]> {
  const rows = await byChild(db.sleepSessions, childId).toArray()
  // Незаконченный сон пересекается с любым промежутком, начавшимся до его старта.
  const overlaps = (row: SleepSession) =>
    row.startAt < range.to && (row.endAt === null || row.endAt > range.from)
  return newestFirst(rows.filter(overlaps))
}

async function getRunning(childId: string): Promise<SleepSession | undefined> {
  const rows = await byChild(db.sleepSessions, childId)
    .and((row) => row.endAt === null)
    .toArray()
  return newestFirst(rows)[0]
}

export const sleepSessions: SleepRepository = {
  ...base,
  listByChild,
  listForDay,
  listOverlapping,
  getRunning,
  add: (input) => base.create(toFields(input)),
  start: (childId, startAt = now()) =>
    base.create(toFields({ childId, startAt, source: 'timer' })),
  stop: async (id, endAt = now()) => {
    const session = await base.get(id)
    if (!session) throw new Error(`Сон не найден: ${id}`)
    if (session.endAt !== null) return session
    return base.update(id, { endAt })
  },
}
