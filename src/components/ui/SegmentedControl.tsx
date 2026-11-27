import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  icon?: LucideIcon
}

export interface SegmentedControlProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: readonly SegmentOption<T>[]
  /** Название группы для скринридеров, например «Тема оформления». */
  label: string
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Переключатель из нескольких вариантов: вкладки кормления, тема оформления, период.
 * Каждый вариант — кнопка с `aria-pressed`, поэтому работает с клавиатуры и скринридерами.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  size = 'md',
  className,
}: SegmentedControlProps<T>) {
  return (
    <fieldset className={cn('min-w-0', className)}>
      <legend className="sr-only">{label}</legend>
      <div className="flex w-full gap-1 rounded-xl bg-surface-muted p-1">
        {options.map((option) => {
          const selected = option.value === value
          const Icon = option.icon
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                'flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
                selected ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg',
                size === 'sm' && 'h-9',
              )}
            >
              {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
              <span className="truncate">{option.label}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
