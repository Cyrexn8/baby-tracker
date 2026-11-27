import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { MeasurementFormSheet } from './MeasurementFormSheet'
import { measurements } from '../../lib/repositories'
import { clearDatabase } from '../../test/helpers'

const CHILD_ID = 'child-1'

/** Поле даты браузер заполняет календарём, поэтому в тестах ставим значение напрямую. */
function setDate(value: string) {
  fireEvent.change(screen.getByLabelText(/Дата/), { target: { value } })
}

async function setNumber(label: RegExp, value: string) {
  await userEvent.setup().type(screen.getByLabelText(label), value)
}

describe('MeasurementFormSheet', () => {
  beforeEach(async () => {
    await clearDatabase()
  })

  it('не сохраняет без обоих чисел', async () => {
    render(<MeasurementFormSheet open onClose={() => {}} childId={CHILD_ID} />)

    setDate('2026-01-10')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Добавить' }))

    expect(await screen.findByText('Укажите вес или рост — хотя бы одно из двух')).toBeInTheDocument()
    expect(await measurements.listByChild(CHILD_ID)).toHaveLength(0)
  })

  it('не принимает дату в будущем', async () => {
    render(<MeasurementFormSheet open onClose={() => {}} childId={CHILD_ID} />)

    setDate('2999-01-01')
    await setNumber(/Вес/, '5,6')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Добавить' }))

    expect(await screen.findByText('Дата не может быть в будущем')).toBeInTheDocument()
    expect(await measurements.listByChild(CHILD_ID)).toHaveLength(0)
  })

  it('не принимает вес вне диапазона', async () => {
    render(<MeasurementFormSheet open onClose={() => {}} childId={CHILD_ID} />)

    setDate('2026-01-10')
    await setNumber(/Вес/, '40')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Добавить' }))

    expect(await screen.findByText('Вес от 0,1 до 30 кг')).toBeInTheDocument()
    expect(await measurements.listByChild(CHILD_ID)).toHaveLength(0)
  })

  it('сохраняет вес с запятой и рост', async () => {
    render(<MeasurementFormSheet open onClose={() => {}} childId={CHILD_ID} />)
    const user = userEvent.setup()

    setDate('2026-01-10')
    await setNumber(/Вес/, '5,6')
    await setNumber(/Рост/, '58')
    await user.type(screen.getByLabelText(/Заметка/), 'Плановый осмотр')
    await user.click(screen.getByRole('button', { name: 'Добавить' }))

    const rows = await waitFor(async () => {
      const list = await measurements.listByChild(CHILD_ID)
      expect(list).toHaveLength(1)
      return list
    })
    expect(rows[0]?.measuredOn).toBe('2026-01-10')
    expect(rows[0]?.weightKg).toBeCloseTo(5.6)
    expect(rows[0]?.heightCm).toBe(58)
    expect(rows[0]?.note).toBe('Плановый осмотр')
  })

  it('при изменении показывает сохранённые значения и сохраняет правки', async () => {
    const original = await measurements.add({
      childId: CHILD_ID,
      measuredOn: '2026-01-10',
      weightKg: 5.6,
      heightCm: null,
    })
    render(<MeasurementFormSheet open onClose={() => {}} childId={CHILD_ID} measurement={original} />)

    expect(screen.getByLabelText(/Дата/)).toHaveValue('2026-01-10')
    expect(screen.getByLabelText(/Вес/)).toHaveValue('5,6')

    await userEvent.setup().clear(screen.getByLabelText(/Вес/))
    await setNumber(/Вес/, '6,1')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Сохранить' }))

    const rows = await waitFor(async () => {
      const list = await measurements.listByChild(CHILD_ID)
      expect(list).toHaveLength(1)
      return list
    })
    expect(rows[0]?.weightKg).toBeCloseTo(6.1)
    // Правится существующая запись, а не создаётся новая.
    expect(rows[0]?.id).toBe(original.id)
  })
})
