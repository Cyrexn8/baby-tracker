import { describe, expect, it } from 'vitest'
import { diaperCountLabel, diaperTypeLabel, DIAPER_TYPE_LABELS, DIAPER_TYPES } from './diaperLabels'

describe('diaperLabels', () => {
  it('даёт подпись каждому типу записи', () => {
    expect(DIAPER_TYPES).toEqual(['pee', 'poop', 'both'])
    expect(DIAPER_TYPE_LABELS.pee).toBe('пописал')
    expect(DIAPER_TYPE_LABELS.poop).toBe('покакал')
    expect(DIAPER_TYPE_LABELS.both).toBe('и то и другое')
  })

  it('diaperTypeLabel возвращает ту же подпись, что и таблица', () => {
    for (const type of DIAPER_TYPES) {
      expect(diaperTypeLabel(type)).toBe(DIAPER_TYPE_LABELS[type])
    }
  })

  it('склоняет «подгузник» по числу', () => {
    expect(diaperCountLabel(1)).toBe('1 подгузник')
    expect(diaperCountLabel(2)).toBe('2 подгузника')
    expect(diaperCountLabel(5)).toBe('5 подгузников')
    expect(diaperCountLabel(11)).toBe('11 подгузников')
    expect(diaperCountLabel(21)).toBe('21 подгузник')
    expect(diaperCountLabel(22)).toBe('22 подгузника')
    expect(diaperCountLabel(0)).toBe('0 подгузников')
  })
})
