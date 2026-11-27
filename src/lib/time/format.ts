import { format, isValid, parse } from 'date-fns'
import { ru } from 'date-fns/locale'
import { isDayKey, parseDayKey } from './day'

/** '09:05' — локальное время. */
export function formatTime(date: Date): string {
  return format(date, 'HH:mm')
}

/** '12 мая' по-русски. */
export function formatDayMonth(date: Date | string): string {
  return format(typeof date === 'string' ? parseDayKey(date) : date, 'd MMMM', { locale: ru })
}

/** '12 мая 2026 г.' */
export function formatLongDate(date: Date | string): string {
  const value = typeof date === 'string' ? parseDayKey(date) : date
  return `${format(value, 'd MMMM yyyy', { locale: ru })} г.`
}

/** 'Понедельник' — с заглавной буквы. */
export function formatWeekday(date: Date): string {
  const weekday = format(date, 'EEEE', { locale: ru })
  return weekday.charAt(0).toUpperCase() + weekday.slice(1)
}

/** Значение для <input type="date">. */
export function toDateInputValue(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/** Значение для <input type="time">. */
export function toTimeInputValue(date: Date): string {
  return format(date, 'HH:mm')
}

/** Значение для <input type="datetime-local">. */
export function toDateTimeInputValue(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm")
}

/** Читает значение <input type="date">. Некорректная строка даёт null. */
export function parseDateInputValue(value: string): Date | null {
  if (!isDayKey(value)) return null
  return parseDayKey(value)
}

/** Читает значение <input type="datetime-local">. Некорректная строка даёт null. */
export function parseDateTimeInputValue(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null
  const date = parse(value, "yyyy-MM-dd'T'HH:mm", new Date(0))
  return isValid(date) ? date : null
}
