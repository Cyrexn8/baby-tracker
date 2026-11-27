import type { ComponentPropsWithRef, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type CardProps = ComponentPropsWithRef<'div'>

/** Белая карточка с рамкой. */
export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-2xl bg-surface p-4 inset-ring-1 inset-ring-line shadow-[0_1px_2px_rgba(0,0,0,0.04)]', className)}
      {...props}
    />
  )
}

export interface SectionProps {
  title: string
  description?: string
  /** Действие справа от заголовка, обычно кнопка. */
  action?: ReactNode
  children: ReactNode
  className?: string
}

/** Карточка с заголовком раздела — блок настроек или сводка на странице. */
export function Section({ title, description, action, children, className }: SectionProps) {
  return (
    <section className={cn('space-y-3', className)}>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold leading-tight">{title}</h2>
          {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
