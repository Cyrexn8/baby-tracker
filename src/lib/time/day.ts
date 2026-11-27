import { addDays, format, isBefore, isValid, parse, set, startOfDay } from 'date-fns'

/**
 * Час, с которого начинается «день малыша» (по умолчанию 6:00).
 * Ночной сон, начавшийся до 6 утра, относится к предыдущему дню,
 * поэтому итоги дня не разрезают ночь на две части.
 */
export const DEFAULT_DAY_START_HOUR = 6

/** Ключ дня в формате 'YYYY-MM-DD' (локальный календарный день). */
export type DayKey = string

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** Промежуток времени: `from` включительно, `to` не включается. */
export interface TimeRange {
  from: Date
  to: Date
}

export function parseDayKey(key: DayKey): Date {
  return parse(key, 'yyyy-MM-dd', new Date(0))
}

/** Строка — корректная дата 'YYYY-MM-DD' (отбрасывает 2026-02-31 и тому подобное). */
export function isDayKey(value: string): boolean {
  if (!DAY_KEY_PATTERN.test(value)) return false
  return isValid(parseDayKey(value))
}

function atHour(base: Date, hour: number): Date {
  return set(startOfDay(base), { hours: hour, minutes: 0, seconds: 0, milliseconds: 0 })
}

/** Ключ дня, к которому относится момент `date`. */
export function dayKeyOf(date: Date, dayStartHour = DEFAULT_DAY_START_HOUR): DayKey {
  const midnight = startOfDay(date)
  const belongsToPreviousDay = isBefore(date, atHour(midnight, dayStartHour))
  return format(belongsToPreviousDay ? addDays(midnight, -1) : midnight, 'yyyy-MM-dd')
}

/** Момент начала дня: календарная полночь `key`, сдвинутая на `dayStartHour` часов. */
export function dayStart(key: DayKey, dayStartHour = DEFAULT_DAY_START_HOUR): Date {
  return atHour(parseDayKey(key), dayStartHour)
}

export function dayRange(key: DayKey, dayStartHour = DEFAULT_DAY_START_HOUR): TimeRange {
  return { from: dayStart(key, dayStartHour), to: dayStart(addDaysToKey(key, 1), dayStartHour) }
}

export function addDaysToKey(key: DayKey, amount: number): DayKey {
  return format(addDays(parseDayKey(key), amount), 'yyyy-MM-dd')
}

export function todayKey(now = new Date(), dayStartHour = DEFAULT_DAY_START_HOUR): DayKey {
  return dayKeyOf(now, dayStartHour)
}

/** Ключи дней от `fromKey` до `toKey` включительно, по возрастанию. */
export function listDayKeys(fromKey: DayKey, toKey: DayKey): DayKey[] {
  const keys: DayKey[] = []
  let cursor = parseDayKey(fromKey)
  const end = parseDayKey(toKey)
  while (cursor.getTime() <= end.getTime() && keys.length < 1000) {
    keys.push(format(cursor, 'yyyy-MM-dd'))
    cursor = addDays(cursor, 1)
  }
  return keys
}

/** Раскладывает записи по дням, к которым они относятся (по дню начала). */
export function groupByDayKey<T>(
  items: T[],
  getDate: (item: T) => Date,
  dayStartHour = DEFAULT_DAY_START_HOUR,
): Map<DayKey, T[]> {
  const groups = new Map<DayKey, T[]>()
  for (const item of items) {
    const key = dayKeyOf(getDate(item), dayStartHour)
    const group = groups.get(key)
    if (group) group.push(item)
    else groups.set(key, [item])
  }
  return groups
}
