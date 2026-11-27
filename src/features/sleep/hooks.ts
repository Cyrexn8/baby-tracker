import type { SleepSession } from '../../lib/db/schema'
import { sleepSessions } from '../../lib/repositories'
import { useLive } from '../../lib/hooks/useLive'
import { DEFAULT_DAY_START_HOUR, type DayKey, type TimeRange } from '../../lib/time/day'

/** Сны, начавшиеся в указанном «дне малыша». */
export function useDaySleep(
  childId: string | null | undefined,
  dayKey: DayKey,
  dayStartHour = DEFAULT_DAY_START_HOUR,
) {
  const { data, loading, error } = useLive(
    () => (childId ? sleepSessions.listForDay(childId, dayKey, dayStartHour) : []),
    [childId, dayKey, dayStartHour],
  )
  return { sessions: data ?? [], loading, error }
}

/** Сны, пересекающиеся с промежутком, — для недельной истории. */
export function useSleepInRange(childId: string | null | undefined, range: TimeRange | null) {
  // Зависимости передаём числами: объект range новый при каждой отрисовке.
  const from = range?.from.getTime() ?? null
  const to = range?.to.getTime() ?? null
  const { data, loading, error } = useLive(
    () =>
      childId && from !== null && to !== null
        ? sleepSessions.listOverlapping(childId, { from: new Date(from), to: new Date(to) })
        : [],
    [childId, from, to],
  )
  return { sessions: data ?? [], loading, error }
}

/** Идущий сон, если таймер запущен. */
export function useRunningSleep(childId: string | null | undefined) {
  const { data, loading, error } = useLive(
    async (): Promise<SleepSession | null> => (childId ? ((await sleepSessions.getRunning(childId)) ?? null) : null),
    [childId],
  )
  return { session: data ?? null, loading, error }
}
