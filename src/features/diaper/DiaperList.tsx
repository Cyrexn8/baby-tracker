import { useState } from 'react'
import { toast } from 'sonner'
import { Droplets, Pencil, Trash } from 'lucide-react'
import type { Diaper } from '../../lib/db/schema'
import { diapers } from '../../lib/repositories'
import { formatTime } from '../../lib/time/format'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { SkeletonList } from '../../components/ui/SkeletonList'
import { diaperTypeTitle } from './diaperLabels'

export interface DiaperListProps {
  /** Записи дня, новые сверху: так их отдаёт useDayDiapers. */
  diapers: Diaper[]
  loading: boolean
  /** Открывает форму изменения переданной записи. */
  onEdit: (diaper: Diaper) => void
}

/**
 * Список подгузников за день. Удаление — с подтверждением, изменение —
 * открывает ту же форму, что и добавление.
 */
export function DiaperList({ diapers: dayDiapers, loading, onEdit }: DiaperListProps) {
  const [deleting, setDeleting] = useState<Diaper | null>(null)

  if (loading) {
    // Скелет вместо «пусто»: данные ещё читаются, и записи могут вот-вот появиться.
    return <SkeletonList rows={2} className="p-4" />
  }

  if (dayDiapers.length === 0) {
    return (
      <EmptyState
        icon={Droplets}
        title="Записей ещё нет"
        description="Нажмите кнопку выше после смены подгузника."
      />
    )
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await diapers.remove(deleting.id)
      toast.success('Запись удалена')
    } catch (error) {
      console.error(error)
      toast.error('Не удалось удалить. Попробуйте ещё раз.')
    }
  }

  return (
    <>
      <ul className="divide-y divide-line">
        {dayDiapers.map((diaper) => {
          const time = formatTime(diaper.at)
          return (
            <li key={diaper.id} className="flex items-center gap-3 px-4 py-2.5">
              {/* Атрибут dateTime даёт точное время машине, человек видит «09:30». */}
              <time dateTime={diaper.at.toISOString()} className="w-12 shrink-0 tabular-nums text-fg-muted">
                {time}
              </time>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-cat-diaper">{diaperTypeTitle(diaper.type)}</p>
                {diaper.note && <p className="truncate text-xs text-fg-muted">{diaper.note}</p>}
              </div>
              {/* У кнопок только значок, поэтому подпись для скринридеров — через aria-label. */}
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Изменить запись за ${time}`}
                onClick={() => onEdit(diaper)}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-danger hover:bg-danger-soft hover:text-danger"
                aria-label={`Удалить запись за ${time}`}
                onClick={() => setDeleting(diaper)}
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
            ? `Запись за ${formatTime(deleting.at)} будет удалена из дневника. Действие нельзя отменить.`
            : ''
        }
        confirmLabel="Удалить"
        danger
      />
    </>
  )
}
