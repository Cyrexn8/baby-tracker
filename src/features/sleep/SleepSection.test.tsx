import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { SettingsProvider } from '../../lib/settings/SettingsProvider'
import { SleepSection } from './SleepSection'
import { sleepSessions } from '../../lib/repositories'
import { todayKey } from '../../lib/time/day'
import { clearDatabase, HOUR_MS } from '../../test/helpers'

const CHILD_ID = 'child-1'

// Раздел читает настройки (час начала дня), поэтому нужен поставщик настроек.
function renderSection() {
  return render(
    <SettingsProvider>
      <SleepSection childId={CHILD_ID} />
    </SettingsProvider>,
  )
}

describe('SleepSection', () => {
  beforeEach(async () => {
    await clearDatabase()
  })

  it('«Уснул» создаёт идущий сон и показывает панель таймера', async () => {
    renderSection()
    const user = userEvent.setup()

    // Кнопка появляется, когда выяснилось, что таймер ещё не запущен.
    await user.click(await screen.findByRole('button', { name: 'Уснул' }))

    const running = await waitFor(async () => {
      const session = await sleepSessions.getRunning(CHILD_ID)
      expect(session).toBeDefined()
      return session
    })
    expect(running?.endAt).toBeNull()
    expect(running?.source).toBe('timer')
    expect(await screen.findByText('Спит')).toBeInTheDocument()
  })

  it('«Проснулся» записывает конец сна', async () => {
    await sleepSessions.start(CHILD_ID)
    renderSection()

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Проснулся' }))

    await waitFor(() => expect(sleepSessions.getRunning(CHILD_ID)).resolves.toBeUndefined())
    const sessions = await sleepSessions.listForDay(CHILD_ID, todayKey())
    expect(sessions).toHaveLength(1)
    // Конец записан и не раньше начала.
    expect(sessions[0]?.endAt).not.toBeNull()
    expect(sessions[0]!.endAt!.getTime()).toBeGreaterThanOrEqual(sessions[0]!.startAt.getTime())
  })

  it('после перезагрузки страницы идущий сон находится снова', async () => {
    await sleepSessions.start(CHILD_ID)
    const first = renderSection()
    expect(await screen.findByText('Спит')).toBeInTheDocument()
    first.unmount()

    // Новый render — как открытие приложения заново: таймер живёт в базе, а не в состоянии.
    renderSection()
    expect(await screen.findByText('Спит')).toBeInTheDocument()
    expect(await sleepSessions.getRunning(CHILD_ID)).toBeDefined()
  })

  it('таймер дольше 12 часов: «Проснулся» открывает форму, а не сохраняет молча', async () => {
    const started = await sleepSessions.start(CHILD_ID, new Date(Date.now() - 13 * HOUR_MS))
    renderSection()

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Проснулся' }))

    // Форма изменения открыта с концом «сейчас», а таймер всё ещё идёт.
    expect(await screen.findByText('Изменить сон')).toBeInTheDocument()
    const running = await sleepSessions.getRunning(CHILD_ID)
    expect(running?.id).toBe(started.id)
  })
})
