import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast, Toaster } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DiaperQuickAdd } from './DiaperQuickAdd'
import { diapers } from '../../lib/repositories'
import { todayKey } from '../../lib/time/day'
import { clearDatabase } from '../../test/helpers'
import type { Diaper } from '../../lib/db/schema'

const CHILD_ID = 'child-1'

function listToday(): Promise<Diaper[]> {
  return diapers.listForDay(CHILD_ID, todayKey())
}

describe('DiaperQuickAdd', () => {
  beforeEach(async () => {
    await clearDatabase()
    // Хранилище всплывающих сообщений общее между тестами: без этого в панель
    // сообщений попадут тосты прошлых тестов, и «Отменить» найдётся не один раз.
    toast.dismiss()
  })

  it('нажатие сразу создаёт запись «сейчас» с выбранным типом', async () => {
    render(<DiaperQuickAdd childId={CHILD_ID} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Покакал' }))

    const rows = await waitFor(async () => {
      const list = await listToday()
      expect(list).toHaveLength(1)
      return list
    })
    expect(rows[0]?.type).toBe('poop')
    expect(rows[0]?.childId).toBe(CHILD_ID)
    // Запись ставится на момент нажатия: допускаем секунды на работу теста.
    expect(Date.now() - rows[0]!.at.getTime()).toBeLessThan(5000)
  })

  it('пока запись сохраняется, кнопки недоступны и повторное нажатие не создаёт вторую', async () => {
    let resolveAdd: (value: Diaper) => void = () => {}
    const addSpy = vi
      .spyOn(diapers, 'add')
      .mockImplementationOnce(
        () =>
          new Promise<Diaper>((resolve) => {
            resolveAdd = resolve
          }),
      )

    render(<DiaperQuickAdd childId={CHILD_ID} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Пописал' }))
    expect(addSpy).toHaveBeenCalledTimes(1)
    // Сохранение ещё идёт: недоступны все три кнопки.
    expect(screen.getByRole('button', { name: 'Пописал' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Покакал' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'И то и другое' })).toBeDisabled()

    // Двойное нажатие по другой кнопке тоже не проходит.
    await user.click(screen.getByRole('button', { name: 'Покакал' }))
    expect(addSpy).toHaveBeenCalledTimes(1)

    resolveAdd({
      id: 'diaper-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      childId: CHILD_ID,
      at: new Date(),
      type: 'pee',
      note: '',
    })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Пописал' })).toBeEnabled())
  })

  it('кнопка «Отменить» в сообщении удаляет только что созданную запись', async () => {
    render(
      <>
        <DiaperQuickAdd childId={CHILD_ID} />
        <Toaster />
      </>,
    )
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Пописал' }))
    await waitFor(async () => {
      expect(await listToday()).toHaveLength(1)
    })

    // Кнопка действия тоста в sonner ловит pointerdown, которого нет в jsdom,
    // поэтому нажимаем простым событием click: обработчик тот же.
    fireEvent.click(await screen.findByRole('button', { name: 'Отменить' }))
    await waitFor(async () => {
      expect(await listToday()).toHaveLength(0)
    })
  })
})
