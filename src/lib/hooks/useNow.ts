import { useEffect, useState } from 'react'

/**
 * Текущее время, обновляется каждые `intervalMs`.
 * Обновляется и при возврате на вкладку: в фоне браузер замедляет таймеры.
 */
export function useNow(intervalMs: number): Date {
  const [time, setTime] = useState(() => new Date())

  useEffect(() => {
    const tick = () => setTime(new Date())
    const timer = window.setInterval(tick, intervalMs)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [intervalMs])

  return time
}
