import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { settingsRepository, type Settings } from '../repositories/settings'
import { useLive } from '../hooks/useLive'
import { applyTheme, watchSystemTheme } from '../theme'

interface SettingsContextValue {
  /** Настройки; `undefined`, пока читаются из базы. */
  settings: Settings | undefined
  loading: boolean
  error: unknown
  /** Меняет одну настройку и сохраняет её. */
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

/** Читает настройки один раз на всё приложение и применяет тему оформления. */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const { data, loading, error } = useLive(() => settingsRepository.get(), [])

  const theme = data?.theme

  useEffect(() => {
    if (theme) applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (theme !== 'system') return
    return watchSystemTheme(() => applyTheme('system'))
  }, [theme])

  const set = useCallback(
    async <K extends keyof Settings>(key: K, value: Settings[K]) => {
      await settingsRepository.set(key, value)
    },
    [],
  )

  const value = useMemo<SettingsContextValue>(
    () => ({ settings: data, loading, error, set }),
    [data, loading, error, set],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings можно вызывать только внутри SettingsProvider')
  return context
}
