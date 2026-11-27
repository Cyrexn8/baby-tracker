import { measurements } from '../../lib/repositories'
import { useLive } from '../../lib/hooks/useLive'

/** Измерения ребёнка по возрастанию даты. */
export function useMeasurements(childId: string | null | undefined) {
  const { data, loading, error } = useLive(
    () => (childId ? measurements.listByChild(childId) : []),
    [childId],
  )
  return { measurements: data ?? [], loading, error }
}
