import type { ComponentPropsWithRef } from 'react'
import { cn } from '../../lib/cn'

/** Оттенок — раздел приложения, к которому относится счётчик. */
export type BadgeTone = 'neutral' | 'sleep' | 'feeding' | 'diaper' | 'growth' | 'milestone' | 'reminder'

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-muted text-fg-muted',
  sleep: 'bg-cat-sleep-soft text-cat-sleep',
  feeding: 'bg-cat-feeding-soft text-cat-feeding',
  diaper: 'bg-cat-diaper-soft text-cat-diaper',
  growth: 'bg-cat-growth-soft text-cat-growth',
  milestone: 'bg-cat-milestone-soft text-cat-milestone',
  reminder: 'bg-cat-reminder-soft text-cat-reminder',
}

export type BadgeProps = ComponentPropsWithRef<'span'> & {
  tone?: BadgeTone
}

/** Небольшая плашка: число записей за день, статус. */
export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold',
        TONES[tone],
        className,
      )}
      {...props}
    />
  )
}
