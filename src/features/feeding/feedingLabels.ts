import type { Feeding, FeedingReaction, FeedingType } from '../../lib/db/schema'
import { countLabel } from '../../lib/plural'
import { formatClock, formatDuration, minutesBetween } from '../../lib/time/duration'

/** Все типы кормлений — в порядке вкладок. */
export const FEEDING_TYPES = ['breast', 'bottle', 'solid'] as const

/** Груди в порядке кнопок. */
export const FEEDING_SIDES = ['left', 'right', 'both'] as const

/** Подписи типов с заглавной: вкладки, заголовки форм. */
export const FEEDING_TYPE_TITLES: Record<FeedingType, string> = {
  breast: 'Грудь',
  bottle: 'Бутылочка',
  solid: 'Прикорм',
}

/** Грудь со строчной — внутри строки «Грудь · левая · …». */
export const SIDE_LABELS: Record<NonNullable<Feeding['side']>, string> = {
  left: 'левая',
  right: 'правая',
  both: 'обе',
}

/** Грудь с заглавной — кнопки выбора. */
export const SIDE_TITLES: Record<NonNullable<Feeding['side']>, string> = {
  left: 'Левая',
  right: 'Правая',
  both: 'Обе',
}

/** Реакция на прикорм — в строке списка после блюда. */
export const REACTION_LABELS: Record<FeedingReaction, string> = {
  liked: 'понравилось',
  neutral: 'нейтрально',
  refused: 'отказался',
}

export function feedingCountLabel(count: number): string {
  return countLabel(count, 'кормление', 'кормления', 'кормлений')
}

/** «120 мл». */
export function amountLabel(amountMl: number): string {
  return `${amountMl} мл`
}

/**
 * Текст строки списка. Грудь — «Грудь · левая · 20 мин» (идущая — «идёт 0:12»),
 * бутылочка — «Бутылочка · 120 мл», прикорм — ведёт блюдо: «Кабачок · понравилось».
 */
export function feedingRowText(feeding: Feeding, now: Date): string {
  if (feeding.type === 'breast') {
    const side = feeding.side ? SIDE_LABELS[feeding.side] : null
    const duration =
      feeding.endAt === null
        ? `идёт ${formatClock(Math.floor((now.getTime() - feeding.startAt.getTime()) / 1000))}`
        : formatDuration(minutesBetween(feeding.startAt, feeding.endAt))
    return ['Грудь', side, duration].filter(Boolean).join(' · ')
  }
  if (feeding.type === 'bottle') {
    return ['Бутылочка', amountLabel(feeding.amountMl ?? 0)].join(' · ')
  }
  const parts = [feeding.food?.trim() || 'Прикорм']
  if (feeding.reaction) parts.push(REACTION_LABELS[feeding.reaction])
  return parts.join(' · ')
}
