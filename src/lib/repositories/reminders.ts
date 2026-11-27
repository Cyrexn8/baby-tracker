import { db } from '../db/db'
import type { Reminder } from '../db/schema'
import type { ReminderRule } from '../reminders/rule'
import { createEntityRepository, type EntityRepository } from './base'
import { now } from '../clock'

export interface ReminderInput {
  /** `null` — напоминание не привязано к ребёнку. */
  childId: string | null
  title: string
  rule: ReminderRule
  note?: string
  active?: boolean
}

export interface ReminderRepository extends EntityRepository<Reminder> {
  /** Все неудалённые напоминания, новые сверху. */
  list(): Promise<Reminder[]>
  /** Включённые напоминания — только они показываются и приходят уведомлениями. */
  listActive(): Promise<Reminder[]>
  add(input: ReminderInput): Promise<Reminder>
  /** Откладывает текущее наступление до `until`. `null` — сбрасывает перенос. */
  setSnooze(id: string, until: Date | null): Promise<void>
}

const base = createEntityRepository(db.reminders)

async function list(): Promise<Reminder[]> {
  const rows = await base.list()
  return rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

async function listActive(): Promise<Reminder[]> {
  const rows = await db.reminders.filter((row) => row.deletedAt === null && row.active).toArray()
  return rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export const reminders: ReminderRepository = {
  ...base,
  list,
  listActive,
  add: (input) =>
    base.create({
      childId: input.childId,
      title: input.title,
      rule: input.rule,
      note: input.note ?? '',
      active: input.active ?? true,
      snoozedUntil: null,
    }),
  setSnooze: async (id, until) => {
    const reminder = await base.get(id)
    if (!reminder) throw new Error(`Напоминание не найдено: ${id}`)
    await db.reminders.update(id, { snoozedUntil: until, updatedAt: now() })
  },
}
