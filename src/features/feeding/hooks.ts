import { feedings } from '../../lib/repositories'
import { useLive } from '../../lib/hooks/useLive'
import { DEFAULT_DAY_START_HOUR, type DayKey, type TimeRange } from '../../lib/time/day'

/** Кормления, начавшиеся в указанном «дне малыша». */
export function useDayFeedings(
  childId: string | null | undefined,
  dayKey: DayKey,
  dayStartHour = DEFAULT_DAY_START_HOUR,
) {
  const { data, loading, error } = useLive(
    () => (childId ? feedings.listForDay(childId, dayKey, dayStartHour) : []),
    [childId, dayKey, dayStartHour],
  )
  return { feedings: data ?? [], loading, error }
}

/** Кормления в промежутке — для недельной истории. */
export function useFeedingsInRange(childId: string | null | undefined, range: TimeRange | null) {
  // Зависимости передаём числами: объект range новый при каждой отрисовке.
  const from = range?.from.getTime() ?? null
  const to = range?.to.getTime() ?? null
  const { data, loading, error } = useLive(
    () =>
      childId && from !== null && to !== null
        ? feedings.listInRange(childId, { from: new Date(from), to: new Date(to) })
        : [],
    [childId, from, to],
  )
  return { feedings: data ?? [], loading, error }
}

/** Идущее грудное кормление, если таймер запущен. */
export function useRunningFeeding(childId: string | null | undefined) {
  const { data, loading, error } = useLive(
    async () => (childId ? ((await feedings.getRunning(childId)) ?? null) : null),
    [childId],
  )
  return { feeding: data ?? null, loading, error }
}
