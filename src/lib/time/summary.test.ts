import { describe, expect, it } from 'vitest'
import type { Feeding, SleepSession } from '../db/schema'
import { at } from '../../test/helpers'
import { minutesBetween } from './duration'
import { sleepDurationMinutes, summarizeDay, summarizeDiapers, summarizeFeedings, summarizeSleep } from './summary'

const NOW = at(2026, 5, 12, 14, 0)

function sleep(startAt: Date, endAt: Date | null): SleepSession {
  return {
    id: `${startAt.getTime()}-${endAt?.getTime() ?? 'open'}`,
    childId: 'child-1',
    createdAt: startAt,
    updatedAt: startAt,
    deletedAt: null,
    startAt,
    endAt,
    note: '',
    source: 'manual',
  }
}

function feeding(partial: Partial<Feeding> & Pick<Feeding, 'type' | 'startAt'>): Feeding {
  return {
    id: `feeding-${Math.random()}`,
    childId: 'child-1',
    createdAt: partial.startAt,
    updatedAt: partial.startAt,
    deletedAt: null,
    endAt: null,
    side: null,
    amountMl: null,
    food: null,
    reaction: null,
    note: '',
    ...partial,
  }
}

describe('summarizeSleep', () => {
  it('складывает длительность законченных снов', () => {
    const sessions = [
      sleep(at(2026, 5, 12, 7, 0), at(2026, 5, 12, 8, 30)),
      sleep(at(2026, 5, 12, 12, 0), at(2026, 5, 12, 13, 15)),
    ]
    expect(summarizeSleep(sessions, NOW)).toEqual({
      totalMinutes: 165,
      finishedCount: 2,
      longestMinutes: 90,
      ongoing: null,
    })
  })

  it('идущий сон считается до текущего момента и входит в сумму', () => {
    const sessions = [
      sleep(at(2026, 5, 12, 7, 0), at(2026, 5, 12, 8, 0)),
      sleep(at(2026, 5, 12, 13, 30), null),
    ]
    const summary = summarizeSleep(sessions, NOW)
    expect(summary.totalMinutes).toBe(90)
    expect(summary.finishedCount).toBe(1)
    expect(summary.longestMinutes).toBe(60)
    expect(summary.ongoing).toBe(sessions[1])
  })

  it('для пустого дня — нули', () => {
    expect(summarizeSleep([], NOW)).toEqual({ totalMinutes: 0, finishedCount: 0, longestMinutes: 0, ongoing: null })
  })

  it('sleepDurationMinutes для идущего сна зависит от текущего времени', () => {
    const session = sleep(at(2026, 5, 12, 13, 0), null)
    expect(sleepDurationMinutes(session, at(2026, 5, 12, 13, 40))).toBe(40)
    expect(sleepDurationMinutes(session, at(2026, 5, 12, 14, 0))).toBe(60)
  })
})

describe('summarizeFeedings', () => {
  it('считает количество, объём бутылочек и время грудных', () => {
    const feedings = [
      feeding({ type: 'bottle', startAt: at(2026, 5, 12, 7, 0), amountMl: 120 }),
      feeding({ type: 'bottle', startAt: at(2026, 5, 12, 10, 0), amountMl: 90 }),
      feeding({ type: 'bottle', startAt: at(2026, 5, 12, 11, 0), amountMl: null }),
      feeding({ type: 'breast', startAt: at(2026, 5, 12, 12, 0), endAt: at(2026, 5, 12, 12, 25) }),
      feeding({ type: 'solid', startAt: at(2026, 5, 12, 13, 0), food: ' кабачок ' }),
    ]
    expect(summarizeFeedings(feedings, NOW)).toEqual({
      count: 5,
      totalMl: 210,
      byType: { breast: 1, bottle: 3, solid: 1 },
      breastMinutes: 25,
      lastAt: at(2026, 5, 12, 13, 0),
    })
  })

  it('идущее грудное кормление считается до текущего момента', () => {
    const summary = summarizeFeedings([feeding({ type: 'breast', startAt: at(2026, 5, 12, 13, 45) })], NOW)
    expect(summary.breastMinutes).toBe(minutesBetween(at(2026, 5, 12, 13, 45), NOW))
    expect(summary.breastMinutes).toBe(15)
  })

  it('для пустого дня — нули и null вместо последнего', () => {
    expect(summarizeFeedings([], NOW)).toEqual({
      count: 0,
      totalMl: 0,
      byType: { breast: 0, bottle: 0, solid: 0 },
      breastMinutes: 0,
      lastAt: null,
    })
  })
})

describe('summarizeDiapers', () => {
  it('считает по типам и находит последнее', () => {
    const diapers = [
      { at: at(2026, 5, 12, 7, 0), type: 'pee' as const },
      { at: at(2026, 5, 12, 9, 0), type: 'both' as const },
      { at: at(2026, 5, 12, 12, 0), type: 'poop' as const },
      { at: at(2026, 5, 12, 11, 0), type: 'pee' as const },
    ].map((diaper, index) => ({
      id: `diaper-${index}`,
      childId: 'child-1',
      createdAt: diaper.at,
      updatedAt: diaper.at,
      deletedAt: null,
      note: '',
      ...diaper,
    }))
    expect(summarizeDiapers(diapers)).toEqual({
      count: 4,
      byType: { pee: 2, poop: 1, both: 1 },
      lastAt: at(2026, 5, 12, 12, 0),
    })
  })
})

describe('summarizeDay', () => {
  it('собирает три итога, отсутствующие разделы — пустые', () => {
    const summary = summarizeDay({ sleep: [sleep(at(2026, 5, 12, 13, 30), null)] }, NOW)
    expect(summary.sleep.totalMinutes).toBe(30)
    expect(summary.feedings.count).toBe(0)
    expect(summary.diapers.count).toBe(0)
  })
})
