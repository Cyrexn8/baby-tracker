import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { MilestoneFormSheet } from './MilestoneFormSheet'
import { milestones } from '../../lib/repositories'
import { clearDatabase } from '../../test/helpers'

const CHILD_ID = 'child-1'

/** Поле даты браузер заполняет календарём, поэтому в тестах ставим значение напрямую. */
function setDate(value: string) {
  fireEvent.change(screen.getByLabelText(/Дата/), { target: { value } })
}

describe('MilestoneFormSheet', () => {
  beforeEach(async () => {
    await clearDatabase()
  })

  it('не сохраняет без названия', async () => {
    render(<MilestoneFormSheet open onClose={() => {}} childId={CHILD_ID} />)

    setDate('2026-04-15')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Добавить' }))

    expect(await screen.findByText('Введите название')).toBeInTheDocument()
    expect(await milestones.listByChild(CHILD_ID)).toHaveLength(0)
  })

  it('не принимает дату в будущем', async () => {
    render(<MilestoneFormSheet open onClose={() => {}} childId={CHILD_ID} />)

    await userEvent.setup().type(screen.getByLabelText(/Название/), 'Первый шаг')
    setDate('2999-01-01')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Добавить' }))

    expect(await screen.findByText('Дата не может быть в будущем')).toBeInTheDocument()
    expect(await milestones.listByChild(CHILD_ID)).toHaveLength(0)
  })

  it('сохраняет название, дату, категорию и заметку', async () => {
    render(<MilestoneFormSheet open onClose={() => {}} childId={CHILD_ID} />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText(/Название/), '  Первый шаг  ')
    setDate('2026-04-15')
    // В подпись Field добавляет пометку «· необязательно», поэтому ищем по части текста.
    await user.type(screen.getByLabelText(/Заметка/), 'Три шага до дивана')
    await user.click(screen.getByRole('button', { name: 'Добавить' }))

    const rows = await waitFor(async () => {
      const list = await milestones.listByChild(CHILD_ID)
      expect(list).toHaveLength(1)
      return list
    })
    expect(rows[0]?.title).toBe('Первый шаг')
    expect(rows[0]?.date).toBe('2026-04-15')
    // Категорию не выбирали: осталась «Другое» по умолчанию.
    expect(rows[0]?.categoryId).toBe('other')
    expect(rows[0]?.note).toBe('Три шага до дивана')
    expect(rows[0]?.photoId).toBeNull()
  })
})
