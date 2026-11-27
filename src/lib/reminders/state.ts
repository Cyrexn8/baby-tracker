import type { Reminder, ReminderCompletion } from '../db/schema'
import { minutesBetween } from '../time/duration'
import { nextOccurrence, occurrencesBetween } from './schedule'

/** Позже стольких минут после наступления напоминание считается просроченным. */
export const OVERDUE_AFTER_MINUTES = 60

/**
 * - `upcoming` — следующее наступление ещё впереди;
 * - `due` — наступило и ждёт отметки «сделано»;
 * - `overdue` — наступило давно и всё ещё ждёт;
 * - `snoozed` — отложено командой «Напомнить позже»;
 * - `done` — сегодняшнее наступление отмечено как выполненное.
 */
export type ReminderStatus = 'upcoming' | 'due' | 'overdue' | 'snoozed' | 'done'

export interface ReminderState {
  reminder: Reminder
  status: ReminderStatus
  /** Наступление, которое ждёт отметки: для `due`, `overdue` и `snoozed`. */
  pendingDueAt: Date | null
  /** Ближайшее будущее наступление или `null`, если повторов больше нет. */
  nextDueAt: Date | null
}

export interface ComputeReminderStatesInput {
  /** Включённые напоминания. Выключенные нужно отфильтровать до вызова. */
  reminders: Reminder[]
  completions: ReminderCompletion[]
  now: Date
  /** Начало текущего «дня малыша»: пропущенные наступления раньше него не считаются. */
  dayStart: Date
  overdueAfterMinutes?: number
}

export function computeReminderStates({
  reminders,
  completions,
  now,
  dayStart,
  overdueAfterMinutes = OVERDUE_AFTER_MINUTES,
}: ComputeReminderStatesInput): ReminderState[] {
  const done = new Map<string, Set<number>>()
  for (const completion of completions) {
    if (completion.deletedAt !== null) continue
    let times = done.get(completion.reminderId)
    if (!times) {
      times = new Set<number>()
      done.set(completion.reminderId, times)
    }
    times.add(completion.dueAt.getTime())
  }

  return reminders
    .filter((reminder) => reminder.active && reminder.deletedAt === null)
    .map((reminder) => stateFor(reminder, done.get(reminder.id), now, dayStart, overdueAfterMinutes))
}

function stateFor(
  reminder: Reminder,
  doneTimes: Set<number> | undefined,
  now: Date,
  dayStart: Date,
  overdueAfterMinutes: number,
): ReminderState {
  // Разовое напоминание помним всегда, повторяющееся — только с начала сегодняшнего дня
  // (и с момента создания): вчерашние пропуски не должны висеть сегодня.
  const lookbackStart =
    reminder.rule.kind === 'once'
      ? new Date(0)
      : new Date(Math.max(reminder.createdAt.getTime(), dayStart.getTime()))

  const passed = occurrencesBetween(reminder.rule, lookbackStart, now)
  const waiting = passed.filter((time) => !doneTimes?.has(time.getTime()))
  const pendingDueAt = waiting.at(-1) ?? null

  if (pendingDueAt) {
    const snoozed =
      reminder.snoozedUntil !== null && reminder.snoozedUntil.getTime() > now.getTime()
    const status: ReminderStatus = snoozed
      ? 'snoozed'
      : minutesBetween(pendingDueAt, now) >= overdueAfterMinutes
        ? 'overdue'
        : 'due'
    return { reminder, status, pendingDueAt, nextDueAt: nextOccurrence(reminder.rule, now) }
  }

  return {
    reminder,
    status: passed.length > 0 ? 'done' : 'upcoming',
    pendingDueAt: null,
    nextDueAt: nextOccurrence(reminder.rule, now),
  }
}

/** Напоминания, которым нужен алерт: наступили и не отложены. */
export function isUrgent(state: ReminderState): boolean {
  return state.status === 'due' || state.status === 'overdue'
}

/** Сортировка для списка: сначала ждущие отметки (от давних к новым), потом будущие. */
export function sortForList(states: ReminderState[]): ReminderState[] {
  return [...states].sort((a, b) => {
    const rank = (state: ReminderState) => (isUrgent(state) ? 0 : state.status === 'snoozed' ? 1 : 2)
    const byRank = rank(a) - rank(b)
    if (byRank !== 0) return byRank
    const aTime = a.pendingDueAt ?? a.nextDueAt
    const bTime = b.pendingDueAt ?? b.nextDueAt
    if (!aTime || !bTime) return aTime ? -1 : bTime ? 1 : 0
    return aTime.getTime() - bTime.getTime()
  })
}
