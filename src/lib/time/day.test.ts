import { describe, expect, it } from 'vitest'
import { addDaysToKey, dayKeyOf, dayRange, dayStart, groupByDayKey, isDayKey, listDayKeys } from './day'
import { at } from '../../test/helpers'

describe('dayKeyOf', () => {
  it('до 6 утра момент относится к предыдущему дню', () => {
    expect(dayKeyOf(at(2026, 5, 12, 3, 30))).toBe('2026-05-11')
    expect(dayKeyOf(at(2026, 5, 12, 5, 59))).toBe('2026-05-11')
  })

  it('с 6 утра — тот же день', () => {
    expect(dayKeyOf(at(2026, 5, 12, 6, 0))).toBe('2026-05-12')
    expect(dayKeyOf(at(2026, 5, 12, 23, 59))).toBe('2026-05-12')
  })

  it('сразу после полуночи — ещё вчерашний день', () => {
    expect(dayKeyOf(at(2026, 5, 12, 0, 5))).toBe('2026-05-11')
  })

  it('час начала дня можно задать', () => {
    expect(dayKeyOf(at(2026, 5, 12, 5, 30), 4)).toBe('2026-05-12')
    expect(dayKeyOf(at(2026, 5, 12, 3, 30), 4)).toBe('2026-05-11')
  })
})

describe('dayStart и dayRange', () => {
  it('день начинается в 6:00 указанной даты', () => {
    expect(dayStart('2026-05-12')).toEqual(at(2026, 5, 12, 6))
  })

  it('день заканчивается в 6:00 следующего дня, не включая', () => {
    expect(dayRange('2026-05-12')).toEqual({ from: at(2026, 5, 12, 6), to: at(2026, 5, 13, 6) })
  })

  it('диапазон даты на стыке месяцев переходит в следующий месяц', () => {
    expect(dayRange('2026-12-31').to).toEqual(at(2027, 1, 1, 6))
  })
})

describe('addDaysToKey и listDayKeys', () => {
  it('переходит через конец месяца', () => {
    expect(addDaysToKey('2026-01-31', 1)).toBe('2026-02-01')
  })

  it('учитывает високосный год', () => {
    expect(addDaysToKey('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDaysToKey('2026-02-28', 1)).toBe('2026-03-01')
  })

  it('шагает назад', () => {
    expect(addDaysToKey('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('перечисляет дни по возрастанию включительно', () => {
    expect(listDayKeys('2026-02-27', '2026-03-02')).toEqual([
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
      '2026-03-02',
    ])
  })

  it('для пустого промежутка возвращает пустой список', () => {
    expect(listDayKeys('2026-03-02', '2026-03-01')).toEqual([])
  })
})

describe('isDayKey', () => {
  it('принимает корректную дату', () => {
    expect(isDayKey('2026-05-12')).toBe(true)
    expect(isDayKey('2028-02-29')).toBe(true)
  })

  it('отбрасывает несуществующие даты и другой формат', () => {
    expect(isDayKey('2026-02-31')).toBe(false)
    expect(isDayKey('2026-13-01')).toBe(false)
    expect(isDayKey('12.05.2026')).toBe(false)
    expect(isDayKey('2026-5-2')).toBe(false)
    expect(isDayKey('')).toBe(false)
  })
})

describe('groupByDayKey', () => {
  it('раскладывает записи по дню начала', () => {
    const night = { id: 'night', start: at(2026, 5, 12, 23, 30) }
    const morning = { id: 'morning', start: at(2026, 5, 13, 7, 0) }
    const early = { id: 'early', start: at(2026, 5, 13, 5, 0) }

    const groups = groupByDayKey([morning, night, early], (item) => item.start)

    expect([...groups.keys()]).toEqual(['2026-05-13', '2026-05-12'])
    expect(groups.get('2026-05-12')?.map((item) => item.id)).toEqual(['night', 'early'])
    expect(groups.get('2026-05-13')?.map((item) => item.id)).toEqual(['morning'])
  })
})
