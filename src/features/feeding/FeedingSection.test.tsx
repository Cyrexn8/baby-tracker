import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { SettingsProvider } from '../../lib/settings/SettingsProvider'
import { FeedingSection } from './FeedingSection'
import { feedings, settingsRepository } from '../../lib/repositories'
import { dayStart, todayKey } from '../../lib/time/day'
import { clearDatabase, HOUR_MS, MINUTE_MS } from '../../test/helpers'

const CHILD_ID = 'child-1'

// Раздел читает настройки (вкладка кормления, час начала дня), поэтому нужен поставщик настроек.
function renderSection() {
  return render(
    <SettingsProvider>
      <FeedingSection childId={CHILD_ID} />
    </SettingsProvider>,
  )
}

/** Момент внутри текущего «дня малыша»: час после его начала (6:00), поэтому границы не страшны. */
function atDay(offsetHours: number): Date {
  return new Date(dayStart(todayKey()).getTime() + offsetHours * HOUR_MS)
}

describe('FeedingSection', () => {
  beforeEach(async () => {
    await clearDatabase()
  })

  it('быстрая кнопка «60 мл» записывает бутылочку с объёмом 60', async () => {
    renderSection()

    // По умолчанию открыта вкладка бутылочки — кнопка видна сразу.
    await userEvent.setup().click(await screen.findByRole('button', { name: '60 мл' }))

    const rows = await waitFor(async () => {
      const list = await feedings.listByChild(CHILD_ID)
      expect(list).toHaveLength(1)
      return list
    })
    expect(rows[0]?.type).toBe('bottle')
    expect(rows[0]?.amountMl).toBe(60)
  })

  it('выбранная вкладка сохраняется в настройки', async () => {
    renderSection()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Прикорм' }))

    await waitFor(async () => {
      await expect(settingsRepository.get()).resolves.toMatchObject({ lastFeedingTab: 'solid' })
    })
  })

  it('после перезагрузки вкладка восстанавливается из настроек', async () => {
    await settingsRepository.set('lastFeedingTab', 'solid')

    renderSection()

    // Без кликов: раздел должен открыться сразу на вкладке прикорма,
    // а не на бутылочке по умолчанию.
    expect(await screen.findByRole('button', { name: 'Добавить прикорм' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '60 мл' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Прикорм' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('«Левая» запускает таймер, «Завершить» записывает конец', async () => {
    renderSection()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Грудь' }))
    await user.click(await screen.findByRole('button', { name: 'Левая' }))

    // Панель идущего кормления заменила кнопки.
    expect(await screen.findByText('Кормление')).toBeInTheDocument()
    const running = await waitFor(async () => {
      const session = await feedings.getRunning(CHILD_ID)
      expect(session).toBeDefined()
      return session
    })
    expect(running?.side).toBe('left')

    await user.click(screen.getByRole('button', { name: 'Завершить' }))
    await waitFor(() => expect(feedings.getRunning(CHILD_ID)).resolves.toBeUndefined())
    const rows = await feedings.listByChild(CHILD_ID)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.endAt).not.toBeNull()
  })

  it('«Перейти на правую» закрывает текущее кормление и начинает новое', async () => {
    renderSection()
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Грудь' }))
    await user.click(await screen.findByRole('button', { name: 'Левая' }))
    await screen.findByText('Кормление')

    await user.click(screen.getByRole('button', { name: 'Перейти на правую' }))

    await waitFor(async () => {
      const running = await feedings.getRunning(CHILD_ID)
      expect(running?.side).toBe('right')
    })
    const rows = await feedings.listByChild(CHILD_ID)
    expect(rows).toHaveLength(2)
  })

  it('показывает записи всех трёх типов своими подписями', async () => {
    await feedings.add({
      childId: CHILD_ID,
      type: 'breast',
      startAt: atDay(1),
      endAt: new Date(atDay(1).getTime() + 20 * MINUTE_MS),
      side: 'left',
    })
    await feedings.add({ childId: CHILD_ID, type: 'bottle', startAt: atDay(2), amountMl: 120 })
    await feedings.add({ childId: CHILD_ID, type: 'solid', startAt: atDay(3), food: 'Кабачок', reaction: 'liked' })

    renderSection()

    expect(await screen.findByText('Грудь · левая · 20 мин')).toBeInTheDocument()
    expect(screen.getByText('Бутылочка · 120 мл')).toBeInTheDocument()
    expect(screen.getByText('Кабачок · понравилось')).toBeInTheDocument()
    expect(screen.getByText('3 кормления')).toBeInTheDocument()
  })
})
