import { describe, expect, it } from 'vitest'
import { at } from '../../test/helpers'
import { ageOn, formatAge, formatChildAge } from './age'

describe('ageOn', () => {
  it('считает полные месяцы и дни', () => {
    expect(ageOn('2026-02-15', at(2026, 5, 27))).toEqual({ years: 0, months: 3, days: 12 })
  })

  it('31 января → 31 марта это ровно два месяца', () => {
    expect(ageOn('2026-01-31', at(2026, 3, 31))).toEqual({ years: 0, months: 2, days: 0 })
  })

  it('31 января → 30 марта это один месяц и 30 дней, а не «минус день»', () => {
    expect(ageOn('2026-01-31', at(2026, 3, 30))).toEqual({ years: 0, months: 1, days: 30 })
  })

  it('день рождения в високосный год переносится на 28 февраля', () => {
    expect(ageOn('2024-02-29', at(2026, 2, 28))).toEqual({ years: 2, months: 0, days: 0 })
    expect(ageOn('2024-02-29', at(2028, 2, 29))).toEqual({ years: 4, months: 0, days: 0 })
  })

  it('переводит 12 месяцев в годы', () => {
    expect(ageOn('2025-11-27', at(2026, 11, 27))).toEqual({ years: 1, months: 0, days: 0 })
    expect(ageOn('2024-11-27', at(2026, 11, 27))).toEqual({ years: 2, months: 0, days: 0 })
  })

  it('в день рождения возраст нулевой, время суток не мешает', () => {
    expect(ageOn('2026-05-27', at(2026, 5, 27, 23, 59))).toEqual({ years: 0, months: 0, days: 0 })
    expect(ageOn('2026-05-27', at(2026, 5, 28, 0, 1))).toEqual({ years: 0, months: 0, days: 1 })
  })

  it('для даты рождения в будущем даёт нули', () => {
    expect(ageOn('2026-06-01', at(2026, 5, 27))).toEqual({ years: 0, months: 0, days: 0 })
  })

  it('принимает дату как объект Date', () => {
    expect(ageOn(new Date(2026, 4, 27), at(2026, 6, 27))).toEqual({ years: 0, months: 1, days: 0 })
  })
})

describe('formatAge', () => {
  it.each([
    [{ years: 0, months: 0, days: 0 }, 'меньше дня'],
    [{ years: 0, months: 0, days: 1 }, '1 день'],
    [{ years: 0, months: 0, days: 5 }, '5 дней'],
    [{ years: 0, months: 0, days: 21 }, '21 день'],
    [{ years: 0, months: 0, days: 22 }, '22 дня'],
    [{ years: 0, months: 3, days: 12 }, '3 месяца 12 дней'],
    [{ years: 0, months: 21, days: 3 }, '21 месяц 3 дня'],
    [{ years: 1, months: 0, days: 20 }, '1 год'],
    [{ years: 1, months: 2, days: 15 }, '1 год 2 месяца'],
    [{ years: 2, months: 0, days: 0 }, '2 года'],
    [{ years: 5, months: 11, days: 0 }, '5 лет 11 месяцев'],
  ])('%o → %s', (age, expected) => {
    expect(formatAge(age)).toBe(expected)
  })
})

describe('formatChildAge', () => {
  it('считает возраст на указанную дату', () => {
    expect(formatChildAge('2026-02-15', at(2026, 5, 27))).toBe('3 месяца 12 дней')
  })
})
