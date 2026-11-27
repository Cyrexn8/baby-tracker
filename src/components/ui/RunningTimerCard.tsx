import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { formatClock } from '../../lib/time/duration'
import { cn } from '../../lib/cn'
import type { BadgeTone } from './Badge'
import { Card } from './Card'

/** Классы значка и заголовка — те же цвета разделов, что у Badge. */
const TONES: Record<BadgeTone, { iconBox: string; title: string }> = {
  neutral: { iconBox: 'bg-surface-muted text-fg-muted', title: 'text-fg' },
  sleep: { iconBox: 'bg-cat-sleep-soft text-cat-sleep', title: 'text-cat-sleep' },
  feeding: { iconBox: 'bg-cat-feeding-soft text-cat-feeding', title: 'text-cat-feeding' },
  diaper: { iconBox: 'bg-cat-diaper-soft text-cat-diaper', title: 'text-cat-diaper' },
  growth: { iconBox: 'bg-cat-growth-soft text-cat-growth', title: 'text-cat-growth' },
  milestone: { iconBox: 'bg-cat-milestone-soft text-cat-milestone', title: 'text-cat-milestone' },
  reminder: { iconBox: 'bg-cat-reminder-soft text-cat-reminder', title: 'text-cat-reminder' },
}

export interface RunningTimerCardProps {
  /** Раздел, к которому относится таймер: задаёт цвет значка и заголовка. */
  tone: BadgeTone
  icon: LucideIcon
  /** Заголовок: «Спит», «Кормление». */
  title: string
  /** Подпись под заголовком: с какого момента идёт. */
  subtitle: string
  /** Секунды от начала: часы считаются снаружи, от startAt в базе. */
  clockSeconds: number
  /** Сохранение идёт: кнопки в области действий недоступны, двойное нажатие не сработает. */
  busy?: boolean
  /** Кнопки действия: одна широкая или сетка из двух. */
  children: ReactNode
}

/**
 * Панель идущего таймера: значок раздела, тикающие часы, кнопки завершения.
 * Время приходит посчитанным — панель не знает про базу, только про секунды.
 */
export function RunningTimerCard({ tone, icon: Icon, title, subtitle, clockSeconds, busy, children }: RunningTimerCardProps) {
  const colors = TONES[tone]
  return (
    <Card>
      <div className="flex items-center gap-4">
        <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', colors.iconBox)}>
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn('font-bold', colors.title)}>{title}</p>
          <p className="truncate text-xs text-fg-muted">{subtitle}</p>
        </div>
        {/* Часы обновляются каждую секунду; скринридерам их тиканье не озвучиваем. */}
        <p aria-live="off" className="shrink-0 text-3xl leading-none font-bold tabular-nums">
          {formatClock(clockSeconds)}
        </p>
      </div>
      {/* fieldset с disabled выключает все кнопки разом, стили :disabled у Button сработают сами. */}
      <fieldset disabled={busy} aria-busy={busy || undefined} className="mt-4 m-0 min-w-0 border-0 p-0">
        {children}
      </fieldset>
    </Card>
  )
}
