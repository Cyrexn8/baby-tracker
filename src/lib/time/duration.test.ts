import { describe, expect, it } from 'vitest'
import { at, MINUTE_MS } from '../../test/helpers'
import { countLabel, plural } from '../plural'
import { formatClock, formatDuration, formatDurationLong, minutesBetween } from './duration'

describe('plural и countLabel', () => {
  it('склоняет по правилам русского языка', () => {
    expect([1, 2, 5, 11, 21, 22, 25].map((n) => plural(n, 'день', 'дня', 'дней'))).toEqual([
      'день',
      'дня',
      'дней',
      'дней',
      'день',
      'дня',
      'дней',
    ])
    expect([1, 2, 5, 12, 14].map((n) => plural(n, 'час', 'часа', 'часов'))).toEqual([
      'час',
      'часа',
      'часов',
      'часов',
      'часов',
    ])
    expect([1, 2, 5, 11, 20].map((n) => plural(n, 'минута', 'минуты', 'минут'))).toEqual([
      'минута',
      'минуты',
      'минут',
      'минут',
      'минут',
    ])
  })

  it('countLabel добавляет число', () => {
    expect(countLabel(3, 'день', 'дня', 'дней')).toBe('3 дня')
    expect(countLabel(1, 'запись', 'записи', 'записей')).toBe('1 запись')
  })
})

describe('minutesBetween', () => {
  it('считает полные минуты', () => {
    expect(minutesBetween(at(2026, 5, 12, 10, 0), at(2026, 5, 12, 10, 45))).toBe(45)
    expect(minutesBetween(at(2026, 5, 12, 10, 0), at(2026, 5, 12, 11, 0))).toBe(60)
  })

  it('отбрасывает неполную минуту', () => {
    const from = at(2026, 5, 12, 10, 0)
    expect(minutesBetween(from, new Date(from.getTime() + 45 * MINUTE_MS + 59_000))).toBe(45)
  })

  it('перевёрнутый интервал даёт ноль', () => {
    expect(minutesBetween(at(2026, 5, 12, 12, 0), at(2026, 5, 12, 10, 0))).toBe(0)
  })
})

describe('formatDuration', () => {
  it.each([
    [0, '0 мин'],
    [45, '45 мин'],
    [60, '1 ч'],
    [135, '2 ч 15 мин'],
    [24 * 60, '24 ч'],
    [-5, '0 мин'],
  ])('%i мин → %s', (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected)
  })
})

describe('formatDurationLong', () => {
  it.each([
    [1, '1 минута'],
    [45, '45 минут'],
    [60, '1 час'],
    [120, '2 часа'],
    [300, '5 часов'],
    [125, '2 часа 5 минут'],
    [90, '1 час 30 минут'],
  ])('%i мин → %s', (minutes, expected) => {
    expect(formatDurationLong(minutes)).toBe(expected)
  })
})

describe('formatClock', () => {
  it.each([
    [0, '0:00'],
    [59, '0:59'],
    [65, '1:05'],
    [3729, '1:02:09'],
  ])('%i сек → %s', (seconds, expected) => {
    expect(formatClock(seconds)).toBe(expected)
  })
})
