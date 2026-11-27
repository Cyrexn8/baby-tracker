import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toaster } from 'sonner'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsProvider } from '../../lib/settings/SettingsProvider'
import { SettingsPage } from './SettingsPage'
import { childProfiles } from '../../lib/repositories'
import { backupFileName, buildBackup } from '../../lib/backup/backup'
import { clearDatabase } from '../../test/helpers'

// jsdom не умеет blob-ссылки: подменяем методы URL целиком (defineProperty
// не трогает restoreMocks из конфига, поэтому живёт весь файл).
const createObjectURL = vi.fn(() => 'blob:mock-url')
const revokeObjectURL = vi.fn()

beforeAll(() => {
  Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true, writable: true })
  Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true, writable: true })
})

// Клик по ссылке в jsdom вызывает навигацию, а spyOn-моки конфиг восстанавливает
// после каждого теста. Поэтому якоря собираем через пер-тестовый createElement:
// ссылка доходит до нас, и можно проверить имя файла.
const originalCreateElement = document.createElement.bind(document)
let createdLinks: HTMLAnchorElement[] = []

beforeEach(async () => {
  await clearDatabase()
  createdLinks = []
  vi.spyOn(document, 'createElement').mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
    const element = originalCreateElement(tagName, options)
    if (tagName === 'a') createdLinks.push(element as HTMLAnchorElement)
    return element
  }) as typeof document.createElement)
  createObjectURL.mockClear()
  revokeObjectURL.mockClear()
})

function renderPage() {
  return render(
    <>
      <SettingsProvider>
        <SettingsPage />
      </SettingsProvider>
      <Toaster />
    </>,
  )
}

/** Выбирает файл в скрытом input: jsdom умеет File и событие change. */
async function chooseFile(content: string) {
  const file = new File([content], 'copy.json', { type: 'application/json' })
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  fireEvent.change(input, { target: { files: [file] } })
  await waitFor(() => {
    // Поле сбрасывается после чтения — значит, чтение закончилось.
    expect(input.value).toBe('')
  })
}

describe('Резервная копия в настройках', () => {
  it('экспорт собирает копию и предлагает браузеру скачать файл', async () => {
    await childProfiles.add({ name: 'Соня', birthDate: '2026-01-10', avatarColor: '#d95d6e' })

    renderPage()
    await userEvent.setup().click(await screen.findByRole('button', { name: /Скачать копию/ }))

    // Ссылка создана с именем файла копии, а сообщение сообщило об успехе.
    await waitFor(() => expect(createdLinks.length).toBeGreaterThan(0))
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(createdLinks[0]?.download).toBe(backupFileName())
    expect(await screen.findByText('Копия скачана')).toBeInTheDocument()
  })

  it('некорректный файл показывает ошибку и не открывает подтверждение', async () => {
    renderPage()

    await chooseFile('{ не json }')

    // BackupError доходит до пользователя своим текстом.
    expect(await screen.findByText('Файл повреждён: не удалось прочитать JSON.')).toBeInTheDocument()

    // Подтверждение не открылось: панель без атрибута open (имя у закрытого
    // диалога aria не вычисляет, поэтому ищем по заголовку).
    const dialogTitle = screen.getByText('Загрузить копию?')
    expect(dialogTitle.closest('dialog')).not.toHaveAttribute('open')
  })

  it('после подтверждения копия импортируется в базу', async () => {
    // Готовим настоящую копию с ребёнком, затем чистим базу: импорт должен вернуть записи.
    await childProfiles.add({ name: 'Соня', birthDate: '2026-01-10', avatarColor: '#d95d6e' })
    const text = await buildBackup()
    await clearDatabase()

    renderPage()
    await chooseFile(text)

    // Подтверждение показывает дату копии и общее число записей (здесь — один ребёнок).
    // Открытие асинхронное: файл читается до setPending.
    const dialogTitle = screen.getByText('Загрузить копию?')
    const dialog = dialogTitle.closest('dialog')
    await waitFor(() => {
      expect(dialog).toHaveAttribute('open')
    })
    expect(dialog).toHaveTextContent('1 запись')
    expect(dialog).toHaveTextContent('Копия от')

    await userEvent.setup().click(within(dialog as HTMLElement).getByRole('button', { name: 'Загрузить' }))

    // Ребёнок вернулся в базу, пользователь увидел сводку.
    await waitFor(async () => {
      const children = await childProfiles.list()
      expect(children.map((child) => child.name)).toEqual(['Соня'])
    })
    expect(await screen.findByText('Добавлено 1 · Обновлено 0')).toBeInTheDocument()
  })
})
