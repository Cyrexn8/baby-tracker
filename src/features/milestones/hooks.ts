import { milestones } from '../../lib/repositories'
import { useLive } from '../../lib/hooks/useLive'

/** События ребёнка от новых к старым. */
export function useMilestones(childId: string | null | undefined) {
  const { data, loading, error } = useLive(
    () => (childId ? milestones.listByChild(childId) : []),
    [childId],
  )
  return { milestones: data ?? [], loading, error }
}
