import { plural } from '../plural'

const MS_PER_MINUTE = 60_000

/** Целое число полных минут от `from` до `to`. Перевёрнутый интервал даёт 0. */
export function minutesBetween(from: Date, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / MS_PER_MINUTE))
}

/** '2 ч 15 мин', '45 мин', '1 ч' — компактная запись для интерфейса. */
export function formatDuration(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes))
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} мин`
  return rest === 0 ? `${hours} ч` : `${hours} ч ${rest} мин`
}

/** '2 часа 15 минут', '45 минут' — для предложений. */
export function formatDurationLong(totalMinutes: number): string {
  const minutes = Math.max(0, Math.round(totalMinutes))
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  const parts: string[] = []
  if (hours > 0) parts.push(`${hours} ${plural(hours, 'час', 'часа', 'часов')}`)
  if (rest > 0 || hours === 0) parts.push(`${rest} ${plural(rest, 'минута', 'минуты', 'минут')}`)
  return parts.join(' ')
}

/** '0:42', '1:05:09' — идущие секунды для таймера. */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  const mm = String(minutes).padStart(2, '0')
  const ss = String(rest).padStart(2, '0')
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${minutes}:${ss}`
}
