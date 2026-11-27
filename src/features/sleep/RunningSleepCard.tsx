import { Moon } from 'lucide-react'
import type { SleepSession } from '../../lib/db/schema'
import { formatTime } from '../../lib/time/format'
import { RunningTimerCard } from '../../components/ui/RunningTimerCard'
import { Button } from '../../components/ui/Button'

interface RunningSleepCardProps {
  session: SleepSession
  /** Текущий момент: время тикает от него. */
  now: Date
  onWake: () => void
}

/** Панель идущего сна: время считается от `startAt` в базе, перезагрузка его не сбрасывает. */
export function RunningSleepCard({ session, now, onWake }: RunningSleepCardProps) {
  const seconds = Math.floor((now.getTime() - session.startAt.getTime()) / 1000)
  return (
    <RunningTimerCard tone="sleep" icon={Moon} title="Спит" subtitle={`с ${formatTime(session.startAt)}`} clockSeconds={seconds}>
      <Button size="xl" className="w-full" onClick={onWake}>
        Проснулся
      </Button>
    </RunningTimerCard>
  )
}
