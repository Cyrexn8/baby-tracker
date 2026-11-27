import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { DiaperFormSheet } from './DiaperFormSheet'
import { diapers } from '../../lib/repositories'
import { parseDateTimeInputValue } from '../../lib/time/format'
import { at, clearDatabase } from '../../test/helpers'
import type { Diaper } from '../../lib/db/schema'

const CHILD_ID = 'child-1'

/** В поле datetime-local браузер показывает свой календарь, поэтому ставим значение напрямую. */
function setTime(value: string) {
  fireEvent.change(screen.getByLabelText('Время'), { target: { value } })
}

describe('DiaperFormSheet', () => {
  beforeEach(async () => {
    await clearDatabase()
  })

  it('не принимает время в будущем', async () => {
    render(<DiaperFormSheet open onClose={() => {}} childId={CHILD_ID} />)

    setTime('2999-01-01T10:00')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Добавить' }))

    expect(await screen.findByText('Время не может быть в будущем')).toBeInTheDocument()
    expect(await diapers.listByChild(CHILD_ID)).toHaveLength(0)
  })

  it('требует указать время', async () => {
    render(<DiaperFormSheet open onClose={() => {}} childId={CHILD_ID} />)

    setTime('')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Добавить' }))

    expect(await screen.findByText('Укажите время')).toBeInTheDocument()
    expect(await diapers.listByChild(CHILD_ID)).toHaveLength(0)
  })

  it('добавляет запись за выбранное время с типом и заметкой', async () => {
    render(<DiaperFormSheet open onClose={() => {}} childId={CHILD_ID} />)
    const user = userEvent.setup()

    setTime('2026-01-10T09:30')
    await user.click(screen.getByRole('button', { name: 'Покакал' }))
    // В подпись поля Field добавляет пометку «· необязательно», поэтому ищем по части текста.
    await user.type(screen.getByLabelText(/Заметка/), 'После сна')
    await user.click(screen.getByRole('button', { name: 'Добавить' }))

    const rows = await waitFor(async () => {
      const list = await diapers.listByChild(CHILD_ID)
      expect(list).toHaveLength(1)
      return list
    })
    expect(rows[0]?.type).toBe('poop')
    expect(rows[0]?.note).toBe('После сна')
    expect(rows[0]?.at).toEqual(parseDateTimeInputValue('2026-01-10T09:30'))
  })

  it('при изменении показывает сохранённые значения и сохраняет правки', async () => {
    const original: Diaper = await diapers.add({
      childId: CHILD_ID,
      at: at(2026, 1, 10, 9, 30),
      type: 'pee',
    })
    render(<DiaperFormSheet open onClose={() => {}} childId={CHILD_ID} diaper={original} />)

    expect(screen.getByLabelText('Время')).toHaveValue('2026-01-10T09:30')
    expect(screen.getByRole('button', { name: 'Пописал' })).toHaveAttribute('aria-pressed', 'true')

    const user = userEvent.setup()
    setTime('2026-01-10T08:15')
    await user.click(screen.getByRole('button', { name: 'И то и другое' }))
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    const rows = await waitFor(async () => {
      const list = await diapers.listByChild(CHILD_ID)
      expect(list).toHaveLength(1)
      return list
    })
    expect(rows[0]?.type).toBe('both')
    expect(rows[0]?.at).toEqual(parseDateTimeInputValue('2026-01-10T08:15'))
    // Правится существующая запись, а не создаётся новая.
    expect(rows[0]?.id).toBe(original.id)
  })
})
