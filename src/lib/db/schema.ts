import type { ReminderRule } from '../reminders/rule'
import type { AvatarColor } from '../colors'

/**
 * Общие поля любой записи.
 *
 * `id`, `createdAt`, `updatedAt` и мягкое удаление (`deletedAt`) нужны для будущей
 * синхронизации с сервером: так изменения с разных устройств сливаются без конфликтов.
 */
export interface BaseEntity {
  id: string
  createdAt: Date
  updatedAt: Date
  /** Момент удаления. Запись с `deletedAt !== null` скрыта, но остаётся в базе. */
  deletedAt: Date | null
}

/** Запись, принадлежащая ребёнку. */
export interface ChildEntity extends BaseEntity {
  childId: string
}

export interface Child extends BaseEntity {
  name: string
  /** Дата рождения, 'YYYY-MM-DD'. */
  birthDate: string
  avatarColor: AvatarColor
}

export interface SleepSession extends ChildEntity {
  startAt: Date
  /** `null`, пока идёт таймер сна. */
  endAt: Date | null
  note: string
  source: 'timer' | 'manual'
}

export type FeedingType = 'breast' | 'bottle' | 'solid'

/** Реакция на прикорм. Для груди и бутылочки — `null`. */
export type FeedingReaction = 'liked' | 'neutral' | 'refused'

export interface Feeding extends ChildEntity {
  type: FeedingType
  startAt: Date
  /** `null`, пока идёт таймер грудного кормления. */
  endAt: Date | null
  side: 'left' | 'right' | 'both' | null
  /** Объём в мл: для бутылочки, иногда для прикорма. */
  amountMl: number | null
  /** Блюдо, вид смеси или молока. */
  food: string | null
  reaction: FeedingReaction | null
  note: string
}

export type DiaperType = 'pee' | 'poop' | 'both'

export interface Diaper extends ChildEntity {
  at: Date
  type: DiaperType
  note: string
}

export interface Measurement extends ChildEntity {
  /** День измерения, 'YYYY-MM-DD'. */
  measuredOn: string
  weightKg: number | null
  heightCm: number | null
  note: string
}

export interface Milestone extends ChildEntity {
  title: string
  /** День события, 'YYYY-MM-DD'. */
  date: string
  categoryId: string | null
  note: string
  /** Ссылка на запись в `files` (фотография). */
  photoId: string | null
}

/** Файл (фотография события). Байты хранятся как ArrayBuffer: так надёжнее в Safari. */
export interface StoredFile extends BaseEntity {
  name: string
  mimeType: string
  data: ArrayBuffer
}

export interface Reminder extends BaseEntity {
  /** `null` — напоминание не привязано к конкретному ребёнку. */
  childId: string | null
  title: string
  note: string
  rule: ReminderRule
  active: boolean
  /** До какого момента текущее наступление отложено («Напомнить позже»). */
  snoozedUntil: Date | null
}

/** Отметка «сделано» для одного наступления напоминания. */
export interface ReminderCompletion extends BaseEntity {
  reminderId: string
  /** Момент наступления, который закрыли. */
  dueAt: Date
  doneAt: Date
}

export interface Setting {
  key: string
  value: unknown
}
