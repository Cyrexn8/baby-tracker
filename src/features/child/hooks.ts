import { useCallback, useMemo } from 'react'
import type { Child } from '../../lib/db/schema'
import { childProfiles } from '../../lib/repositories'
import { useLive } from '../../lib/hooks/useLive'
import { useSettings } from '../../lib/settings/SettingsProvider'

/** Все дети пользователя, в порядке добавления. */
export function useChildren(): { children: Child[]; loading: boolean; error: unknown } {
  const { data, loading, error } = useLive(() => childProfiles.list(), [])
  return { children: data ?? [], loading, error }
}

/**
 * Ребёнок, выбранный в переключателе. Если выбранный удалён или ещё не выбран —
 * берётся первый из списка.
 */
export function useActiveChild(): {
  child: Child | null
  loading: boolean
  setActiveChildId: (id: string | null) => Promise<void>
} {
  const { settings, set } = useSettings()
  const { children: childList, loading } = useChildren()
  const activeChildId = settings?.activeChildId ?? null

  const child = useMemo(
    () => childList.find((candidate) => candidate.id === activeChildId) ?? childList[0] ?? null,
    [childList, activeChildId],
  )

  const setActiveChildId = useCallback((id: string | null) => set('activeChildId', id), [set])

  return { child, loading: loading || !settings, setActiveChildId }
}

export type OnboardingStatus = 'loading' | 'needed' | 'ready' | 'error'

/**
 * Нужен ли экран первого включения: он показывается, пока не добавлен первый ребёнок.
 * Срабатывает и тогда, когда единственного ребёнка удалили.
 */
export function useOnboardingState(): { status: OnboardingStatus } {
  const { settings, loading: settingsLoading, error: settingsError } = useSettings()
  const { children: childList, loading: childrenLoading, error: childrenError } = useChildren()

  if (settingsError || childrenError) return { status: 'error' }
  if (settingsLoading || childrenLoading) return { status: 'loading' }
  return {
    status: settings?.onboardingDone && childList.length > 0 ? 'ready' : 'needed',
  }
}
