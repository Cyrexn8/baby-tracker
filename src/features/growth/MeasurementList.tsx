import { useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Ruler, Trash } from 'lucide-react'
import type { Measurement } from '../../lib/db/schema'
import { measurements } from '../../lib/repositories'
import { formatLongDate } from '../../lib/time/format'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { SkeletonList } from '../../components/ui/SkeletonList'
import { formatCm, formatKg } from './growthLabels'

export interface MeasurementListProps {
  /** Измерения по возрастанию даты: так их отдаёт useMeasurements. */
  measurements: Measurement[]
  loading: boolean
  /** Открывает форму изменения переданного измерения. */
  onEdit: (measurement: Measurement) => void
}

/** «5,6 кг · 58 см» — показывает то, что заполнено. */
function valuesText(measurement: Measurement): string {
  const parts: string[] = []
  if (measurement.weightKg != null) parts.push(formatKg(measurement.weightKg))
  if (measurement.heightCm != null) parts.push(formatCm(measurement.heightCm))
  return parts.join(' · ')
}

/**
 * Список измерений, новые сверху. Удаление — с подтверждением,
 * изменение — открывает ту же форму, что и добавление.
 */
export function MeasurementList({ measurements: list, loading, onEdit }: MeasurementListProps) {
  const [deleting, setDeleting] = useState<Measurement | null>(null)

  if (loading) {
    // Скелет вместо «пусто»: данные ещё читаются, и записи могут вот-вот появиться.
    return <SkeletonList rows={2} className="p-4" />
  }

  if (list.length === 0) {
    return (
      <EmptyState
        icon={Ruler}
        title="Измерений ещё нет"
        description="Добавьте вес и рост — они появятся в списке и на графике."
      />
    )
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await measurements.remove(deleting.id)
      toast.success('Запись удалена')
    } catch (error) {
      console.error(error)
      toast.error('Не удалось удалить. Попробуйте ещё раз.')
    }
  }

  return (
    <>
      {/* Репозиторий отдаёт по возрастанию даты, в списке свежие должны быть сверху. */}
      <ul className="divide-y divide-line">
        {[...list].reverse().map((measurement) => {
          const date = formatLongDate(measurement.measuredOn)
          return (
            <li key={measurement.id} className="flex items-center gap-3 px-4 py-2.5">
              <time dateTime={measurement.measuredOn} className="min-w-0 flex-1">
                {/* Атрибут dateTime даёт точную дату машине, человек видит «12 мая 2026 г.». */}
                <p className="truncate font-semibold">{date}</p>
                <p className="truncate text-sm text-cat-growth">{valuesText(measurement)}</p>
                {measurement.note && <p className="truncate text-xs text-fg-muted">{measurement.note}</p>}
              </time>
              {/* У кнопок только значок, поэтому подпись для скринридеров — через aria-label. */}
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Изменить измерение за ${date}`}
                onClick={() => onEdit(measurement)}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-danger hover:bg-danger-soft hover:text-danger"
                aria-label={`Удалить измерение за ${date}`}
                onClick={() => setDeleting(measurement)}
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
            ? `Измерение за ${formatLongDate(deleting.measuredOn)} будет удалено из дневника. Действие нельзя отменить.`
            : ''
        }
        confirmLabel="Удалить"
        danger
      />
    </>
  )
}
