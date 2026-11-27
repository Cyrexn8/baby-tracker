import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChildForm } from './ChildForm'
import { AVATAR_COLORS, AVATAR_COLOR_LABELS } from '../../lib/colors'

const SUBMIT = 'Добавить'

async function fillName(name: string) {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Имя'), name)
}

function setBirthDate(value: string) {
  // В поле даты браузер показывает свой календарь, поэтому ставим значение напрямую.
  fireEvent.change(screen.getByLabelText('Дата рождения'), { target: { value } })
}

describe('ChildForm', () => {
  it('не отправляет пустую форму и поясняет, что заполнить', async () => {
    const onSubmit = vi.fn()
    render(<ChildForm onSubmit={onSubmit} submitLabel={SUBMIT} />)

    await userEvent.setup().click(screen.getByRole('button', { name: SUBMIT }))

    expect(await screen.findByText('Введите имя')).toBeInTheDocument()
    expect(screen.getByText('Укажите дату рождения')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('отправляет имя без лишних пробелов, дату и выбранный цвет', async () => {
    const onSubmit = vi.fn()
    render(<ChildForm onSubmit={onSubmit} submitLabel={SUBMIT} />)

    await fillName('  Соня  ')
    setBirthDate('2026-02-15')
    await userEvent.setup().click(screen.getByRole('radio', { name: `Цвет: ${AVATAR_COLOR_LABELS[AVATAR_COLORS[3]]}` }))
    await userEvent.setup().click(screen.getByRole('button', { name: SUBMIT }))

    // Вторым аргументом react-hook-form передаёт событие отправки — его не проверяем.
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({
      name: 'Соня',
      birthDate: '2026-02-15',
      avatarColor: AVATAR_COLORS[3],
    })
  })

  it('не принимает дату рождения в будущем', async () => {
    const onSubmit = vi.fn()
    render(<ChildForm onSubmit={onSubmit} submitLabel={SUBMIT} />)

    await fillName('Соня')
    setBirthDate('2999-01-01')
    await userEvent.setup().click(screen.getByRole('button', { name: SUBMIT }))

    expect(await screen.findByText('Дата не может быть в будущем')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('ограничивает длину имени', async () => {
    const onSubmit = vi.fn()
    render(<ChildForm onSubmit={onSubmit} submitLabel={SUBMIT} />)

    await fillName('а'.repeat(61))
    setBirthDate('2026-02-15')
    await userEvent.setup().click(screen.getByRole('button', { name: SUBMIT }))

    expect(await screen.findByText('Не длиннее 60 символов')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('при редактировании показывает сохранённые значения', () => {
    render(
      <ChildForm
        child={{
          id: 'child-1',
          createdAt: new Date(0),
          updatedAt: new Date(0),
          deletedAt: null,
          name: 'Соня',
          birthDate: '2026-02-15',
          avatarColor: AVATAR_COLORS[2],
        }}
        onSubmit={vi.fn()}
        submitLabel="Сохранить"
      />,
    )

    expect(screen.getByLabelText('Имя')).toHaveValue('Соня')
    expect(screen.getByLabelText('Дата рождения')).toHaveValue('2026-02-15')
    expect(screen.getByRole('radio', { name: `Цвет: ${AVATAR_COLOR_LABELS[AVATAR_COLORS[2]]}` })).toBeChecked()
  })

  it('по умолчанию выбран первый цвет', () => {
    render(<ChildForm onSubmit={vi.fn()} submitLabel={SUBMIT} />)

    expect(screen.getByRole('radio', { name: `Цвет: ${AVATAR_COLOR_LABELS[AVATAR_COLORS[0]]}` })).toBeChecked()
  })

  it('кнопка отмены появляется, только если передать onCancel', () => {
    const onCancel = vi.fn()
    const view = render(<ChildForm onSubmit={vi.fn()} submitLabel={SUBMIT} onCancel={onCancel} />)

    expect(screen.getByRole('button', { name: 'Отмена' })).toBeInTheDocument()

    view.unmount()
    render(<ChildForm onSubmit={vi.fn()} submitLabel={SUBMIT} />)
    expect(screen.queryByRole('button', { name: 'Отмена' })).toBeNull()
  })

  it('сообщение об ошибке связано с полем для скринридеров', async () => {
    render(<ChildForm onSubmit={vi.fn()} submitLabel={SUBMIT} />)

    await userEvent.setup().click(screen.getByRole('button', { name: SUBMIT }))
    const error = await screen.findByText('Введите имя')

    expect(screen.getByLabelText('Имя')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Имя')).toHaveAccessibleDescription('Введите имя')
    expect(error).toHaveAttribute('role', 'alert')
  })
})

