import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { SettingsProvider } from '../../lib/settings/SettingsProvider'
import { DiaperSection } from './DiaperSection'
import { diapers } from '../../lib/repositories'
import { dayStart, todayKey } from '../../lib/time/day'
import { formatTime } from '../../lib/time/format'
import { clearDatabase, HOUR_MS } from '../../test/helpers'

const CHILD_ID = 'child-1'

// Раздел читает настройки (час начала дня), поэтому нужен поставщик настроек.
function renderSection() {
  return render(
    <SettingsProvider>
      <DiaperSection childId={CHILD_ID} />
    </SettingsProvider>,
  )
}

/** Момент внутри текущего «дня малыша»: час после его начала (6:00), поэтому границы не страшны. */
function atDay(offsetHours: number): Date {
  return new Date(dayStart(todayKey()).getTime() + offsetHours * HOUR_MS)
}

describe('DiaperSection', () => {
  beforeEach(async () => {
    await clearDatabase()
  })

  it('показывает записи дня, новые сверху, и их число в заголовке', async () => {
    // Сначала раннюю запись, потом позднюю: список должен показать позднюю первой.
    await diapers.add({ childId: CHILD_ID, at: atDay(1), type: 'pee' })
    await diapers.add({ childId: CHILD_ID, at: atDay(2), type: 'poop', note: 'После сна' })

    renderSection()

    // Ждём число за день: пока база читается, раздел показывает скелет.
    expect(await screen.findByText('2 подгузника')).toBeInTheDocument()

    // Ищем внутри строк: те же подписи есть и в кнопках быстрого добавления.
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Покакал')
    expect(items[0]).toHaveTextContent('После сна')
    expect(within(items[0]!).getByText(formatTime(atDay(2)))).toBeInTheDocument()
    expect(items[1]).toHaveTextContent('Пописал')
    expect(within(items[1]!).getByText(formatTime(atDay(1)))).toBeInTheDocument()
  })

  it('без записей показывает пустое состояние, а не ноль в списке', async () => {
    renderSection()

    expect(await screen.findByText('Записей ещё нет')).toBeInTheDocument()
    expect(screen.getByText('0 подгузников')).toBeInTheDocument()
    expect(screen.queryByRole('listitem')).toBeNull()
  })

  it('показывает только записи выбранного ребёнка', async () => {
    await diapers.add({ childId: CHILD_ID, at: atDay(1), type: 'pee' })
    await diapers.add({ childId: 'child-2', at: atDay(2), type: 'poop' })

    renderSection()

    expect(await screen.findByText('1 подгузник')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })
})
