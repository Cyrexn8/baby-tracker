import type { ReminderState } from './state'
import { formatTime } from '../time/format'

/**
 * Ключ «одно уведомление» для движка напоминаний.
 *
 * Уникален для пары «напоминание + наступление». Перенос («напомнить позже») меняет ключ,
 * поэтому после переноса уведомление приходит ещё раз.
 */
export function notificationKey(state: ReminderState): string {
  const dueAt = state.pendingDueAt?.getTime() ?? 0
  const snoozedUntil = state.reminder.snoozedUntil?.getTime() ?? 0
  return `${state.reminder.id}:${dueAt}:${snoozedUntil}`
}

/** Наступившие напоминания, о которых ещё не сообщали. */
export function pickNotifications(
  states: ReminderState[],
  notified: ReadonlySet<string>,
): ReminderState[] {
  return states.filter(
    (state) =>
      (state.status === 'due' || state.status === 'overdue') && !notified.has(notificationKey(state)),
  )
}

/** Заголовок и текст системного уведомления. */
export function notificationText(state: ReminderState): { title: string; body: string } {
  const parts: string[] = []
  if (state.reminder.note.trim()) parts.push(state.reminder.note.trim())
  if (state.status === 'overdue' && state.pendingDueAt) {
    parts.push(`Планировалось на ${formatTime(state.pendingDueAt)}`)
  }
  return { title: state.reminder.title, body: parts.join('\n') }
}
