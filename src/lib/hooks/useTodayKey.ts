import { DEFAULT_DAY_START_HOUR, todayKey, type DayKey } from '../time/day'
import { useSettings } from '../settings/SettingsProvider'
import { useNow } from './useNow'

const MINUTE_MS = 60_000

/** Ключ текущего «дня малыша» и час, с которого день начинается. */
export function useTodayKey(): { today: DayKey; dayStartHour: number } {
  // Раз в минуту — достаточно, чтобы заметить переход границы дня.
  const now = useNow(MINUTE_MS)
  const { settings } = useSettings()
  const dayStartHour = settings?.dayStartHour ?? DEFAULT_DAY_START_HOUR
  return { today: todayKey(now, dayStartHour), dayStartHour }
}
