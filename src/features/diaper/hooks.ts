import { diapers } from '../../lib/repositories'
import { useLive } from '../../lib/hooks/useLive'
import { DEFAULT_DAY_START_HOUR, type DayKey, type TimeRange } from '../../lib/time/day'

/** Подгузники указанного «дня малыша». */
export function useDayDiapers(
  childId: string | null | undefined,
  dayKey: DayKey,
  dayStartHour = DEFAULT_DAY_START_HOUR,
) {
  const { data, loading, error } = useLive(
    () => (childId ? diapers.listForDay(childId, dayKey, dayStartHour) : []),
    [childId, dayKey, dayStartHour],
  )
  return { diapers: data ?? [], loading, error }
}

/** Подгузники в промежутке — для недельной истории. */
export function useDiapersInRange(childId: string | null | undefined, range: TimeRange | null) {
  // Зависимости передаём числами: объект range новый при каждой отрисовке.
  const from = range?.from.getTime() ?? null
  const to = range?.to.getTime() ?? null
  const { data, loading, error } = useLive(
    () =>
      childId && from !== null && to !== null
        ? diapers.listInRange(childId, { from: new Date(from), to: new Date(to) })
        : [],
    [childId, from, to],
  )
  return { diapers: data ?? [], loading, error }
}
