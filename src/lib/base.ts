/// <reference types="vite/client" />

/**
 * Адрес публикации задаётся в vite.config.ts (base): локально и на своём сервере — '/',
 * на GitHub Pages — '/baby-tracker/'. Роутер подставляет его сам (basename в
 * src/app/router.tsx), а вот прямые обращения браузера — <img src>,
 * window.location.assign, регистрация service worker — собираются через эти хелперы.
 */
export const BASE_URL = import.meta.env.BASE_URL

/** Адрес файла или страницы внутри приложения с учётом адреса публикации. */
export function withBase(path: string): string {
  return `${BASE_URL}${path.replace(/^\//, '')}`
}
