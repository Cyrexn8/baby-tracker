/**
 * Хуки напоминаний. Логика — в src/lib/reminders/:
 * - schedule.ts  — когда следующее наступление;
 * - state.ts     — состояния (наступило, просрочено, отложено, сделано);
 * - actions.ts   — «сделано», «отменить», «напомнить позже».
 */
export {
  useDueRemindersCount,
  useReminderStates,
  REMINDER_CHECK_INTERVAL_MS,
  REMINDERS_PATH,
} from '../../lib/reminders/ReminderProvider'
export { sortForList } from '../../lib/reminders/state'
export { describeRule } from '../../lib/reminders/schedule'
export {
  markReminderDone,
  undoReminderDone,
  snoozeReminder,
  unsnoozeReminder,
  SNOOZE_MINUTES,
  type SnoozeMinutes,
} from '../../lib/reminders/actions'
export { OVERDUE_AFTER_MINUTES, type ReminderStatus, type ReminderState } from '../../lib/reminders/state'
export type { ReminderRule } from '../../lib/reminders/rule'
