import { describe, expect, it } from 'vitest'
import { at } from '../../test/helpers'
import {
  formatDayMonth,
  formatLongDate,
  formatTime,
  formatWeekday,
  parseDateInputValue,
  parseDateTimeInputValue,
  toDateInputValue,
  toDateTimeInputValue,
  toTimeInputValue,
} from './format'

describe('форматирование даты и времени', () => {
  it('время в 24-часовом формате с ведущим нулём', () => {
    expect(formatTime(at(2026, 5, 12, 9, 5))).toBe('09:05')
    expect(formatTime(at(2026, 5, 12, 23, 59))).toBe('23:59')
  })

  it('день и месяц по-русски', () => {
    expect(formatDayMonth(at(2026, 5, 12))).toBe('12 мая')
    expect(formatDayMonth('2026-01-02')).toBe('2 января')
  })

  it('полная дата с годом', () => {
    expect(formatLongDate(at(2026, 5, 12))).toBe('12 мая 2026 г.')
    expect(formatLongDate('2026-12-31')).toBe('31 декабря 2026 г.')
  })

  it('день недели с заглавной буквы', () => {
    expect(formatWeekday(at(2026, 1, 1))).toBe('Четверг')
    expect(formatWeekday(at(2026, 5, 11))).toBe('Понедельник')
  })
})

describe('значения полей ввода', () => {
  it('дата, время и дата со временем', () => {
    const date = at(2026, 5, 12, 9, 5)
    expect(toDateInputValue(date)).toBe('2026-05-12')
    expect(toTimeInputValue(date)).toBe('09:05')
    expect(toDateTimeInputValue(date)).toBe('2026-05-12T09:05')
  })

  it('дата читается обратно тем же днём', () => {
    expect(parseDateInputValue('2026-05-12')).toEqual(at(2026, 5, 12))
    expect(parseDateInputValue('2026-02-31')).toBeNull()
    expect(parseDateInputValue('')).toBeNull()
  })

  it('дата со временем читается обратно тем же моментом', () => {
    const original = at(2026, 5, 12, 9, 5)
    expect(parseDateTimeInputValue(toDateTimeInputValue(original))).toEqual(original)
  })

  it('некорректное значение даёт null', () => {
    expect(parseDateTimeInputValue('')).toBeNull()
    expect(parseDateTimeInputValue('2026-05-12 25:00')).toBeNull()
    expect(parseDateTimeInputValue('завтра')).toBeNull()
  })
})
