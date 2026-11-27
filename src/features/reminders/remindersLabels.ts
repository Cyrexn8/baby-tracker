import type { ReminderState } from './hooks'
import { formatDayMonth, formatTime } from '../../lib/time/format'

/** Статусная строка: что с напоминанием сейчас — «Следующее: …», «Ждёт отметки» и т. д. */
export function statusText(state: ReminderState): string {
  switch (state.status) {
    case 'due':
      return 'Ждёт отметки'
    case 'overdue':
      return 'Просрочено'
    case 'snoozed':
      return state.reminder.snoozedUntil ? `Отложено до ${formatTime(state.reminder.snoozedUntil)}` : 'Отложено'
    case 'done':
      return 'Сделано сегодня'
    case 'upcoming':
      return state.nextDueAt
        ? `Следующее: ${formatDayMonth(state.nextDueAt)} в ${formatTime(state.nextDueAt)}`
        : 'Больше не повторится'
  }
}
