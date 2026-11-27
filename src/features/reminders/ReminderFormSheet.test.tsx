import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ReminderFormSheet } from './ReminderFormSheet'
import { reminders } from '../../lib/repositories'
import { clearDatabase } from '../../test/helpers'

/** Поля даты и времени браузер заполняет своими календарями, поэтому ставим значения напрямую. */
function setInput(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

async function pickKind(label: string) {
  await userEvent.setup().click(screen.getByRole('button', { name: label }))
}

describe('ReminderFormSheet', () => {
  beforeEach(async () => {
    await clearDatabase()
  })

  it('разовое прошедшее время не проходит', async () => {
    render(<ReminderFormSheet open onClose={() => {}} />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/Название/), 'Позвонить бабушке')
    await pickKind('Разово')
    // По умолчанию вкладка «Каждый день», поэтому поля разового появляются после переключения.
    setInput(/Когда/, '2026-01-01T10:00')
    await user.click(screen.getByRole('button', { name: 'Добавить' }))

    expect(await screen.findByText('Разовое напоминание должно быть в будущем')).toBeInTheDocument()
    expect(await reminders.list()).toHaveLength(0)
  })

  it('«По дням» без дней не проходит', async () => {
    render(<ReminderFormSheet open onClose={() => {}} />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/Название/), 'Прогулка')
    await pickKind('По дням')
    setInput(/Время/, '10:00')
    await user.click(screen.getByRole('button', { name: 'Добавить' }))

    expect(await screen.findByText('Выберите хотя бы один день')).toBeInTheDocument()
    expect(await reminders.list()).toHaveLength(0)
  })

  it('интервал 0 и 1000 минут не проходит', async () => {
    render(<ReminderFormSheet open onClose={() => {}} />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/Название/), 'Пить воду')
    await pickKind('Интервал')
    // Начало уже подставлено «сейчас», проверяем только диапазон минут.
    const minutes = screen.getByLabelText(/Каждые N минут/)
    await user.type(minutes, '0')
    await user.click(screen.getByRole('button', { name: 'Добавить' }))
    expect(await screen.findByText('От 1 до 720 минут')).toBeInTheDocument()

    await user.clear(minutes)
    await user.type(minutes, '1000')
    await user.click(screen.getByRole('button', { name: 'Добавить' }))
    expect(await screen.findByText('От 1 до 720 минут')).toBeInTheDocument()

    expect(await reminders.list()).toHaveLength(0)
  })

  it('корректное ежедневное создаёт запись с правилом и «Для всех»', async () => {
    render(<ReminderFormSheet open onClose={() => {}} />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/Название/), 'Упражнения')
    setInput(/Время/, '10:00')
    await user.click(screen.getByRole('button', { name: 'Добавить' }))

    const rows = await waitFor(async () => {
      const list = await reminders.list()
      expect(list).toHaveLength(1)
      return list
    })
    expect(rows[0]?.rule).toEqual({ kind: 'daily', time: '10:00' })
    // «Для всех» — childId пустой в форме, null в записи.
    expect(rows[0]?.childId).toBeNull()
    expect(rows[0]?.active).toBe(true)
    expect(rows[0]?.title).toBe('Упражнения')
  })
})
