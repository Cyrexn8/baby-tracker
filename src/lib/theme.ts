/**
 * Оформление приложения. Значение дублируется в localStorage (ключ `THEME_STORAGE_KEY`),
 * чтобы встроенный скрипт в index.html применял тему до первой отрисовки.
 */
export type Theme = 'system' | 'light' | 'dark'

export const THEME_STORAGE_KEY = 'bt.theme'

export const THEMES: readonly Theme[] = ['system', 'light', 'dark']

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value)
}

export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Ставит или снимает класс `dark` с <html> и запоминает выбор в localStorage. */
export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', resolveTheme(theme) === 'dark')
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // localStorage недоступен (приватный режим) — тема применится только на эту сессию.
  }
}

/**
 * Сообщает об изменении системной темы, пока слушатель активен.
 * Возвращает функцию, которая убирает слушатель.
 */
export function watchSystemTheme(onChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const query = window.matchMedia('(prefers-color-scheme: dark)')
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}
