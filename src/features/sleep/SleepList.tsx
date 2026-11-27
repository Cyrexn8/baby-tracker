import { useState } from 'react'
import { toast } from 'sonner'
import { BedDouble, Pencil, Trash } from 'lucide-react'
import type { SleepSession } from '../../lib/db/schema'
import { sleepSessions } from '../../lib/repositories'
import { formatTime } from '../../lib/time/format'
import { formatClock, formatDuration, minutesBetween } from '../../lib/time/duration'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState } from '../../components/ui/EmptyState'
import { SkeletonList } from '../../components/ui/SkeletonList'

export interface SleepListProps {
  /** Сны дня, новые сверху: так их отдаёт useDaySleep. */
  sessions: SleepSession[]
  loading: boolean
  /** Текущий момент: длительность идущего сна считается от него. */
  now: Date
  /** Открывает форму изменения переданного сна. */
  onEdit: (session: SleepSession) => void
}

/** «09:00 – 10:30», а для идущего сна «09:00 – …». */
function intervalText(session: SleepSession): string {
  const end = session.endAt ? formatTime(session.endAt) : '…'
  return `${formatTime(session.startAt)} – ${end}`
}

/** «1 ч 30 мин», а для идущего сна «идёт 0:12» — время тикает вместе с «now». */
function durationText(session: SleepSession, now: Date): string {
  if (session.endAt) return formatDuration(minutesBetween(session.startAt, session.endAt))
  const seconds = Math.floor((now.getTime() - session.startAt.getTime()) / 1000)
  return `идёт ${formatClock(seconds)}`
}

/**
 * Список снов за день. Удаление — с подтверждением, изменение —
 * открывает ту же форму, что и добавление.
 */
export function SleepList({ sessions, loading, now, onEdit }: SleepListProps) {
  const [deleting, setDeleting] = useState<SleepSession | null>(null)

  if (loading) {
    // Скелет вместо «пусто»: данные ещё читаются, и записи могут вот-вот появиться.
    return <SkeletonList rows={2} className="p-4" />
  }

  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={BedDouble}
        title="Снов ещё нет"
        description="Нажмите «Уснул» перед сном — таймер посчитает длительность сам."
      />
    )
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await sleepSessions.remove(deleting.id)
      toast.success('Запись удалена')
    } catch (error) {
      console.error(error)
      toast.error('Не удалось удалить. Попробуйте ещё раз.')
    }
  }

  return (
    <>
      <ul className="divide-y divide-line">
        {sessions.map((session) => {
          const start = formatTime(session.startAt)
          return (
            <li key={session.id} className="flex items-center gap-3 px-4 py-2.5">
              {/* Атрибут dateTime даёт точное время машине, человек видит «09:00». */}
              <time dateTime={session.startAt.toISOString()} className="w-12 shrink-0 tabular-nums text-fg-muted">
                {start}
              </time>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-cat-sleep">
                  {intervalText(session)} · {durationText(session, now)}
                </p>
                {session.note && <p className="truncate text-xs text-fg-muted">{session.note}</p>}
              </div>
              {/* У кнопок только значок, поэтому подпись для скринридеров — через aria-label. */}
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Изменить сон, начавшийся в ${start}`}
                onClick={() => onEdit(session)}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-danger hover:bg-danger-soft hover:text-danger"
                aria-label={`Удалить сон, начавшийся в ${start}`}
                onClick={() => setDeleting(session)}
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
            ? `Сон с ${formatTime(deleting.startAt)} будет удалён из дневника. Действие нельзя отменить.`
            : ''
        }
        confirmLabel="Удалить"
        danger
      />
    </>
  )
}
