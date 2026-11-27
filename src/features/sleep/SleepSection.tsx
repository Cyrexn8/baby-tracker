import { useState } from 'react'
import { toast } from 'sonner'
import type { SleepSession } from '../../lib/db/schema'
import { sleepSessions } from '../../lib/repositories'
import { useTodayKey } from '../../lib/hooks/useTodayKey'
import { useNow } from '../../lib/hooks/useNow'
import { formatDuration, formatDurationLong, minutesBetween } from '../../lib/time/duration'
import { isForgottenTimer } from '../../lib/time/timer'
import { summarizeSleep } from '../../lib/time/summary'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Card, Section } from '../../components/ui/Card'
import { SkeletonList } from '../../components/ui/SkeletonList'
import { SleepList } from './SleepList'
import { SleepFormSheet } from './SleepFormSheet'
import { RunningSleepCard } from './RunningSleepCard'
import { useDaySleep, useRunningSleep } from './hooks'

export interface SleepSectionProps {
  childId: string
}

/**
 * Раздел «Сон» за текущий «день малыша»: таймер, запись за другое время и список.
 * Идущий сон живёт в базе, поэтому переживает перезагрузку страницы.
 */
export function SleepSection({ childId }: SleepSectionProps) {
  const { today, dayStartHour } = useTodayKey()
  const { sessions, loading } = useDaySleep(childId, today, dayStartHour)
  const { session: running, loading: runningLoading } = useRunningSleep(childId)

  // Раз в секунду только пока таймер идёт; иначе минуты не нужны и тратить их не на что.
  const now = useNow(running ? 1000 : 60_000)
  const summary = summarizeSleep(sessions, now)

  // 'new' — форма добавления, SleepSession — форма изменения конкретного сна.
  const [editor, setEditor] = useState<SleepSession | 'new' | null>(null)
  // Конец «сейчас», подставленный формой при забытом таймере (см. src/lib/time/timer.ts).
  const [endPreset, setEndPreset] = useState<Date | undefined>(undefined)

  const handleStart = async () => {
    try {
      await sleepSessions.start(childId)
    } catch (error) {
      console.error(error)
      toast.error('Не удалось начать сон. Попробуйте ещё раз.')
    }
  }

  const handleWake = async () => {
    if (!running) return
    if (isForgottenTimer(running.startAt, now)) {
      // Не сохраняем молча: даём поправить конец в форме изменения.
      setEndPreset(now)
      setEditor(running)
      return
    }
    try {
      await sleepSessions.stop(running.id)
      toast.success(`Сон записан: ${formatDurationLong(minutesBetween(running.startAt, now))}`)
    } catch (error) {
      console.error(error)
      toast.error('Не удалось сохранить сон. Попробуйте ещё раз.')
    }
  }

  const editing = editor === 'new' || editor === null ? undefined : editor

  return (
    <Section
      title="Сон"
      action={
        // Суммарный сон за день, включая идущий: растёт вместе с таймером.
        <Badge tone="sleep">{formatDuration(summary.totalMinutes)}</Badge>
      }
    >
      {runningLoading ? (
        // Пока решаем «идёт ли таймер», кнопки «Уснул» не показываем: он мог уже быть нажат.
        <Card>
          <SkeletonList rows={1} />
        </Card>
      ) : running ? (
        <RunningSleepCard session={running} now={now} onWake={() => void handleWake()} />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Button size="xl" onClick={() => void handleStart()}>
            Уснул
          </Button>
          {/* Запись задним числом — редкий случай, поэтому стиль скромнее, чем у «Уснул». */}
          <Button size="xl" variant="secondary" onClick={() => setEditor('new')}>
            Другое время
          </Button>
        </div>
      )}

      <Card className="p-0">
        <SleepList sessions={sessions} loading={loading} now={now} onEdit={setEditor} />
      </Card>

      <SleepFormSheet
        open={editor !== null}
        onClose={() => {
          setEditor(null)
          setEndPreset(undefined)
        }}
        childId={childId}
        session={editing}
        endPreset={endPreset}
      />
    </Section>
  )
}
