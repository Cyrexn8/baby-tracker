/**
 * Правило повтора напоминания.
 *
 * Все моменты времени — локальные, в формате `Date`.
 */
export type TimeOfDay = string

/** Один раз в конкретный момент. */
export interface OnceRule {
  kind: 'once'
  at: Date
}

/** Каждый день в указанное время ('HH:mm'). */
export interface DailyRule {
  kind: 'daily'
  time: TimeOfDay
}

/**
 * По дням недели в указанное время.
 * `weekdays` — в формате date-fns (`getDay`): 0 — воскресенье, 6 — суббота.
 */
export interface WeeklyRule {
  kind: 'weekly'
  weekdays: number[]
  time: TimeOfDay
}

/** Каждые N минут, начиная с `from`; после `to` повторы прекращаются. */
export interface IntervalRule {
  kind: 'interval'
  everyMinutes: number
  from: Date
  to: Date | null
}

export type ReminderRule = OnceRule | DailyRule | WeeklyRule | IntervalRule

export const WEEKDAY_LABELS_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'] as const

/** Дни недели в привычном порядке: с понедельника по воскресенье. */
export const WEEKDAYS_MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0] as const

/** Раскладывает 'HH:mm' на часы и минуты. Некорректная строка даёт 0:00. */
export function parseTimeOfDay(time: TimeOfDay): { hours: number; minutes: number } {
  const match = /^(\d{2}):(\d{2})$/.exec(time)
  if (!match) return { hours: 0, minutes: 0 }
  return { hours: Number(match[1]), minutes: Number(match[2]) }
}
