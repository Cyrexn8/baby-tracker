import { minutesBetween } from './duration'

/**
 * Таймер дольше 12 часов — почти наверняка «Проснулся» или «Завершить» забыли нажать.
 * Такой таймер не сохраняем молча: открываем форму изменения с концом «сейчас»,
 * чтобы время поправили (так ведут себя панели таймеров сна и кормлений).
 */
export const TIMER_LIMIT_MINUTES = 12 * 60

/** Таймер «забыт»: идёт дольше разумного, конец нужно уточнить в форме. */
export function isForgottenTimer(startAt: Date, now: Date): boolean {
  return minutesBetween(startAt, now) > TIMER_LIMIT_MINUTES
}
