import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { SleepFormSheet } from './SleepFormSheet'
import { sleepSessions } from '../../lib/repositories'
import { parseDateTimeInputValue } from '../../lib/time/format'
import { clearDatabase } from '../../test/helpers'

const CHILD_ID = 'child-1'

/** Поле datetime-local браузер заполняет календарём, поэтому в тестах ставим значение напрямую. */
function setTime(label: RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

describe('SleepFormSheet', () => {
  beforeEach(async () => {
    await clearDatabase()
  })

  it('не принимает конец раньше начала', async () => {
    render(<SleepFormSheet open onClose={() => {}} childId={CHILD_ID} />)

    setTime(/Начало/, '2026-01-10T09:00')
    setTime(/Конец/, '2026-01-10T08:00')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Добавить' }))

    expect(await screen.findByText('Конец должен быть позже начала')).toBeInTheDocument()
    expect(await sleepSessions.listByChild(CHILD_ID)).toHaveLength(0)
  })

  it('не принимает начало в будущем', async () => {
    render(<SleepFormSheet open onClose={() => {}} childId={CHILD_ID} />)

    setTime(/Начало/, '2999-01-01T10:00')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Добавить' }))

    expect(await screen.findByText('Время не может быть в будущем')).toBeInTheDocument()
    expect(await sleepSessions.listByChild(CHILD_ID)).toHaveLength(0)
  })

  it('сохраняет сон за выбранное время с заметкой', async () => {
    render(<SleepFormSheet open onClose={() => {}} childId={CHILD_ID} />)
    const user = userEvent.setup()

    setTime(/Начало/, '2026-01-10T09:00')
    setTime(/Конец/, '2026-01-10T10:30')
    // В подпись поля Field добавляет пометку «· необязательно», поэтому ищем по части текста.
    await user.type(screen.getByLabelText(/Заметка/), 'После прогулки')
    await user.click(screen.getByRole('button', { name: 'Добавить' }))

    const rows = await waitFor(async () => {
      const list = await sleepSessions.listByChild(CHILD_ID)
      expect(list).toHaveLength(1)
      return list
    })
    expect(rows[0]?.startAt).toEqual(parseDateTimeInputValue('2026-01-10T09:00'))
    expect(rows[0]?.endAt).toEqual(parseDateTimeInputValue('2026-01-10T10:30'))
    expect(rows[0]?.note).toBe('После прогулки')
    expect(rows[0]?.source).toBe('manual')
  })

  it('пустой конец означает «сон ещё идёт»', async () => {
    render(<SleepFormSheet open onClose={() => {}} childId={CHILD_ID} />)

    setTime(/Начало/, '2026-01-10T09:00')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Добавить' }))

    const rows = await waitFor(async () => {
      const list = await sleepSessions.listByChild(CHILD_ID)
      expect(list).toHaveLength(1)
      return list
    })
    expect(rows[0]?.endAt).toBeNull()
    // В базе запись считается идущим сном.
    expect(await sleepSessions.getRunning(CHILD_ID)).toBeDefined()
  })
})
