import type { LucideIcon } from 'lucide-react'
import { Droplets, Milk, Moon } from 'lucide-react'
import type { DayEntries } from './hooks'
import { summarizeSleep, summarizeFeedings, summarizeDiapers } from '../../lib/time/summary'
import { formatDuration } from '../../lib/time/duration'
import { formatTime } from '../../lib/time/format'
import { plural } from '../../lib/plural'
import { useNow } from '../../lib/hooks/useNow'
import { cn } from '../../lib/cn'

export interface DaySummaryProps {
  entries: DayEntries
  /** Плавно прокручивает к разделу: id обёртки раздела на странице. */
  onJump: (sectionId: string) => void
}

/** Значки разделов и их цвета — те же, что в самих разделах. */
const CARDS: readonly { key: string; icon: LucideIcon; box: string; label: (count: number) => string }[] = [
  { key: 'today-sleep', icon: Moon, box: 'bg-cat-sleep-soft text-cat-sleep', label: () => 'сна' },
  {
    key: 'today-feedings',
    icon: Milk,
    box: 'bg-cat-feeding-soft text-cat-feeding',
    label: (count) => plural(count, 'кормление', 'кормления', 'кормлений'),
  },
  {
    key: 'today-diapers',
    icon: Droplets,
    box: 'bg-cat-diaper-soft text-cat-diaper',
    label: (count) => plural(count, 'подгузник', 'подгузника', 'подгузников'),
  },
]

/**
 * Итоги дня над разделами: клик по карточке прокручивает к её разделу.
 * Пока записи читаются — скелет той же высоты, чтобы страница не прыгала.
 */
export function DaySummary({ entries, onJump }: DaySummaryProps) {
  const now = useNow(60_000)

  if (entries.loading) {
    return (
      <div className="grid grid-cols-3 gap-2" aria-busy="true" aria-label="Загружается">
        {CARDS.map((card) => (
          <div key={card.key} className="h-[118px] animate-pulse rounded-2xl bg-surface-muted" />
        ))}
      </div>
    )
  }

  const sleep = summarizeSleep(entries.sleep, now)
  const feedings = summarizeFeedings(entries.feedings, now)
  const diapers = summarizeDiapers(entries.diapers)

  // Число и подпись на карточке: подписи кормлений и подгузников склоняются,
  // чтобы не было «1 кормлений».
  const values: Record<string, string> = {
    'today-sleep': formatDuration(sleep.totalMinutes),
    'today-feedings': String(feedings.count),
    'today-diapers': String(diapers.count),
  }

  // Подсказка собирается только из того, что есть: пустая часть не показывается.
  const hints: string[] = []
  if (feedings.lastAt) hints.push(`Последнее кормление в ${formatTime(feedings.lastAt)}`)
  if (diapers.lastAt) hints.push(`Последний подгузник в ${formatTime(diapers.lastAt)}`)

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {CARDS.map((card) => {
          const Icon = card.icon
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => onJump(card.key)}
              className="flex flex-col items-center gap-1.5 rounded-2xl bg-surface p-3 inset-ring-1 inset-ring-line transition-transform duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
              <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', card.box)}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-center text-sm leading-tight font-bold tabular-nums">{values[card.key]}</span>
              <span className="text-xs text-fg-muted">{card.label(Number(values[card.key]))}</span>
            </button>
          )
        })}
      </div>

      {hints.length > 0 && <p className="mt-2 text-center text-xs text-fg-muted">{hints.join(' · ')}</p>}
    </div>
  )
}
