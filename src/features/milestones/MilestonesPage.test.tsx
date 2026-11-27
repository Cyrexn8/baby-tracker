import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { MilestonesPage } from './MilestonesPage'
import { milestones } from '../../lib/repositories'
import { clearDatabase } from '../../test/helpers'

const CHILD_ID = 'child-1'
const BIRTH_DATE = '2026-01-10'

function renderPage() {
  return render(<MilestonesPage childId={CHILD_ID} birthDate={BIRTH_DATE} />)
}

describe('MilestonesPage', () => {
  beforeEach(async () => {
    await clearDatabase()
  })

  it('показывает пустое состояние, пока событий нет', async () => {
    renderPage()

    expect(await screen.findByText('Событий ещё нет')).toBeInTheDocument()
    expect(screen.queryByRole('listitem')).toBeNull()
  })

  it('показывает ленту от новых к старым с датой, возрастом и категорией', async () => {
    // Сначала старое, потом новое: сверху должно оказаться новое.
    await milestones.add({ childId: CHILD_ID, title: 'Первая улыбка', date: '2026-02-10', categoryId: 'first-smile' })
    await milestones.add({
      childId: CHILD_ID,
      title: 'Первый шаг',
      date: '2026-04-15',
      categoryId: 'first-step',
      note: 'Три шага до дивана',
    })

    renderPage()

    expect(await screen.findByText('Первый шаг')).toBeInTheDocument()
    expect(screen.getByText('Первая улыбка')).toBeInTheDocument()
    expect(screen.getByText('Три шага до дивана')).toBeInTheDocument()

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[0]!).getByText('Первый шаг')).toBeInTheDocument()
    // Дата события и возраст на этот день: 15 апреля при рождении 10 января — «3 месяца 5 дней».
    expect(within(items[0]!).getByText('15 апреля 2026 г. · 3 месяца 5 дней')).toBeInTheDocument()
    // Категория озвучивается скринридерам скрытым текстом (с точкой, в отличие от заголовка).
    expect(within(items[0]!).getByText('Первый шаг.')).toBeInTheDocument()
    expect(within(items[1]!).getByText('Первая улыбка.')).toBeInTheDocument()
  })

  it('неизвестная категория из старой записи показывается как «Другое»', async () => {
    const saved = await milestones.add({ childId: CHILD_ID, title: 'Хоббихорстинг', date: '2026-03-01' })
    // Кладём несуществующий id напрямую в обновление — как будто категория удалили из списка.
    await milestones.update(saved.id, { categoryId: 'vanished-category' })

    renderPage()

    expect(await screen.findByText('Хоббихорстинг')).toBeInTheDocument()
    expect(screen.getByText('Другое.')).toBeInTheDocument()
  })

  it('удаляет событие после подтверждения', async () => {
    const saved = await milestones.add({ childId: CHILD_ID, title: 'Первая улыбка', date: '2026-02-10' })
    renderPage()

    await userEvent.setup().click(await screen.findByRole('button', { name: 'Удалить «Первая улыбка»' }))
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Удалить' }))

    await waitFor(async () => {
      await expect(milestones.get(saved.id)).resolves.toBeUndefined()
    })
  })
})
