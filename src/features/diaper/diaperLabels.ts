import type { DiaperType } from '../../lib/db/schema'
import { countLabel } from '../../lib/plural'

/** Все типы записей — в порядке кнопок быстрого добавления. */
export const DIAPER_TYPES = ['pee', 'poop', 'both'] as const

/**
 * Подписи типов со строчной буквы: они вставляются внутрь фраз
 * («Записано: покакал»), а не стоят сами по себе.
 */
export const DIAPER_TYPE_LABELS: Record<DiaperType, string> = {
  pee: 'пописал',
  poop: 'покакал',
  both: 'и то и другое',
}

export function diaperTypeLabel(type: DiaperType): string {
  return DIAPER_TYPE_LABELS[type]
}

/** Подпись с заглавной буквы — для кнопок и строк списка, где она стоит сама по себе. */
export function diaperTypeTitle(type: DiaperType): string {
  const label = DIAPER_TYPE_LABELS[type]
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/** «1 подгузник», «2 подгузника», «5 подгузников» — для заголовка раздела. */
export function diaperCountLabel(count: number): string {
  return countLabel(count, 'подгузник', 'подгузника', 'подгузников')
}
