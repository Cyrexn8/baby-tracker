import type { LucideIcon } from 'lucide-react'
import { Footprints, MessageCircle, PartyPopper, Plane, Smile, Sparkles, Star } from 'lucide-react'

export interface MilestoneCategory {
  id: string
  title: string
  icon: LucideIcon
}

/** Другое — и вариант в списке, и запасной показ для неизвестного id из старых записей. */
const OTHER: MilestoneCategory = { id: 'other', title: 'Другое', icon: Star }

/**
 * Фиксированный список категорий событий «впервые». В записи хранится только id:
 * подписи и значки живут здесь, чтобы их можно было менять без миграций данных.
 */
export const MILESTONE_CATEGORIES: readonly MilestoneCategory[] = [
  { id: 'first-smile', title: 'Первая улыбка', icon: Smile },
  { id: 'first-tooth', title: 'Первый зуб', icon: Sparkles },
  { id: 'first-words', title: 'Первые слова', icon: MessageCircle },
  { id: 'first-step', title: 'Первый шаг', icon: Footprints },
  { id: 'holiday', title: 'Праздник', icon: PartyPopper },
  { id: 'trip', title: 'Поездка', icon: Plane },
  OTHER,
]

/** Подпись и значок по id записи. Неизвестный id показывается как «Другое». */
export function milestoneCategory(id: string | null | undefined): MilestoneCategory {
  return MILESTONE_CATEGORIES.find((category) => category.id === id) ?? OTHER
}

/** Id категорий для проверки в схеме формы. */
export const MILESTONE_CATEGORY_IDS = MILESTONE_CATEGORIES.map((category) => category.id) as [
  string,
  ...string[],
]
