import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { GrowthPage } from './GrowthPage'
import { measurements } from '../../lib/repositories'
import { clearDatabase } from '../../test/helpers'

const CHILD_ID = 'child-1'

// У ResponsiveContainer в jsdom нет ResizeObserver: подставляем пустышку,
// чтобы график монтировался без ошибок (рисовать его в jsdom всё равно нечем).
if (typeof window.ResizeObserver === 'undefined') {
  Object.defineProperty(window, 'ResizeObserver', {
    value: class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
    configurable: true,
  })
}

function renderPage() {
  return render(<GrowthPage childId={CHILD_ID} />)
}

describe('GrowthPage', () => {
  beforeEach(async () => {
    await clearDatabase()
  })

  it('при одном измерении поясняет, что графика не будет, и показывает запись', async () => {
    await measurements.add({ childId: CHILD_ID, measuredOn: '2026-05-12', weightKg: 5.6 })

    renderPage()

    expect(await screen.findByText('Нужно хотя бы два измерения')).toBeInTheDocument()
    expect(screen.getByText('12 мая 2026 г.')).toBeInTheDocument()
    expect(screen.getByText('5,6 кг')).toBeInTheDocument()
  })

  it('показывает измерения новыми сверху, график вместо пояснения и их число', async () => {
    await measurements.add({ childId: CHILD_ID, measuredOn: '2026-05-12', weightKg: 5.6, heightCm: 58 })
    await measurements.add({ childId: CHILD_ID, measuredOn: '2026-06-12', weightKg: 6.1, heightCm: 60 })
    await measurements.add({ childId: CHILD_ID, measuredOn: '2026-07-12', weightKg: null, heightCm: 62 })

    renderPage()

    // Пояснение исчезло: точек достаточно для линии.
    expect(await screen.findByRole('figure', { name: 'График веса и роста по датам' })).toBeInTheDocument()
    expect(screen.queryByText('Нужно хотя бы два измерения')).toBeNull()

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(within(items[0]!).getByText('12 июля 2026 г.')).toBeInTheDocument()
    expect(within(items[0]!).getByText('62 см')).toBeInTheDocument()
    expect(within(items[1]!).getByText('12 июня 2026 г.')).toBeInTheDocument()
    expect(within(items[2]!).getByText('12 мая 2026 г.')).toBeInTheDocument()
  })

  it('удаляет измерение после подтверждения', async () => {
    const saved = await measurements.add({ childId: CHILD_ID, measuredOn: '2026-05-12', weightKg: 5.6 })
    renderPage()

    await userEvent
      .setup()
      .click(await screen.findByRole('button', { name: `Удалить измерение за 12 мая 2026 г.` }))
    // Строковое name в getByRole совпадает целиком: «Удалить» найдёт только кнопку подтверждения.
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Удалить' }))

    await waitFor(async () => {
      await expect(measurements.get(saved.id)).resolves.toBeUndefined()
    })
  })
})
