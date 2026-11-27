import { Dexie, type Table } from 'dexie'
import type {
  Child,
  Diaper,
  Feeding,
  Measurement,
  Milestone,
  Reminder,
  ReminderCompletion,
  Setting,
  SleepSession,
  StoredFile,
} from './schema'

export const DB_NAME = 'baby-tracker'

/**
 * Локальная база приложения (IndexedDB через Dexie).
 *
 * Схема — версия 1. При изменении полей добавляйте новую версию через `this.version(N)`
 * с миграцией, а не правьте существующую: иначе у пользователей база не откроется.
 */
export class BabyTrackerDB extends Dexie {
  children!: Table<Child, string>
  sleepSessions!: Table<SleepSession, string>
  feedings!: Table<Feeding, string>
  diapers!: Table<Diaper, string>
  measurements!: Table<Measurement, string>
  milestones!: Table<Milestone, string>
  files!: Table<StoredFile, string>
  reminders!: Table<Reminder, string>
  reminderCompletions!: Table<ReminderCompletion, string>
  settings!: Table<Setting, string>

  constructor(name = DB_NAME) {
    super(name)
    // Первое поле — первичный ключ, остальные — индексы для выборок.
    this.version(1).stores({
      children: 'id, updatedAt, deletedAt',
      sleepSessions: 'id, childId, startAt, deletedAt',
      feedings: 'id, childId, startAt, deletedAt',
      diapers: 'id, childId, at, deletedAt',
      measurements: 'id, childId, measuredOn, deletedAt',
      milestones: 'id, childId, date, deletedAt',
      files: 'id, updatedAt, deletedAt',
      reminders: 'id, childId, active, deletedAt',
      reminderCompletions: 'id, reminderId, [reminderId+dueAt]',
      settings: 'key',
    })
  }
}

export const db = new BabyTrackerDB()
