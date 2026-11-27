import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { reminderCompletions, reminders } from '../repositories'
import { useLive } from '../hooks/useLive'
import { useNow } from '../hooks/useNow'
import { useSettings } from '../settings/SettingsProvider'
import { DEFAULT_DAY_START_HOUR, dayStart, todayKey } from '../time/day'
import { showLocalNotification } from '../notifications/notifications'
import { notificationKey, notificationText, pickNotifications } from './engine'
import { computeReminderStates, type ReminderState } from './state'

/** Как часто проверяется, не наступило ли напоминание. */
export const REMINDER_CHECK_INTERVAL_MS = 30_000

/** Адрес страницы напоминаний — на неё ведёт клик по уведомлению. */
export const REMINDERS_PATH = '/reminders'

interface ReminderContextValue {
  /** Состояния включённых напоминаний; пусто, пока читается база. */
  states: ReminderState[]
  ready: boolean
}

const ReminderContext = createContext<ReminderContextValue | null>(null)

/**
 * Считает состояния напоминаний и показывает уведомления в момент наступления.
 *
 * Уведомление приходит, только если приложение открыто (вкладка или установленное PWA).
 * Уже наступившие при загрузке не дублируются уведомлением — их видно по метке в навигации.
 */
export function ReminderProvider({ children }: { children: ReactNode }) {
  const now = useNow(REMINDER_CHECK_INTERVAL_MS)
  const { settings } = useSettings()
  const dayStartHour = settings?.dayStartHour ?? DEFAULT_DAY_START_HOUR
  const today = todayKey(now, dayStartHour)

  const { data, loading } = useLive(async () => {
    const startOfToday = dayStart(today, dayStartHour)
    const list = await reminders.listActive()
    const onceIds = list.filter((reminder) => reminder.rule.kind === 'once').map((reminder) => reminder.id)
    const completions = await reminderCompletions.listRelevant(startOfToday, onceIds)
    return { list, completions }
  }, [today, dayStartHour])

  const states = useMemo(
    () =>
      data
        ? computeReminderStates({
            reminders: data.list,
            completions: data.completions,
            now,
            dayStart: dayStart(today, dayStartHour),
          })
        : [],
    [data, now, today, dayStartHour],
  )

  const notified = useRef(new Set<string>())
  const armed = useRef(false)
  const ready = !loading

  useEffect(() => {
    // Пока база не прочитана, состояний нет — считать это «загрузкой» нельзя.
    if (!ready) return
    const fresh = pickNotifications(states, notified.current)
    for (const state of fresh) {
      notified.current.add(notificationKey(state))
      if (armed.current) void showReminderNotification(state)
    }
    armed.current = true
  }, [states, ready])

  const value = useMemo<ReminderContextValue>(() => ({ states, ready }), [states, ready])

  return <ReminderContext.Provider value={value}>{children}</ReminderContext.Provider>
}

async function showReminderNotification(state: ReminderState): Promise<void> {
  const { title, body } = notificationText(state)
  await showLocalNotification({
    title,
    body,
    url: REMINDERS_PATH,
    tag: `reminder-${state.reminder.id}`,
  })
}

/** Состояния всех включённых напоминаний. */
export function useReminderStates(): ReminderContextValue {
  const context = useContext(ReminderContext)
  if (!context) throw new Error('useReminderStates можно вызывать только внутри ReminderProvider')
  return context
}

/** Сколько напоминаний наступили и ждут отметки — для метки в навигации. */
export function useDueRemindersCount(): number {
  const { states } = useReminderStates()
  return states.filter((state) => state.status === 'due' || state.status === 'overdue').length
}
