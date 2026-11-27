import { addDays, format, getDay, set, startOfDay } from 'date-fns'
import type { IntervalRule, ReminderRule, TimeOfDay } from './rule'
import { parseTimeOfDay, WEEKDAY_LABELS_SHORT, WEEKDAYS_MONDAY_FIRST } from './rule'
import { formatDurationLong } from '../time/duration'
import { formatDayMonth, formatTime } from '../time/format'

const MS_PER_MINUTE = 60_000

/** Больше столько наступлений за один запрос не считаем — защита от зацикливания. */
export const OCCURRENCE_LIMIT = 1000

/** Момент `time` в календарном дне `day` (локальное время). */
function atTimeOfDay(day: Date, time: TimeOfDay): Date {
  const { hours, minutes } = parseTimeOfDay(time)
  return set(startOfDay(day), { hours, minutes, seconds: 0, milliseconds: 0 })
}

/**
 * Первое наступление строго после `after`.
 * `null` — повторов больше нет (разовое напоминание уже прошло или интервал закончился).
 */
export function nextOccurrence(rule: ReminderRule, after: Date): Date | null {
  switch (rule.kind) {
    case 'once':
      return rule.at.getTime() > after.getTime() ? new Date(rule.at) : null
    case 'daily': {
      // Время берём по календарю, а не «+24 часа»: так напоминание остаётся в 10:00
      // и при переводе часов.
      let candidate = atTimeOfDay(after, rule.time)
      if (candidate.getTime() <= after.getTime()) candidate = atTimeOfDay(addDays(after, 1), rule.time)
      return candidate
    }
    case 'weekly': {
      const wanted = new Set(rule.weekdays)
      if (wanted.size === 0) return null
      for (let offset = 0; offset <= 7; offset += 1) {
        const day = addDays(after, offset)
        if (!wanted.has(getDay(day))) continue
        const candidate = atTimeOfDay(day, rule.time)
        if (candidate.getTime() > after.getTime()) return candidate
      }
      return null
    }
    case 'interval': {
      const step = rule.everyMinutes * MS_PER_MINUTE
      if (step <= 0) return null
      const from = rule.from.getTime()
      if (from > after.getTime()) return clipInterval(rule, from)
      const index = Math.floor((after.getTime() - from) / step) + 1
      return clipInterval(rule, from + index * step)
    }
  }
}

function clipInterval(rule: IntervalRule, time: number): Date | null {
  if (rule.to !== null && time > rule.to.getTime()) return null
  return new Date(time)
}

/** Все наступления в промежутке от `from` до `to` включительно, по возрастанию. */
export function occurrencesBetween(rule: ReminderRule, from: Date, to: Date, limit = OCCURRENCE_LIMIT): Date[] {
  const result: Date[] = []
  let cursor = new Date(from.getTime() - 1)
  while (result.length < limit) {
    const next = nextOccurrence(rule, cursor)
    if (!next || next.getTime() > to.getTime()) break
    result.push(next)
    cursor = next
  }
  return result
}

/** Человекочитаемое описание повтора: «Каждый день в 10:00», «пн, ср, пт в 09:30». */
export function describeRule(rule: ReminderRule, now: Date): string {
  switch (rule.kind) {
    case 'once': {
      const sameYear = format(rule.at, 'yyyy') === format(now, 'yyyy')
      return `Разово, ${formatDayMonth(rule.at)}${sameYear ? '' : ` ${format(rule.at, 'yyyy')}`} в ${formatTime(rule.at)}`
    }
    case 'daily':
      return `Каждый день в ${rule.time}`
    case 'weekly': {
      if (rule.weekdays.length === 0) return 'Дни недели не выбраны'
      if (rule.weekdays.length === 7) return `Каждый день в ${rule.time}`
      const labels = WEEKDAYS_MONDAY_FIRST.filter((day) => rule.weekdays.includes(day)).map(
        (day) => WEEKDAY_LABELS_SHORT[day],
      )
      return `${labels.join(', ')} в ${rule.time}`
    }
    case 'interval': {
      const parts = [`Каждые ${formatDurationLong(rule.everyMinutes)}`, `с ${formatTime(rule.from)}`]
      if (rule.to !== null) parts.push(`до ${formatTime(rule.to)}`)
      return parts.join(' ')
    }
  }
}
