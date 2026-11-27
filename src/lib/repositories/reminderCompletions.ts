import { db } from '../db/db'
import type { ReminderCompletion } from '../db/schema'
import { createEntityRepository, type EntityRepository } from './base'
import { now } from '../clock'

export interface ReminderCompletionRepository extends EntityRepository<ReminderCompletion> {
  /** Отметки «сделано» для указанных напоминаний. */
  listForReminders(reminderIds: string[]): Promise<ReminderCompletion[]>
  /**
   * Отметки с момента `since` плюс все отметки указанных напоминаний.
   * Так разовым напоминаниям хватает их полной истории, а повторяющимся — только сегодняшней.
   */
  listRelevant(since: Date, alwaysReminderIds: string[]): Promise<ReminderCompletion[]>
  /** Отмечает наступление `dueAt` выполненным. Повторная отметка не создаёт дубль. */
  markDone(reminderId: string, dueAt: Date, doneAt?: Date): Promise<ReminderCompletion>
  /** Снимает отметку «сделано» с наступления `dueAt`. */
  unmarkDone(reminderId: string, dueAt: Date): Promise<void>
}

const base = createEntityRepository(db.reminderCompletions)

function sameDueAt(row: ReminderCompletion, dueAt: Date): boolean {
  return row.dueAt.getTime() === dueAt.getTime()
}

async function listForReminders(reminderIds: string[]): Promise<ReminderCompletion[]> {
  const ids = new Set(reminderIds)
  const rows = await db.reminderCompletions
    .filter((row) => row.deletedAt === null && ids.has(row.reminderId))
    .toArray()
  return rows
}

async function listRelevant(since: Date, alwaysReminderIds: string[]): Promise<ReminderCompletion[]> {
  const ids = new Set(alwaysReminderIds)
  return db.reminderCompletions
    .filter((row) => row.deletedAt === null && (ids.has(row.reminderId) || row.dueAt >= since))
    .toArray()
}

export const reminderCompletions: ReminderCompletionRepository = {
  ...base,
  listForReminders,
  listRelevant,
  markDone: async (reminderId, dueAt, doneAt = now()) => {
    const existing = (await listForReminders([reminderId])).find((row) => sameDueAt(row, dueAt))
    if (existing) return existing
    return base.create({ reminderId, dueAt, doneAt })
  },
  unmarkDone: async (reminderId, dueAt) => {
    const existing = (await listForReminders([reminderId])).find((row) => sameDueAt(row, dueAt))
    if (existing) await base.remove(existing.id)
  },
}
