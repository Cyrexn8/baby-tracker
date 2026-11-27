import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { FeedingFormSheet } from './FeedingFormSheet'
import { feedings } from '../../lib/repositories'
import { parseDateTimeInputValue } from '../../lib/time/format'
import { clearDatabase } from '../../test/helpers'

const CHILD_ID = 'child-1'

/** Поле datetime-local браузер заполняет календарём, поэтому в тестах ставим значение напрямую. */
function setTime(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

describe('FeedingFormSheet', () => {
  beforeEach(async () => {
    await clearDatabase()
  })

  it('бутылочка: не принимает объём 0 и пустой объём', async () => {
    render(<FeedingFormSheet open onClose={() => {}} childId={CHILD_ID} type="bottle" />)
    const user = userEvent.setup()

    setTime(/Начало/, '2026-01-10T09:00')
    await user.type(screen.getByLabelText(/Объём/), '0')
    await user.click(screen.getByRole('button', { name: 'Добавить' }))
    expect(await screen.findByText('Объём от 1 до 1000 мл')).toBeInTheDocument()
    expect(await feedings.listByChild(CHILD_ID)).toHaveLength(0)

    await user.clear(screen.getByLabelText(/Объём/))
    await user.click(screen.getByRole('button', { name: 'Добавить' }))
    expect(await screen.findByText('Укажите объём')).toBeInTheDocument()
    expect(await feedings.listByChild(CHILD_ID)).toHaveLength(0)
  })

  it('бутылочка: сохраняет объём и содержимое', async () => {
    render(<FeedingFormSheet open onClose={() => {}} childId={CHILD_ID} type="bottle" />)
    const user = userEvent.setup()

    setTime(/Начало/, '2026-01-10T09:00')
    await user.type(screen.getByLabelText(/Объём/), '120')
    await user.type(screen.getByLabelText(/Что в бутылочке/), 'Смесь')
    await user.click(screen.getByRole('button', { name: 'Добавить' }))

    const rows = await waitFor(async () => {
      const list = await feedings.listByChild(CHILD_ID)
      expect(list).toHaveLength(1)
      return list
    })
    expect(rows[0]?.type).toBe('bottle')
    expect(rows[0]?.amountMl).toBe(120)
    expect(rows[0]?.food).toBe('Смесь')
    expect(rows[0]?.startAt).toEqual(parseDateTimeInputValue('2026-01-10T09:00'))
  })

  it('прикорм: не сохраняет без блюда, с блюдом — сохраняет и реакцию', async () => {
    render(<FeedingFormSheet open onClose={() => {}} childId={CHILD_ID} type="solid" />)
    const user = userEvent.setup()

    setTime(/Начало/, '2026-01-10T12:00')
    await user.click(screen.getByRole('button', { name: 'Добавить' }))
    expect(await screen.findByText('Укажите блюдо')).toBeInTheDocument()
    expect(await feedings.listByChild(CHILD_ID)).toHaveLength(0)

    await user.type(screen.getByLabelText(/Блюдо/), 'Кабачок')
    // Подписи реакций в переключателе — со строчной, как в строках списка.
    await user.click(screen.getByRole('button', { name: 'понравилось' }))
    await user.click(screen.getByRole('button', { name: 'Добавить' }))

    const rows = await waitFor(async () => {
      const list = await feedings.listByChild(CHILD_ID)
      expect(list).toHaveLength(1)
      return list
    })
    expect(rows[0]?.type).toBe('solid')
    expect(rows[0]?.food).toBe('Кабачок')
    expect(rows[0]?.reaction).toBe('liked')
  })

  it('грудь: не принимает конец раньше начала', async () => {
    render(<FeedingFormSheet open onClose={() => {}} childId={CHILD_ID} type="breast" />)

    setTime(/Начало/, '2026-01-10T09:00')
    setTime(/Конец/, '2026-01-10T08:30')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Добавить' }))

    expect(await screen.findByText('Конец должен быть позже начала')).toBeInTheDocument()
    expect(await feedings.listByChild(CHILD_ID)).toHaveLength(0)
  })

  it('грудь: пустой конец означает «кормление ещё идёт»', async () => {
    render(<FeedingFormSheet open onClose={() => {}} childId={CHILD_ID} type="breast" />)

    setTime(/Начало/, '2026-01-10T09:00')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Правая' }))
    await userEvent.setup().click(screen.getByRole('button', { name: 'Добавить' }))

    const rows = await waitFor(async () => {
      const list = await feedings.listByChild(CHILD_ID)
      expect(list).toHaveLength(1)
      return list
    })
    expect(rows[0]?.type).toBe('breast')
    expect(rows[0]?.side).toBe('right')
    expect(rows[0]?.endAt).toBeNull()
    // В базе запись считается идущим кормлением.
    expect(await feedings.getRunning(CHILD_ID)).toBeDefined()
  })
})
