import { addMonths, differenceInCalendarDays, differenceInCalendarMonths, isValid, parse, startOfDay } from 'date-fns'
import { plural } from '../plural'

export interface Age {
  years: number
  months: number
  days: number
}

/** Возраст на дату `on`: сколько полных лет, месяцев и дней исполнилось. */
export function ageOn(birthDate: string | Date, on: Date): Age {
  const birth =
    typeof birthDate === 'string'
      ? parse(birthDate, 'yyyy-MM-dd', new Date(0))
      : startOfDay(birthDate)
  const today = startOfDay(on)
  const none: Age = { years: 0, months: 0, days: 0 }
  if (!isValid(birth) || today < birth) return none

  // Полные месяцы считаем по календарю: 31 января → 1 марта это 1 месяц, а не 2.
  let totalMonths = differenceInCalendarMonths(today, birth)
  let anchor = addMonths(birth, totalMonths)
  if (anchor > today) {
    totalMonths -= 1
    anchor = addMonths(birth, totalMonths)
  }
  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    days: differenceInCalendarDays(today, anchor),
  }
}

/** '1 год 2 месяца', '3 месяца 12 дней', '5 дней' — компактный возраст для подписи. */
export function formatAge(age: Age): string {
  const parts: string[] = []
  if (age.years > 0) parts.push(`${age.years} ${plural(age.years, 'год', 'года', 'лет')}`)
  if (age.months > 0) parts.push(`${age.months} ${plural(age.months, 'месяц', 'месяца', 'месяцев')}`)
  if (age.years === 0 && age.days > 0) parts.push(`${age.days} ${plural(age.days, 'день', 'дня', 'дней')}`)
  return parts.length > 0 ? parts.join(' ') : 'меньше дня'
}

/** Возраст ребёнка на сегодня: '3 месяца 12 дней'. */
export function formatChildAge(birthDate: string, on: Date = new Date()): string {
  return formatAge(ageOn(birthDate, on))
}
