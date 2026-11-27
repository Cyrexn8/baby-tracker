import { useState } from 'react'
import { toast } from 'sonner'
import { Milk, Pencil, Trash } from 'lucide-react'
import type { Feeding } from '../../lib/db/schema'
import { feedings } from '../../lib/repositories'
import { formatTime } from '../../lib/time/format'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { SkeletonList } from '../../components/ui/SkeletonList'
import { feedingRowText, FEEDING_TYPE_TITLES } from './feedingLabels'

export interface FeedingListProps {
  /** Кормления дня, новые сверху: так их отдаёт useDayFeedings. */
  feedings: Feeding[]
  loading: boolean
  /** Текущий момент: у идущей груди время считается от него. */
  now: Date
  /** Открывает форму изменения переданной записи. */
  onEdit: (feeding: Feeding) => void
}

/**
 * Список кормлений за день. Удаление — с подтверждением, изменение —
 * открывает ту же форму, что и добавление.
 */
export function FeedingList({ feedings: dayFeedings, loading, now, onEdit }: FeedingListProps) {
  const [deleting, setDeleting] = useState<Feeding | null>(null)

  if (loading) {
    // Скелет вместо «пусто»: данные ещё читаются, и записи могут вот-вот появиться.
    return <SkeletonList rows={2} className="p-4" />
  }

  if (dayFeedings.length === 0) {
    return (
      <EmptyState
        icon={Milk}
        title="Кормлений ещё нет"
        description="Запишите кормление кнопками выше."
      />
    )
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await feedings.remove(deleting.id)
      toast.success('Запись удалена')
    } catch (error) {
      console.error(error)
      toast.error('Не удалось удалить. Попробуйте ещё раз.')
    }
  }

  return (
    <>
      <ul className="divide-y divide-line">
        {dayFeedings.map((feeding) => {
          const start = formatTime(feeding.startAt)
          return (
            <li key={feeding.id} className="flex items-center gap-3 px-4 py-2.5">
              {/* Атрибут dateTime даёт точное время машине, человек видит «09:00». */}
              <time dateTime={feeding.startAt.toISOString()} className="w-12 shrink-0 tabular-nums text-fg-muted">
                {start}
              </time>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-cat-feeding">{feedingRowText(feeding, now)}</p>
                {feeding.note && <p className="truncate text-xs text-fg-muted">{feeding.note}</p>}
              </div>
              {/* У кнопок только значок, поэтому подпись для скринридеров — через aria-label. */}
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Изменить: ${FEEDING_TYPE_TITLES[feeding.type].toLowerCase()}, начало в ${start}`}
                onClick={() => onEdit(feeding)}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-danger hover:bg-danger-soft hover:text-danger"
                aria-label={`Удалить: ${FEEDING_TYPE_TITLES[feeding.type].toLowerCase()}, начало в ${start}`}
                onClick={() => setDeleting(feeding)}
              >
                <Trash className="h-4 w-4" aria-hidden="true" />
              </Button>
            </li>
          )
        })}
      </ul>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Удалить запись?"
        description={
          deleting
            ? `Кормление с ${formatTime(deleting.startAt)} будет удалено из дневника. Действие нельзя отменить.`
            : ''
        }
        confirmLabel="Удалить"
        danger
      />
    </>
  )
}
