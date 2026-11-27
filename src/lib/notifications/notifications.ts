/**
 * Системные уведомления, которые показывает само открытое приложение.
 *
 * Это НЕ push: уведомление появляется, только пока вкладка или установленное
 * приложение запущены. Push при закрытом приложении появится вместе с сервером:
 * заготовка обработчика лежит в src/sw.ts.
 */

import { BASE_URL, withBase } from '../base'

export type NotificationSupport = NotificationPermission | 'unsupported'

export interface LocalNotification {
  title: string
  body?: string
  /** Адрес страницы, которую нужно открыть по клику. */
  url?: string
  /** Одинаковым `tag` браузер заменяет предыдущее уведомление вместо накопления. */
  tag?: string
}

const ICON = withBase('icons/icon-192.png')

export function notificationSupport(): NotificationSupport {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

/** Просит у пользователя разрешение на уведомления. Спрашивать нужно в момент, когда он создаёт напоминание. */
export async function requestNotificationPermission(): Promise<NotificationSupport> {
  if (typeof Notification === 'undefined') return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

/** Показывает уведомление. Возвращает `false`, если разрешения нет или показать не удалось. */
export async function showLocalNotification(notification: LocalNotification): Promise<boolean> {
  if (notificationSupport() !== 'granted') return false

  // Адрес публикации учитываем здесь: service worker (sw.ts) и прямой переход по клику
  // получают готовый путь — под подпутём GitHub Pages иначе попали бы на корень сайта.
  const url = notification.url ? withBase(notification.url) : BASE_URL

  const options = {
    body: notification.body,
    icon: ICON,
    tag: notification.tag,
    data: { url },
  }

  try {
    // Через service worker уведомление переживает перезагрузку вкладки и корректно обрабатывает клик.
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration(BASE_URL)
      if (registration) {
        await registration.showNotification(notification.title, options)
        return true
      }
    }
    if (typeof Notification === 'undefined') return false
    const systemNotification = new Notification(notification.title, options)
    systemNotification.onclick = () => openUrl(url)
    return true
  } catch {
    return false
  }
}

function openUrl(url: string): void {
  window.focus()
  window.location.assign(url)
}
