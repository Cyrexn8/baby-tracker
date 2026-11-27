import { Milk } from 'lucide-react'
import type { Feeding } from '../../lib/db/schema'
import { formatTime } from '../../lib/time/format'
import { RunningTimerCard } from '../../components/ui/RunningTimerCard'
import { Button } from '../../components/ui/Button'
import { SIDE_LABELS } from './feedingLabels'

export interface RunningFeedingCardProps {
  feeding: Feeding
  /** Текущий момент: время тикает от него. */
  now: Date
  /** Сохранение идёт: кнопки недоступны, чтобы двойное нажатие не создало вторую запись. */
  busy?: boolean
  onFinish: () => void
  /** Завершить текущее кормление и начать новое на другой груди. */
  onSwitchSide: () => void
}

/**
 * Панель идущего грудного кормления. Время считается от `startAt` в базе,
 * поэтому не сбрасывается при перезагрузке страницы.
 */
export function RunningFeedingCard({ feeding, now, busy = false, onFinish, onSwitchSide }: RunningFeedingCardProps) {
  const seconds = Math.floor((now.getTime() - feeding.startAt.getTime()) / 1000)
  const side = feeding.side ?? 'left'

  return (
    <RunningTimerCard
      tone="feeding"
      icon={Milk}
      title="Кормление"
      subtitle={`${SIDE_LABELS[side]} грудь · с ${formatTime(feeding.startAt)}`}
      clockSeconds={seconds}
      busy={busy}
    >
      <div className="grid grid-cols-2 gap-2">
        <Button size="xl" onClick={onFinish}>
          Завершить
        </Button>
        {/* Со стороны «обе» переходить некуда, поэтому остаётся только «Завершить». */}
        {side === 'both' ? (
          <span aria-hidden="true" />
        ) : (
          <Button size="xl" variant="secondary" onClick={onSwitchSide}>
            Перейти на {side === 'left' ? 'правую' : 'левую'}
          </Button>
        )}
      </div>
    </RunningTimerCard>
  )
}
