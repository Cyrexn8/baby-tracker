import type { Diaper, DiaperType, Feeding, FeedingType, SleepSession } from '../db/schema'
import { minutesBetween } from './duration'

/** Длительность сна в минутах. Для идущего сна считается до текущего момента. */
export function sleepDurationMinutes(session: SleepSession, now: Date): number {
  return minutesBetween(session.startAt, session.endAt ?? now)
}

export interface SleepSummary {
  /** Суммарная длительность за день, включая идущий сон. */
  totalMinutes: number
  /** Число законченных снов. */
  finishedCount: number
  /** Самый длинный законченный сон. */
  longestMinutes: number
  /** Идущий сон, если таймер запущен. */
  ongoing: SleepSession | null
}

export function summarizeSleep(sessions: SleepSession[], now: Date): SleepSummary {
  let totalMinutes = 0
  let longestMinutes = 0
  let finishedCount = 0
  let ongoing: SleepSession | null = null

  for (const session of sessions) {
    totalMinutes += sleepDurationMinutes(session, now)
    if (session.endAt === null) {
      ongoing = session
    } else {
      finishedCount += 1
      longestMinutes = Math.max(longestMinutes, minutesBetween(session.startAt, session.endAt))
    }
  }

  return { totalMinutes, finishedCount, longestMinutes, ongoing }
}

export interface FeedingSummary {
  count: number
  /** Суммарный объём бутылочек за день, мл. */
  totalMl: number
  byType: Record<FeedingType, number>
  /** Суммарная длительность грудных кормлений, мин (идущее считается до текущего момента). */
  breastMinutes: number
  /** Начало последнего кормления. */
  lastAt: Date | null
}

export function summarizeFeedings(feedings: Feeding[], now: Date): FeedingSummary {
  const summary: FeedingSummary = {
    count: feedings.length,
    totalMl: 0,
    byType: { breast: 0, bottle: 0, solid: 0 },
    breastMinutes: 0,
    lastAt: null,
  }

  for (const feeding of feedings) {
    summary.byType[feeding.type] += 1
    if (feeding.type === 'bottle') summary.totalMl += feeding.amountMl ?? 0
    if (feeding.type === 'breast') summary.breastMinutes += minutesBetween(feeding.startAt, feeding.endAt ?? now)
    if (!summary.lastAt || feeding.startAt > summary.lastAt) summary.lastAt = feeding.startAt
  }

  return summary
}

export interface DiaperSummary {
  count: number
  byType: Record<DiaperType, number>
  /** Время последней записи. */
  lastAt: Date | null
}

export function summarizeDiapers(diapers: Diaper[]): DiaperSummary {
  const summary: DiaperSummary = { count: diapers.length, byType: { pee: 0, poop: 0, both: 0 }, lastAt: null }

  for (const diaper of diapers) {
    summary.byType[diaper.type] += 1
    if (!summary.lastAt || diaper.at > summary.lastAt) summary.lastAt = diaper.at
  }

  return summary
}

export interface DaySummary {
  sleep: SleepSummary
  feedings: FeedingSummary
  diapers: DiaperSummary
}

/** Итоги одного дня. Записи должны быть уже отобраны для этого дня. */
export function summarizeDay(
  entries: { sleep?: SleepSession[]; feedings?: Feeding[]; diapers?: Diaper[] },
  now: Date,
): DaySummary {
  return {
    sleep: summarizeSleep(entries.sleep ?? [], now),
    feedings: summarizeFeedings(entries.feedings ?? [], now),
    diapers: summarizeDiapers(entries.diapers ?? []),
  }
}
