/**
 * Service worker приложения.
 *
 * - Кэширует файлы сборки: приложение открывается без интернета.
 * - Обрабатывает push и клик по уведомлению — заготовка на будущее: пока приложение
 *   работает без сервера, напоминания приходят только из открытой вкладки
 *   (см. src/lib/notifications/notifications.ts).
 * - Не перезагружает страницу при выходе новой версии: ждёт согласия пользователя.
 *
 * Собирается через injectManifest: список файлов подставляет vite-plugin-pwa.
 */
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { clientsClaim } from 'workbox-core'

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

clientsClaim()

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Приложение одностраничное: любой адрес (/settings, /reminders…) показывает index.html.
// Без этого правила переход по адресу искал бы в кэше файл с таким именем и уходил в сеть —
// и без интернета открывалась бы только главная.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

// Обновлённая версия ждёт согласия пользователя: страница присылает SKIP_WAITING,
// когда тот нажимает «Обновить» в сообщении о новой версии (см. src/main.tsx).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') void self.skipWaiting()
})

interface PushPayload {
  title: string
  body?: string
  /** Адрес страницы, которую открыть по клику. */
  url?: string
}

const NOTIFICATION_ICON = '/icons/icon-192.png'
const REMINDERS_PATH = '/reminders'

self.addEventListener('push', (event) => {
  const payload = readPushPayload(event)
  if (!payload) return

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: NOTIFICATION_ICON,
      tag: 'reminder',
      data: { url: payload.url ?? REMINDERS_PATH },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data as { url?: string } | undefined
  event.waitUntil(openOrFocus(data?.url ?? REMINDERS_PATH))
})

/** Сервер присылает JSON: { title, body?, url? }. Нечитаемое сообщение игнорируется. */
function readPushPayload(event: PushEvent): PushPayload | null {
  try {
    const data: unknown = event.data?.json()
    if (!data || typeof data !== 'object') return null
    const { title, body, url } = data as Partial<PushPayload>
    if (typeof title !== 'string' || !title) return null
    return { title, body, url }
  } catch {
    return null
  }
}

/** Поднимает открытое окно приложения или открывает новое. */
async function openOrFocus(path: string): Promise<void> {
  const target = new URL(path, self.location.origin).href
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  const existing = windows.find((client) => new URL(client.url).origin === self.location.origin)
  if (existing) {
    await existing.focus()
    return
  }
  await self.clients.openWindow(target)
}
