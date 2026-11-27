import { Pencil, Trash } from 'lucide-react'
import type { Milestone } from '../../lib/db/schema'
import { formatLongDate } from '../../lib/time/format'
import { formatChildAge } from '../../lib/time/age'
import { parseDayKey } from '../../lib/time/day'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { milestoneCategory } from './milestoneCategories'
import { MilestonePhoto } from './MilestonePhoto'

export interface MilestoneCardProps {
  milestone: Milestone
  /** Дата рождения для подписи возраста на день события; без неё возраст не показывается. */
  birthDate: string | null
  onEdit: (milestone: Milestone) => void
  onDelete: (milestone: Milestone) => void
}

/** Карточка события «впервые»: значок категории, заголовок, дата и возраст, заметка, фото. */
export function MilestoneCard({ milestone, birthDate, onEdit, onDelete }: MilestoneCardProps) {
  const category = milestoneCategory(milestone.categoryId)
  const Icon = category.icon
  const date = formatLongDate(milestone.date)
  // Возраст на день события, не на сегодня: именно «первый шаг в 1 год 2 месяца».
  const age = birthDate ? formatChildAge(birthDate, parseDayKey(milestone.date)) : null
  const meta = [date, age].filter(Boolean).join(' · ')

  return (
    <li>
      <Card>
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cat-milestone-soft text-cat-milestone"
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">{milestone.title}</p>
            {/* Категория для скринридеров — скрытым текстом перед датой: значок сам её не озвучит. */}
            <p className="text-xs text-fg-muted">
              <span className="sr-only">{category.title}. </span>
              {meta}
            </p>
          </div>
          {/* У кнопок только значок, поэтому подпись для скринридеров — через aria-label. */}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Изменить «${milestone.title}»`}
            onClick={() => onEdit(milestone)}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-danger hover:bg-danger-soft hover:text-danger"
            aria-label={`Удалить «${milestone.title}»`}
            onClick={() => onDelete(milestone)}
          >
            <Trash className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        {milestone.note && <p className="mt-2 text-sm text-fg-muted">{milestone.note}</p>}
        {milestone.photoId && <MilestonePhoto photoId={milestone.photoId} title={milestone.title} />}
      </Card>
    </li>
  )
}
