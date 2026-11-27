import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/cn'

export interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  /** Действие под текстом, обычно кнопка. */
  action?: ReactNode
  className?: string
}

/** Заглушка для пустого списка: значок, пояснение и действие. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-4 py-10 text-center', className)}>
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-accent">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <h3 className="text-base font-bold">{title}</h3>
        {description && <p className="mx-auto max-w-xs text-sm text-fg-muted">{description}</p>}
      </div>
      {action}
    </div>
  )
}
