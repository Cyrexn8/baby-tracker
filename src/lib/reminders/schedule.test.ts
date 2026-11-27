import { describe, expect, it } from 'vitest'
import { at, DAY_MS } from '../../test/helpers'
import { describeRule, nextOccurrence, occurrencesBetween } from './schedule'
import type { ReminderRule } from './rule'

// 11 мая 2026 — понедельник, 13 мая — среда, 15 мая — пятница.
const MONDAY = at(2026, 5, 11, 9)

describe('nextOccurrence: разовое напоминание', () => {
  const rule: ReminderRule = { kind: 'once', at: at(2026, 5, 13, 15, 0) }

  it('до наступления возвращает момент напоминания', () => {
    expect(nextOccurrence(rule, MONDAY)).toEqual(at(2026, 5, 13, 15, 0))
  })

  it('после наступления повторов больше нет', () => {
    expect(nextOccurrence(rule, at(2026, 5, 13, 15, 0))).toBeNull()
    expect(nextOccurrence(rule, at(2026, 5, 14))).toBeNull()
  })

  it('возвращает копию, а не ту же дату', () => {
    const next = nextOccurrence(rule, MONDAY)
    expect(next).not.toBe(rule.at)
  })
})

describe('nextOccurrence: каждый день', () => {
  const rule: ReminderRule = { kind: 'daily', time: '10:00' }

  it('в тот же день, если время ещё не пришло', () => {
    expect(nextOccurrence(rule, at(2026, 5, 13, 9, 0))).toEqual(at(2026, 5, 13, 10, 0))
  })

  it('на следующий день, если время уже прошло', () => {
    expect(nextOccurrence(rule, at(2026, 5, 13, 10, 30))).toEqual(at(2026, 5, 14, 10, 0))
    expect(nextOccurrence(rule, at(2026, 5, 31, 18))).toEqual(at(2026, 6, 1, 10, 0))
  })

  it('ровно в момент наступления возвращает следующий день', () => {
    expect(nextOccurrence(rule, at(2026, 5, 13, 10, 0))).toEqual(at(2026, 5, 14, 10, 0))
  })
})

describe('nextOccurrence: по дням недели', () => {
  const rule: ReminderRule = { kind: 'weekly', weekdays: [1, 3, 5], time: '09:30' }

  it('ближайший выбранный день', () => {
    expect(nextOccurrence(rule, at(2026, 5, 13, 8))).toEqual(at(2026, 5, 13, 9, 30))
    expect(nextOccurrence(rule, at(2026, 5, 13, 12))).toEqual(at(2026, 5, 15, 9, 30))
  })

  it('с пятницы переходит на понедельник следующей недели', () => {
    expect(nextOccurrence(rule, at(2026, 5, 15, 10))).toEqual(at(2026, 5, 18, 9, 30))
    expect(nextOccurrence(rule, at(2026, 5, 15, 9, 30))).toEqual(at(2026, 5, 18, 9, 30))
  })

  it('воскресенье задаётся нулём', () => {
    const sunday: ReminderRule = { kind: 'weekly', weekdays: [0], time: '20:00' }
    expect(nextOccurrence(sunday, at(2026, 5, 13, 12))).toEqual(at(2026, 5, 17, 20, 0))
  })

  it('без выбранных дней напоминаний нет', () => {
    expect(nextOccurrence({ kind: 'weekly', weekdays: [], time: '09:30' }, MONDAY)).toBeNull()
  })
})

describe('nextOccurrence: по интервалу', () => {
  const rule: ReminderRule = { kind: 'interval', everyMinutes: 180, from: at(2026, 5, 13, 8), to: null }

  it('до начала — первое наступление в момент начала', () => {
    expect(nextOccurrence(rule, at(2026, 5, 13, 7))).toEqual(at(2026, 5, 13, 8))
  })

  it('дальше — шагами от начала', () => {
    expect(nextOccurrence(rule, at(2026, 5, 13, 8))).toEqual(at(2026, 5, 13, 11))
    expect(nextOccurrence(rule, at(2026, 5, 13, 9, 30))).toEqual(at(2026, 5, 13, 11))
    expect(nextOccurrence(rule, at(2026, 5, 13, 11))).toEqual(at(2026, 5, 13, 14))
    expect(nextOccurrence(rule, at(2026, 5, 14, 2))).toEqual(at(2026, 5, 14, 5))
  })

  it('не выходит за конец интервала', () => {
    const bounded: ReminderRule = { ...rule, to: at(2026, 5, 13, 15) }
    expect(nextOccurrence(bounded, at(2026, 5, 13, 12, 59))).toEqual(at(2026, 5, 13, 14))
    expect(nextOccurrence(bounded, at(2026, 5, 13, 14))).toBeNull()
  })

  it('конец на границе считается наступлением', () => {
    const bounded: ReminderRule = { ...rule, to: at(2026, 5, 13, 14) }
    expect(nextOccurrence(bounded, at(2026, 5, 13, 13))).toEqual(at(2026, 5, 13, 14))
  })

  it('нулевой шаг даёт бесконечный цикл, поэтому отключается', () => {
    expect(nextOccurrence({ kind: 'interval', everyMinutes: 0, from: MONDAY, to: null }, MONDAY)).toBeNull()
  })
})

describe('occurrencesBetween', () => {
  it('перечисляет ежедневные напоминания за несколько дней', () => {
    const rule: ReminderRule = { kind: 'daily', time: '10:00' }
    expect(occurrencesBetween(rule, at(2026, 5, 12), at(2026, 5, 14, 23, 59))).toEqual([
      at(2026, 5, 12, 10),
      at(2026, 5, 13, 10),
      at(2026, 5, 14, 10),
    ])
  })

  it('включает наступления на границах', () => {
    const rule: ReminderRule = { kind: 'daily', time: '10:00' }
    expect(occurrencesBetween(rule, at(2026, 5, 12, 10), at(2026, 5, 12, 10))).toEqual([at(2026, 5, 12, 10)])
  })

  it('для разового напоминания даёт не больше одного наступления', () => {
    const rule: ReminderRule = { kind: 'once', at: at(2026, 5, 12, 10) }
    expect(occurrencesBetween(rule, new Date(0), at(2026, 5, 14))).toEqual([at(2026, 5, 12, 10)])
    expect(occurrencesBetween(rule, new Date(0), at(2026, 5, 11))).toEqual([])
  })

  it('ограничивает число наступлений для частого интервала', () => {
    const rule: ReminderRule = { kind: 'interval', everyMinutes: 1, from: new Date(0), to: null }
    const list = occurrencesBetween(rule, new Date(0), new Date(10 * DAY_MS), 500)
    expect(list).toHaveLength(500)
  })
})

describe('describeRule', () => {
  const now = at(2026, 5, 13, 10)

  it('разовое', () => {
    expect(describeRule({ kind: 'once', at: at(2026, 5, 20, 15, 30) }, now)).toBe('Разово, 20 мая в 15:30')
    expect(describeRule({ kind: 'once', at: at(2027, 1, 5, 9, 0) }, now)).toBe('Разово, 5 января 2027 в 09:00')
  })

  it('каждый день', () => {
    expect(describeRule({ kind: 'daily', time: '10:00' }, now)).toBe('Каждый день в 10:00')
  })

  it('по дням недели — с понедельника', () => {
    expect(describeRule({ kind: 'weekly', weekdays: [5, 1, 3], time: '09:30' }, now)).toBe('пн, ср, пт в 09:30')
    expect(describeRule({ kind: 'weekly', weekdays: [0], time: '20:00' }, now)).toBe('вс в 20:00')
  })

  it('все семь дней — это каждый день', () => {
    expect(describeRule({ kind: 'weekly', weekdays: [0, 1, 2, 3, 4, 5, 6], time: '10:00' }, now)).toBe(
      'Каждый день в 10:00',
    )
  })

  it('интервал', () => {
    expect(describeRule({ kind: 'interval', everyMinutes: 180, from: at(2026, 5, 13, 8), to: null }, now)).toBe(
      'Каждые 3 часа с 08:00',
    )
    expect(
      describeRule({ kind: 'interval', everyMinutes: 45, from: at(2026, 5, 13, 8), to: at(2026, 5, 13, 20) }, now),
    ).toBe('Каждые 45 минут с 08:00 до 20:00')
  })
})
