import { db } from '../db/db'
import { reminderCompletions, reminders } from '../repositories'
import { addMinutes } from 'date-fns'
import { now } from '../clock'

/** Варианты кнопки «Напомнить позже», в минутах. */
export const SNOOZE_MINUTES = [15, 30, 60] as const

export type SnoozeMinutes = (typeof SNOOZE_MINUTES)[number]

/** Отмечает наступление `dueAt` выполненным и снимает перенос, если он был. */
export async function markReminderDone(reminderId: string, dueAt: Date, doneAt = now()): Promise<void> {
  await db.transaction('rw', [db.reminderCompletions, db.reminders], async () => {
    await reminderCompletions.markDone(reminderId, dueAt, doneAt)
    await db.reminders.update(reminderId, { snoozedUntil: null })
  })
}

/** Возвращает отметку «сделано», чтобы напоминание снова ждало выполнения. */
export async function undoReminderDone(reminderId: string, dueAt: Date): Promise<void> {
  await reminderCompletions.unmarkDone(reminderId, dueAt)
}

/** Откладывает текущее наступление на несколько минут. */
export async function snoozeReminder(
  reminderId: string,
  minutes: number,
  from: Date = now(),
): Promise<void> {
  await reminders.setSnooze(reminderId, addMinutes(from, minutes))
}

/** Отменяет перенос: напоминание снова считается наступившим. */
export async function unsnoozeReminder(reminderId: string): Promise<void> {
  await reminders.setSnooze(reminderId, null)
}
