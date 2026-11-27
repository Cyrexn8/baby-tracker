import { describe, expect, it } from 'vitest'
import type { Reminder } from '../db/schema'
import { notificationKey, notificationText, pickNotifications } from './engine'
import { computeReminderStates, type ReminderState } from './state'
import { at } from '../../test/helpers'
import type { ReminderRule } from './rule'

const NOW = at(2026, 5, 13, 10, 0)
const DAY_START = at(2026, 5, 13, 6)

function makeReminder(id: string, rule: ReminderRule, overrides: Partial<Reminder> = {}): Reminder {
  const created = at(2026, 5, 1, 12)
  return {
    id,
    createdAt: created,
    updatedAt: created,
    deletedAt: null,
    childId: null,
    title: 'Упражнения',
    note: '',
    rule,
    active: true,
    snoozedUntil: null,
    ...overrides,
  }
}

function state(id: string, rule: ReminderRule, overrides: Partial<Reminder> = {}, now = NOW): ReminderState {
  const [result] = computeReminderStates({
    reminders: [makeReminder(id, rule, overrides)],
    completions: [],
    now,
    dayStart: DAY_START,
  })
  if (!result) throw new Error(`Нет состояния для напоминания ${id}`)
  return result
}

describe('notificationKey', () => {
  it('одинаков для одного и того же наступления', () => {
    const rule: ReminderRule = { kind: 'daily', time: '10:00' }
    expect(notificationKey(state('r', rule))).toBe(notificationKey(state('r', rule)))
  })

  it('разный для разных напоминаний', () => {
    const rule: ReminderRule = { kind: 'daily', time: '10:00' }
    expect(notificationKey(state('r1', rule))).not.toBe(notificationKey(state('r2', rule)))
  })

  it('перенос меняет ключ — после переноса уведомление придёт снова', () => {
    const rule: ReminderRule = { kind: 'daily', time: '08:00' }
    const plain = state('r', rule)
    const snoozed = state('r', rule, { snoozedUntil: at(2026, 5, 13, 12) })
    expect(notificationKey(snoozed)).not.toBe(notificationKey(plain))
  })

  it('новое наступление следующего дня — новый ключ', () => {
    const rule: ReminderRule = { kind: 'daily', time: '10:00' }
    const today = state('r', rule)
    const tomorrow = state('r', rule, {}, at(2026, 5, 14, 10, 0))
    expect(notificationKey(tomorrow)).not.toBe(notificationKey(today))
  })
})

describe('pickNotifications', () => {
  const rules: Record<string, ReminderRule> = {
    due: { kind: 'daily', time: '10:00' },
    overdue: { kind: 'daily', time: '07:00' },
    upcoming: { kind: 'daily', time: '18:00' },
    snoozed: { kind: 'daily', time: '08:00' },
  }
  const reminders = [
    makeReminder('due', rules.due!),
    makeReminder('overdue', rules.overdue!),
    makeReminder('upcoming', rules.upcoming!),
    makeReminder('snoozed', rules.snoozed!, { snoozedUntil: at(2026, 5, 13, 12) }),
  ]
  const states = computeReminderStates({ reminders, completions: [], now: NOW, dayStart: DAY_START })

  it('берёт только наступившие и не отложенные', () => {
    expect(pickNotifications(states, new Set()).map((item) => item.reminder.id)).toEqual(['due', 'overdue'])
  })

  it('не повторяет уже показанные', () => {
    const notified = new Set(states.map(notificationKey))
    expect(pickNotifications(states, notified)).toEqual([])
  })
})

describe('notificationText', () => {
  it('заголовок — название напоминания, текст — заметка', () => {
    const rule: ReminderRule = { kind: 'daily', time: '10:00' }
    expect(notificationText(state('r', rule, { note: ' Мяч и фитбол ' }))).toEqual({
      title: 'Упражнения',
      body: 'Мяч и фитбол',
    })
  })

  it('без заметки у просроченного указывает плановое время', () => {
    const rule: ReminderRule = { kind: 'daily', time: '07:00' }
    expect(notificationText(state('r', rule))).toEqual({ title: 'Упражнения', body: 'Планировалось на 07:00' })
  })

  it('у вовремя наступившего без заметки текст пуст', () => {
    const rule: ReminderRule = { kind: 'daily', time: '10:00' }
    expect(notificationText(state('r', rule)).body).toBe('')
  })
})

