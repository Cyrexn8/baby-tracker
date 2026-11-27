import { describe, expect, it } from 'vitest'
import type { Reminder, ReminderCompletion } from '../db/schema'
import type { ReminderRule } from './rule'
import { computeReminderStates, isUrgent, sortForList, OVERDUE_AFTER_MINUTES } from './state'
import { at } from '../../test/helpers'

// Среда 13 мая 2026, 10:00. День малыша начался в 6:00.
const NOW = at(2026, 5, 13, 10, 0)
const DAY_START = at(2026, 5, 13, 6, 0)
const LONG_AGO = at(2026, 5, 1, 12, 0)

function makeReminder(id: string, rule: ReminderRule, overrides: Partial<Reminder> = {}): Reminder {
  return {
    id,
    createdAt: LONG_AGO,
    updatedAt: LONG_AGO,
    deletedAt: null,
    childId: null,
    title: id,
    note: '',
    rule,
    active: true,
    snoozedUntil: null,
    ...overrides,
  }
}

function done(reminder: Reminder, dueAt: Date): ReminderCompletion {
  return {
    id: `${reminder.id}-${dueAt.getTime()}`,
    createdAt: dueAt,
    updatedAt: dueAt,
    deletedAt: null,
    reminderId: reminder.id,
    dueAt,
    doneAt: dueAt,
  }
}

function statesOf(
  reminders: Reminder[],
  completions: ReminderCompletion[] = [],
  overrides: Partial<Parameters<typeof computeReminderStates>[0]> = {},
) {
  const states = computeReminderStates({ reminders, completions, now: NOW, dayStart: DAY_START, ...overrides })
  return states
}

function stateOf(id: string, reminders: Reminder[], completions: ReminderCompletion[] = []) {
  const state = statesOf(reminders, completions).find((candidate) => candidate.reminder.id === id)
  if (!state) throw new Error(`Нет состояния для напоминания ${id}`)
  return state
}

describe('computeReminderStates: повторяющиеся напоминания', () => {
  it('наступившее ждёт отметки', () => {
    const state = stateOf('r', [makeReminder('r', { kind: 'daily', time: '10:00' })])
    expect(state.status).toBe('due')
    expect(state.pendingDueAt).toEqual(at(2026, 5, 13, 10, 0))
  })

  it('будущее наступление — upcoming', () => {
    const state = stateOf('r', [makeReminder('r', { kind: 'daily', time: '14:00' })])
    expect(state.status).toBe('upcoming')
    expect(state.pendingDueAt).toBeNull()
    expect(state.nextDueAt).toEqual(at(2026, 5, 13, 14, 0))
  })

  it('наступившее становится просроченным через час', () => {
    expect(stateOf('r', [makeReminder('r', { kind: 'daily', time: '09:01' })]).status).toBe('due')
    expect(stateOf('r', [makeReminder('r', { kind: 'daily', time: '09:00' })]).status).toBe('overdue')
  })

  it('порог просрочки можно задать', () => {
    const reminders = [makeReminder('r', { kind: 'daily', time: '09:45' })]
    expect(statesOf(reminders, [], { overdueAfterMinutes: 10 })[0]?.status).toBe('overdue')
    expect(statesOf(reminders, [], { overdueAfterMinutes: 30 })[0]?.status).toBe('due')
  })

  it('отмеченное сделанным — done', () => {
    const reminder = makeReminder('r', { kind: 'daily', time: '08:00' })
    const state = stateOf('r', [reminder], [done(reminder, at(2026, 5, 13, 8, 0))])
    expect(state.status).toBe('done')
    expect(state.nextDueAt).toEqual(at(2026, 5, 14, 8, 0))
  })

  it('отложенное — snoozed, а после конца переноса снова ждёт', () => {
    const future = makeReminder('r', { kind: 'daily', time: '08:00' }, { snoozedUntil: at(2026, 5, 13, 10, 30) })
    expect(stateOf('r', [future]).status).toBe('snoozed')

    const past = makeReminder('r', { kind: 'daily', time: '08:00' }, { snoozedUntil: at(2026, 5, 13, 9, 30) })
    expect(stateOf('r', [past]).status).toBe('overdue')
  })

  it('вчерашний пропуск не висит сегодня', () => {
    const reminder = makeReminder('r', { kind: 'daily', time: '10:00' })
    const nextMorning = at(2026, 5, 14, 7, 0)
    const state = statesOf([reminder], [], { now: nextMorning, dayStart: at(2026, 5, 14, 6) })[0]
    expect(state?.status).toBe('upcoming')
  })

  it('время, прошедшее до создания напоминания, не считается пропуском', () => {
    const reminder = makeReminder('r', { kind: 'daily', time: '08:00' }, { createdAt: at(2026, 5, 13, 9) })
    expect(stateOf('r', [reminder]).status).toBe('upcoming')
  })

  it('из нескольких пропущенных сегодня ждёт отметки последнее', () => {
    const reminder = makeReminder('r', { kind: 'interval', everyMinutes: 60, from: at(2026, 5, 13, 6), to: null })
    const state = stateOf('r', [reminder])
    expect(state.status).toBe('due')
    expect(state.pendingDueAt).toEqual(at(2026, 5, 13, 10, 0))
  })

  it('интервальное сделано, только когда закрыты все наступления до текущего', () => {
    const reminder = makeReminder('r', { kind: 'interval', everyMinutes: 120, from: at(2026, 5, 13, 6), to: null })
    const partly = [done(reminder, at(2026, 5, 13, 6)), done(reminder, at(2026, 5, 13, 8))]
    expect(stateOf('r', [reminder], partly).status).toBe('due')
    expect(stateOf('r', [reminder], [...partly, done(reminder, at(2026, 5, 13, 10))]).status).toBe('done')
  })

  it('отметка за другой день не закрывает сегодняшнее наступление', () => {
    const reminder = makeReminder('r', { kind: 'daily', time: '08:00' })
    const state = stateOf('r', [reminder], [done(reminder, at(2026, 5, 12, 8))])
    expect(state.status).toBe('overdue')
  })
})

describe('computeReminderStates: разовые напоминания', () => {
  it('в будущем — upcoming', () => {
    const reminder = makeReminder('r', { kind: 'once', at: at(2026, 5, 20, 15) })
    const state = stateOf('r', [reminder])
    expect(state.status).toBe('upcoming')
    expect(state.nextDueAt).toEqual(at(2026, 5, 20, 15))
  })

  it('прошло и не сделано — overdue, даже если это было неделю назад', () => {
    const reminder = makeReminder('r', { kind: 'once', at: at(2026, 5, 6, 15) })
    const state = stateOf('r', [reminder])
    expect(state.status).toBe('overdue')
    expect(state.pendingDueAt).toEqual(at(2026, 5, 6, 15))
  })

  it('сделано давно — done', () => {
    const dueAt = at(2026, 5, 6, 15)
    const reminder = makeReminder('r', { kind: 'once', at: dueAt })
    const state = stateOf('r', [reminder], [done(reminder, dueAt)])
    expect(state.status).toBe('done')
    expect(state.nextDueAt).toBeNull()
  })

  it('отложенное разовое — snoozed', () => {
    const reminder = makeReminder('r', { kind: 'once', at: at(2026, 5, 13, 9) }, { snoozedUntil: at(2026, 5, 13, 11) })
    expect(stateOf('r', [reminder]).status).toBe('snoozed')
  })
})

describe('computeReminderStates: фильтрация', () => {
  it('выключенные и удалённые напоминания не попадают в состояния', () => {
    const rule: ReminderRule = { kind: 'daily', time: '10:00' }
    const states = statesOf([
      makeReminder('off', rule, { active: false }),
      makeReminder('deleted', rule, { deletedAt: NOW }),
      makeReminder('on', rule),
    ])
    expect(states.map((state) => state.reminder.id)).toEqual(['on'])
  })

  it('удалённая отметка «сделано» не считается', () => {
    const reminder = makeReminder('r', { kind: 'daily', time: '08:00' })
    const completion = { ...done(reminder, at(2026, 5, 13, 8)), deletedAt: NOW }
    expect(stateOf('r', [reminder], [completion]).status).toBe('overdue')
  })

  it('isUrgent только для ждущих отметки', () => {
    const due = stateOf('r', [makeReminder('r', { kind: 'daily', time: '10:00' })])
    const upcoming = stateOf('r', [makeReminder('r', { kind: 'daily', time: '18:00' })])
    const snoozed = stateOf('r', [
      makeReminder('r', { kind: 'daily', time: '08:00' }, { snoozedUntil: at(2026, 5, 13, 11) }),
    ])
    expect(isUrgent(due)).toBe(true)
    expect(isUrgent(snoozed)).toBe(false)
    expect(isUrgent(upcoming)).toBe(false)
  })
})

describe('sortForList', () => {
  it('сначала ждущие от давних к новым, потом отложенные, потом будущие', () => {
    const reminders = [
      makeReminder('evening', { kind: 'daily', time: '18:00' }),
      makeReminder('snoozed', { kind: 'daily', time: '08:00' }, { snoozedUntil: at(2026, 5, 13, 11) }),
      makeReminder('due', { kind: 'daily', time: '09:50' }),
      makeReminder('morning', { kind: 'daily', time: '12:00' }),
      makeReminder('overdue', { kind: 'daily', time: '07:00' }),
    ]
    expect(sortForList(statesOf(reminders)).map((state) => state.reminder.id)).toEqual([
      'overdue',
      'due',
      'snoozed',
      'morning',
      'evening',
    ])
  })

  it('порог просрочки по умолчанию — час', () => {
    expect(OVERDUE_AFTER_MINUTES).toBe(60)
  })
})
