import { cn } from '../../lib/cn'

export interface SkeletonListProps {
  /** Число строк-заглушек. */
  rows?: number
  className?: string
}

/** Заглушка списка, пока данные читаются из базы: серые «строки» вместо «пусто». */
export function SkeletonList({ rows = 2, className }: SkeletonListProps) {
  return (
    <div className={cn('space-y-3', className)} aria-busy="true" aria-label="Загружается">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-12 animate-pulse rounded-xl bg-surface-muted" />
      ))}
    </div>
  )
}
