import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { SettingsProvider } from '../../lib/settings/SettingsProvider'
import { HistoryPage } from './HistoryPage'
import { childProfiles, diapers, feedings, sleepSessions } from '../../lib/repositories'
import { addDaysToKey, dayStart, todayKey } from '../../lib/time/day'
import { formatDayMonth } from '../../lib/time/format'
import { clearDatabase, HOUR_MS } from '../../test/helpers'

const BIRTH_DATE = '2026-01-10'

// Активного ребёнка берут из настроек: запоминаем фактический id после добавления.
let CHILD_ID = ''

// Страница читает активного ребёнка и час начала дня — нужен поставщик настроек.
function renderPage() {
  return render(
    <SettingsProvider>
      <HistoryPage />
    </SettingsProvider>,
  )
}

/** Момент внутри текущего «дня малыша» (час после 6:00) — границы дня не страшны. */
function atToday(offsetHours: number): Date {
  return new Date(dayStart(todayKey()).getTime() + offsetHours * HOUR_MS)
}

/** Момент внутри вчерашнего «дня малыша». */
function atYesterday(offsetHours: number): Date {
  return new Date(dayStart(addDaysToKey(todayKey(), -1)).getTime() + offsetHours * HOUR_MS)
}

describe('HistoryPage', () => {
  beforeEach(async () => {
    await clearDatabase()
    const child = await childProfiles.add({ name: 'Соня', birthDate: BIRTH_DATE, avatarColor: '#d95d6e' })
    CHILD_ID = child.id
  })

  it('показывает сводку и списки выбранного дня', async () => {
    await sleepSessions.add({
      childId: CHILD_ID,
      startAt: atToday(1),
      endAt: new Date(atToday(1).getTime() + 90 * 60000),
    })
    await feedings.add({ childId: CHILD_ID, type: 'bottle', startAt: atToday(2), amountMl: 120 })
    await diapers.add({ childId: CHILD_ID, at: atToday(3), type: 'pee' })

    renderPage()

    // Сводка по aria-label: слово «Кормления» есть и в заголовке секции — без label было бы неоднозначно.
    const summary = await screen.findByLabelText('Сводка за день')
    expect(summary).toHaveTextContent('Сон 1 ч 30 мин')
    expect(summary).toHaveTextContent('Кормления 1 · 120 мл')
    expect(summary).toHaveTextContent('Подгузники 1')

    // Списки разделов показывают записи: интервал в строке склеен с длительностью,
    // поэтому ищем по подстроке.
    expect(screen.getByText('07:00 – 08:30', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('Бутылочка · 120 мл')).toBeInTheDocument()
    expect(screen.getByText('Пописал')).toBeInTheDocument()
  })

  it('в пустом дне поясняет, что записей нет', async () => {
    await diapers.add({ childId: CHILD_ID, at: atToday(1), type: 'pee' })

    renderPage()

    // Появились записи за сегодня — переключаемся на вчера, где ничего нет.
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Вчера' }))

    expect(await screen.findByText('В этот день записей нет')).toBeInTheDocument()
    // Списков и сводки за пустой день нет.
    expect(screen.queryByText(/Подгузники/)).toBeNull()
  })

  it('таблица недели показывает итоги по дням от выбранного назад', async () => {
    // Сегодня: короткий сон. Вчера: час сна.
    await sleepSessions.add({
      childId: CHILD_ID,
      startAt: atToday(1),
      endAt: new Date(atToday(1).getTime() + 30 * 60000),
    })
    await sleepSessions.add({
      childId: CHILD_ID,
      startAt: atYesterday(1),
      endAt: new Date(atYesterday(1).getTime() + 60 * 60000),
    })

    renderPage()

    const table = await screen.findByText('За 7 дней')
    expect(table).toBeInTheDocument()

    // Строки таблицы: у вчерашнего дня час сна, у сегодняшнего — 30 минут.
    // Итоги едут живым запросом, поэтому значение ждём отдельно от строки.
    const yesterdayRow = screen.getByText(formatDayMonth(atYesterday(1))).closest('li')
    expect(yesterdayRow).not.toBeNull()
    await waitFor(() => {
      expect(within(yesterdayRow!).getByText('1 ч')).toBeInTheDocument()
    })
    const todayRow = screen.getByText(formatDayMonth(atToday(1))).closest('li')
    expect(todayRow).not.toBeNull()
    await waitFor(() => {
      expect(within(todayRow!).getByText('30 мин')).toBeInTheDocument()
    })
  })

  it('открывает готовую форму изменения для записи дня', async () => {
    await sleepSessions.add({
      childId: CHILD_ID,
      startAt: atToday(1),
      endAt: new Date(atToday(1).getTime() + 60 * 60000),
    })

    renderPage()

    const startTime = `${atToday(1).getHours().toString().padStart(2, '0')}:${atToday(1)
      .getMinutes()
      .toString()
      .padStart(2, '0')}`
    await userEvent
      .setup()
      .click(await screen.findByRole('button', { name: `Изменить сон, начавшийся в ${startTime}` }))

    // Форма из раздела сна: изменение, а не создание.
    expect(await screen.findByText('Изменить сон')).toBeInTheDocument()

    // Правим конец в форме — список истории обновится сам, панель закроется.
    await userEvent.setup().click(screen.getByRole('button', { name: 'Сохранить' }))
    await waitFor(() => {
      expect(screen.queryByLabelText(/Начало/)).toBeNull()
    })
  })

  it('удаление записи дня идёт через подтверждение', async () => {
    const saved = await diapers.add({ childId: CHILD_ID, at: atToday(1), type: 'pee' })

    renderPage()

    const time = `${atToday(1).getHours().toString().padStart(2, '0')}:${atToday(1)
      .getMinutes()
      .toString()
      .padStart(2, '0')}`
    await userEvent.setup().click(await screen.findByRole('button', { name: `Удалить запись за ${time}` }))

    const dialog = screen.getByRole('dialog', { name: 'Удалить запись?' })
    expect(dialog).toHaveAttribute('open')
    await userEvent.setup().click(within(dialog).getByRole('button', { name: 'Удалить' }))

    await waitFor(async () => {
      await expect(diapers.get(saved.id)).resolves.toBeUndefined()
    })
  })
})
