import type { ReactNode } from 'react'

export interface PageHeaderProps {
  title: string
  description?: string
  /** Кнопки справа от заголовка. */
  actions?: ReactNode
}

/** Заголовок страницы: название, пояснение и действия. */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl leading-tight font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}
