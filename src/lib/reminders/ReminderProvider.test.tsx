import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsProvider } from '../settings/SettingsProvider'
import { ReminderProvider, REMINDER_CHECK_INTERVAL_MS, useReminderStates } from './ReminderProvider'
import { reminders } from '../repositories'
import { db } from '../db/db'
import { markReminderDone } from './actions'
import { at, clearDatabase } from '../../test/helpers'

const showMock = vi.hoisted(() => vi.fn(async () => true))

vi.mock('../notifications/notifications', () => ({ showLocalNotification: showMock }))

function Wrapper({ children }: { children?: ReactNode }) {
  return (
    <SettingsProvider>
      <ReminderProvider>{children}</ReminderProvider>
    </SettingsProvider>
  )
}

const DAILY_AT_10 = { kind: 'daily', time: '10:00' } as const
const CREATED_DAYS_AGO = at(2026, 5, 1, 12)

/** Добавляет напоминание, как будто оно было создано задолго до проверки. */
async function addOldReminder(title: string, note = '') {
  const reminder = await reminders.add({ childId: null, title, note, rule: DAILY_AT_10 })
  await db.reminders.update(reminder.id, { createdAt: CREATED_DAYS_AGO })
  return reminder
}

/** Меняет системное время и заставляет движок перепроверить напоминания, как при возврате на вкладку. */
async function passTimeTo(date: Date): Promise<void> {
  vi.setSystemTime(date)
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
}

describe('ReminderProvider', () => {
  beforeEach(async () => {
    showMock.mockClear()
    await clearDatabase()
    vi.useFakeTimers({ toFake: ['Date'] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function mount() {
    const hook = renderHook(() => useReminderStates(), { wrapper: Wrapper })
    await waitFor(() => expect(hook.result.current.ready).toBe(true))
    return hook
  }

  it('показывает уведомление, когда напоминание наступает при открытом приложении', async () => {
    vi.setSystemTime(at(2026, 5, 13, 9, 59))
    const reminder = await reminders.add({ childId: null, title: 'Упражнения', note: 'Мяч', rule: DAILY_AT_10 })

    const hook = await mount()
    expect(hook.result.current.states.map((state) => state.status)).toEqual(['upcoming'])
    expect(showMock).not.toHaveBeenCalled()

    await passTimeTo(at(2026, 5, 13, 10, 0))

    expect(hook.result.current.states[0]?.status).toBe('due')
    expect(showMock).toHaveBeenCalledTimes(1)
    expect(showMock).toHaveBeenCalledWith({
      title: 'Упражнения',
      body: 'Мяч',
      url: '/reminders',
      tag: `reminder-${reminder.id}`,
    })
  })

  it('следующие проверки не дублируют уведомление', async () => {
    vi.setSystemTime(at(2026, 5, 13, 9, 59))
    await reminders.add({ childId: null, title: 'Упражнения', rule: DAILY_AT_10 })
    await mount()

    await passTimeTo(at(2026, 5, 13, 10, 0))
    await passTimeTo(at(2026, 5, 13, 10, 30))
    await passTimeTo(at(2026, 5, 13, 11, 0))

    expect(showMock).toHaveBeenCalledTimes(1)
  })

  it('уведомляет и по таймеру, без возврата на вкладку', async () => {
    // Здесь подменяем и setInterval: waitFor сам на нём построен, поэтому базу ждём вручную.
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(at(2026, 5, 13, 9, 59))
    await reminders.add({ childId: null, title: 'Упражнения', rule: DAILY_AT_10 })

    const hook = renderHook(() => useReminderStates(), { wrapper: Wrapper })
    // База читается через настоящий setTimeout — даём ему сработать.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
    expect(hook.result.current.ready).toBe(true)
    expect(showMock).not.toHaveBeenCalled()

    vi.setSystemTime(at(2026, 5, 13, 10, 0))
    await act(async () => {
      vi.advanceTimersByTime(REMINDER_CHECK_INTERVAL_MS)
    })

    expect(hook.result.current.states[0]?.status).toBe('due')
    expect(showMock).toHaveBeenCalledTimes(1)
  })

  it('не дублирует уведомлением напоминания, наступившие до загрузки', async () => {
    vi.setSystemTime(at(2026, 5, 13, 10, 30))
    // Создано задолго до наступления, поэтому сегодня оно уже ждёт отметки.
    await addOldReminder('Упражнения')

    const hook = await mount()

    expect(hook.result.current.states[0]?.status).toBe('due')
    expect(showMock).not.toHaveBeenCalled()

    // Но если его отложить, а перенос закончится при открытом приложении — уведомление придёт.
    await act(async () => {
      await reminders.setSnooze(hook.result.current.states[0]!.reminder.id, at(2026, 5, 13, 10, 45))
    })
    await waitFor(() => expect(hook.result.current.states[0]?.status).toBe('snoozed'))
    await passTimeTo(at(2026, 5, 13, 10, 45))

    expect(hook.result.current.states[0]?.status).toBe('due')
    expect(showMock).toHaveBeenCalledTimes(1)
  })

  it('после «сделано» напоминание перестаёт ждать отметки', async () => {
    vi.setSystemTime(at(2026, 5, 13, 9, 59))
    await reminders.add({ childId: null, title: 'Упражнения', rule: DAILY_AT_10 })
    const hook = await mount()

    await passTimeTo(at(2026, 5, 13, 10, 0))
    const state = hook.result.current.states[0]
    if (!state?.pendingDueAt) throw new Error('Напоминание должно ждать отметки')

    await act(async () => {
      await markReminderDone(state.reminder.id, state.pendingDueAt!)
    })
    // Живой запрос перечитывает базу асинхронно.
    await waitFor(() => expect(hook.result.current.states[0]?.status).toBe('done'))
    expect(hook.result.current.states[0]?.nextDueAt).toEqual(at(2026, 5, 14, 10, 0))
    expect(showMock).toHaveBeenCalledTimes(1)
  })

  it('выключенное напоминание не попадает в состояния', async () => {
    vi.setSystemTime(at(2026, 5, 13, 9, 59))
    await reminders.add({ childId: null, title: 'Включено', rule: DAILY_AT_10 })
    const disabled = await reminders.add({ childId: null, title: 'Выключено', rule: DAILY_AT_10 })
    await reminders.update(disabled.id, { active: false })

    const hook = await mount()

    expect(hook.result.current.states.map((state) => state.reminder.title)).toEqual(['Включено'])
  })

  it('пока база читается, состояния пусты', async () => {
    const hook = renderHook(() => useReminderStates(), { wrapper: Wrapper })
    expect(hook.result.current.states).toEqual([])
    expect(hook.result.current.ready).toBe(false)
  })
})
