import type { ReactNode } from 'react'
import { Toaster } from 'sonner'
import { SettingsProvider, useSettings } from '../../lib/settings/SettingsProvider'
import { ReminderProvider } from '../../lib/reminders/ReminderProvider'
import { resolveTheme } from '../../lib/theme'

function ThemedToaster() {
  const { settings } = useSettings()
  return (
    <Toaster
      theme={resolveTheme(settings?.theme ?? 'system')}
      position="top-center"
      closeButton
      toastOptions={{
        // Не даём всплывающему сообщению закрыть шапку: внизу и так навигация.
        style: { marginTop: 'calc(env(safe-area-inset-top) + 12px)' },
      }}
    />
  )
}

/** Общие поставщики данных: настройки, напоминания, всплывающие сообщения. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <ReminderProvider>
        {children}
        <ThemedToaster />
      </ReminderProvider>
    </SettingsProvider>
  )
}
