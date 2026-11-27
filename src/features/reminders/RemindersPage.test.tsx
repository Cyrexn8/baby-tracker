import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { SettingsProvider } from '../../lib/settings/SettingsProvider'
import { ReminderProvider } from '../../lib/reminders/ReminderProvider'
import { RemindersPage } from './RemindersPage'
import { reminders } from '../../lib/repositories'
import { db } from '../../lib/db/db'
import { addMinutes } from 'date-fns'
import { at, clearDatabase } from '../../test/helpers'

// Страница читает состояния из ReminderProvider и настройки — нужны оба поставщика.
function Wrapper({ children }: { children?: ReactNode }) {
  return (
    <SettingsProvider>
      <ReminderProvider>{children}</ReminderProvider>
    </SettingsProvider>
  )
}

function renderPage() {
  return render(
    <Wrapper>
      <RemindersPage />
    </Wrapper>,
  )
}

const DAILY_AT_10 = { kind: 'daily', time: '10:00' } as const

/** Меняет системное время и заставляет движок перепроверить напоминания, как при возврате на вкладку. */
async function passTimeTo(date: Date): Promise<void> {
  vi.setSystemTime(date)
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
}

describe('RemindersPage', () => {
  beforeEach(async () => {
    await clearDatabase()
    vi.useFakeTimers({ toFake: ['Date'] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('ждущее показывается в «Сегодня» и по «Сделано» исчезает', async () => {
    vi.setSystemTime(at(2026, 5, 13, 9, 59))
    await reminders.add({ childId: null, title: 'Упражнения', rule: DAILY_AT_10 })

    renderPage()
    await passTimeTo(at(2026, 5, 13, 10, 0))

    // Карточка ждёт отметки: и в группе «Сегодня», и в общем списке.
    expect((await screen.findAllByText('Упражнения')).length).toBe(2)
    expect(screen.getAllByText('Каждый день в 10:00')).toHaveLength(2)

    await userEvent.setup().click(screen.getByRole('button', { name: 'Сделано' }))

    // Состояние пересчиталось: группа «Сегодня» опустела, в общем списке — «Сделано сегодня».
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Сделано' })).toBeNull()
    })
    expect(await screen.findByText('Сделано сегодня')).toBeInTheDocument()
    // Но само напоминание осталось в общем списке.
    expect(screen.getAllByText('Упражнения')).toHaveLength(1)
  })

  it('«Напомнить позже» ставит snoozedUntil и переносит карточку в «Отложенные»', async () => {
    vi.setSystemTime(at(2026, 5, 13, 9, 59))
    const saved = await reminders.add({ childId: null, title: 'Витамины', rule: DAILY_AT_10 })

    renderPage()
    await passTimeTo(at(2026, 5, 13, 10, 0))

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Напомнить позже' }))

    // Три варианта переноса — как в SNOOZE_MINUTES.
    expect(screen.getByRole('button', { name: 'Через 15 минут' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Через 30 минут' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Через 60 минут' })).toBeInTheDocument()

    await userEvent.setup().click(screen.getByRole('button', { name: 'Через 30 минут' }))

    // В базе перенос на 10:30, и карточка переехала в «Отложенные».
    const stored = await reminders.get(saved.id)
    expect(stored?.snoozedUntil).toEqual(addMinutes(at(2026, 5, 13, 10, 0), 30))
    expect(await screen.findByText('Позже · 10:30')).toBeInTheDocument()
  })

  it('просроченное помечается красным со временем планирования', async () => {
    vi.setSystemTime(at(2026, 5, 13, 11, 30))
    // Создано задолго до проверки, поэтому наступление сегодня в 10:00 уже давно ждёт.
    const saved = await reminders.add({ childId: null, title: 'Упражнения', rule: DAILY_AT_10 })
    await db.reminders.update(saved.id, { createdAt: at(2026, 5, 1, 12) })

    renderPage()

    expect(await screen.findByText('Планировалось 10:00')).toBeInTheDocument()
    // Просроченные считаются в метке группы.
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('выключенное напоминание видно в общем списке как «Выключено»', async () => {
    vi.setSystemTime(at(2026, 5, 13, 9, 59))
    const saved = await reminders.add({ childId: null, title: 'Прогулка', rule: DAILY_AT_10 })
    await reminders.update(saved.id, { active: false })

    renderPage()

    expect(await screen.findByText('Прогулка')).toBeInTheDocument()
    // Состояний у выключенного нет — оно помечено как выключенное.
    expect(screen.getByText('Выключено')).toBeInTheDocument()
    const checkbox = screen.getByRole('checkbox', { name: 'Включено: Прогулка' })
    expect(checkbox).not.toBeChecked()
  })
})
