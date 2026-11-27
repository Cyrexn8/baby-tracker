import { z } from 'zod'
import type {
  Child,
  Diaper,
  Feeding,
  Measurement,
  Milestone,
  Reminder,
  ReminderCompletion,
  SleepSession,
  StoredFile,
} from '../db/schema'
import type { ReminderRule } from '../reminders/rule'
import { AVATAR_COLORS } from '../colors'
import { isDayKey } from '../time/day'

/**
 * Схемы записей базы в «живом» виде (даты — объекты Date).
 * Используются при импорте резервной копии и там, где данные приходят снаружи.
 * Типы записей — в src/lib/db/schema.ts; пометка `: z.ZodType<…>` не даёт схемам
 * разойтись с типами.
 */

const uuid = z.uuid()
const dayKey = z.string().refine(isDayKey, 'Ожидается дата в формате ГГГГ-ММ-ДД')
const timeOfDay = z.string().regex(/^\d{2}:\d{2}$/, 'Ожидается время в формате ЧЧ:ММ')
const notBlank = z.string().trim().min(1, 'Не может быть пустым')

const baseShape = {
  id: uuid,
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
}

export const childSchema: z.ZodType<Child> = z.object({
  ...baseShape,
  name: notBlank.max(60),
  birthDate: dayKey,
  avatarColor: z.enum(AVATAR_COLORS),
})

export const sleepSessionSchema: z.ZodType<SleepSession> = z.object({
  ...baseShape,
  childId: uuid,
  startAt: z.date(),
  endAt: z.date().nullable(),
  note: z.string(),
  source: z.enum(['timer', 'manual']),
})

export const feedingSchema: z.ZodType<Feeding> = z.object({
  ...baseShape,
  childId: uuid,
  type: z.enum(['breast', 'bottle', 'solid']),
  startAt: z.date(),
  endAt: z.date().nullable(),
  side: z.enum(['left', 'right', 'both']).nullable(),
  amountMl: z.number().nonnegative().nullable(),
  food: z.string().nullable(),
  reaction: z.enum(['liked', 'neutral', 'refused']).nullable(),
  note: z.string(),
})

export const diaperSchema: z.ZodType<Diaper> = z.object({
  ...baseShape,
  childId: uuid,
  at: z.date(),
  type: z.enum(['pee', 'poop', 'both']),
  note: z.string(),
})

export const measurementSchema: z.ZodType<Measurement> = z.object({
  ...baseShape,
  childId: uuid,
  measuredOn: dayKey,
  weightKg: z.number().positive().nullable(),
  heightCm: z.number().positive().nullable(),
  note: z.string(),
})

export const milestoneSchema: z.ZodType<Milestone> = z.object({
  ...baseShape,
  childId: uuid,
  title: notBlank.max(120),
  date: dayKey,
  categoryId: z.string().nullable(),
  note: z.string(),
  photoId: uuid.nullable(),
})

export const reminderRuleSchema: z.ZodType<ReminderRule> = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('once'), at: z.date() }),
  z.object({ kind: z.literal('daily'), time: timeOfDay }),
  z.object({
    kind: z.literal('weekly'),
    weekdays: z.array(z.number().int().min(0).max(6)),
    time: timeOfDay,
  }),
  z.object({
    kind: z.literal('interval'),
    everyMinutes: z.number().int().positive(),
    from: z.date(),
    to: z.date().nullable(),
  }),
])

export const reminderSchema: z.ZodType<Reminder> = z.object({
  ...baseShape,
  childId: uuid.nullable(),
  title: notBlank.max(120),
  note: z.string(),
  rule: reminderRuleSchema,
  active: z.boolean(),
  snoozedUntil: z.date().nullable(),
})

export const reminderCompletionSchema: z.ZodType<ReminderCompletion> = z.object({
  ...baseShape,
  reminderId: uuid,
  dueAt: z.date(),
  doneAt: z.date(),
})

/** Файл в резервной копии: байты закодированы в base64. */
export const exportedFileSchema: z.ZodType<Omit<StoredFile, 'data'> & { dataBase64: string }> = z.object({
  ...baseShape,
  name: z.string(),
  mimeType: z.string(),
  dataBase64: z.string(),
})

/** Резервная копия целиком. */
export const backupSchema = z.object({
  format: z.literal('baby-tracker-backup'),
  version: z.number().int().positive(),
  exportedAt: z.string(),
  data: z.object({
    children: z.array(childSchema),
    sleepSessions: z.array(sleepSessionSchema),
    feedings: z.array(feedingSchema),
    diapers: z.array(diaperSchema),
    measurements: z.array(measurementSchema),
    milestones: z.array(milestoneSchema),
    reminders: z.array(reminderSchema),
    reminderCompletions: z.array(reminderCompletionSchema),
    files: z.array(exportedFileSchema),
  }),
})

export type BackupData = z.infer<typeof backupSchema>['data']
