import { describe, expect, it } from 'vitest'
import {
  amountLabel,
  feedingCountLabel,
  feedingRowText,
  FEEDING_SIDES,
  FEEDING_TYPES,
  FEEDING_TYPE_TITLES,
  REACTION_LABELS,
  SIDE_LABELS,
  SIDE_TITLES,
} from './feedingLabels'
import type { Feeding } from '../../lib/db/schema'
import { at } from '../../test/helpers'

const CHILD_ID = 'child-1'

function makeFeeding(fields: Partial<Feeding>): Feeding {
  return {
    id: 'feeding-1',
    createdAt: new Date(0),
    updatedAt: new Date(0),
    deletedAt: null,
    childId: CHILD_ID,
    type: 'bottle',
    startAt: at(2026, 1, 10, 9, 0),
    endAt: at(2026, 1, 10, 9, 20),
    side: null,
    amountMl: null,
    food: null,
    reaction: null,
    note: '',
    ...fields,
  }
}

const NOW = new Date(2026, 0, 10, 9, 0, 12) // 09:00:12 — для идущих таймеров

describe('feedingLabels', () => {
  it('даёт подписи типам, грудям и реакциям', () => {
    expect(FEEDING_TYPES).toEqual(['breast', 'bottle', 'solid'])
    expect(FEEDING_SIDES).toEqual(['left', 'right', 'both'])
    expect(FEEDING_TYPE_TITLES.breast).toBe('Грудь')
    expect(FEEDING_TYPE_TITLES.bottle).toBe('Бутылочка')
    expect(FEEDING_TYPE_TITLES.solid).toBe('Прикорм')
    expect(SIDE_LABELS.left).toBe('левая')
    expect(SIDE_LABELS.right).toBe('правая')
    expect(SIDE_LABELS.both).toBe('обе')
    expect(SIDE_TITLES.left).toBe('Левая')
    expect(SIDE_TITLES.right).toBe('Правая')
    expect(SIDE_TITLES.both).toBe('Обе')
    expect(REACTION_LABELS.liked).toBe('понравилось')
    expect(REACTION_LABELS.neutral).toBe('нейтрально')
    expect(REACTION_LABELS.refused).toBe('отказался')
  })

  it('склоняет «кормление» по числу', () => {
    expect(feedingCountLabel(1)).toBe('1 кормление')
    expect(feedingCountLabel(2)).toBe('2 кормления')
    expect(feedingCountLabel(5)).toBe('5 кормлений')
    expect(feedingCountLabel(11)).toBe('11 кормлений')
    expect(feedingCountLabel(21)).toBe('21 кормление')
    expect(feedingCountLabel(0)).toBe('0 кормлений')
  })

  it('подписывает объём бутылочки', () => {
    expect(amountLabel(30)).toBe('30 мл')
    expect(amountLabel(120)).toBe('120 мл')
  })

  it('собирает текст строки для всех трёх типов', () => {
    const breast = makeFeeding({
      type: 'breast',
      startAt: at(2026, 1, 10, 8, 40),
      endAt: at(2026, 1, 10, 9, 0),
      side: 'left',
    })
    const breastRunning = makeFeeding({
      type: 'breast',
      startAt: at(2026, 1, 10, 9, 0),
      endAt: null,
      side: 'right',
    })
    const bottle = makeFeeding({ type: 'bottle', amountMl: 120 })
    const solid = makeFeeding({ type: 'solid', food: 'Кабачок', reaction: 'liked', endAt: null })

    expect(feedingRowText(breast, NOW)).toBe('Грудь · левая · 20 мин')
    expect(feedingRowText(breastRunning, NOW)).toBe('Грудь · правая · идёт 0:12')
    expect(feedingRowText(bottle, NOW)).toBe('Бутылочка · 120 мл')
    expect(feedingRowText(solid, NOW)).toBe('Кабачок · понравилось')
  })
})
