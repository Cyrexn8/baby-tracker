import type { Diaper, Feeding, SleepSession } from '../../lib/db/schema'
import { diapers as diapersRepo, feedings as feedingsRepo, sleepSessions } from '../../lib/repositories'
import { useLive } from '../../lib/hooks/useLive'
import { DEFAULT_DAY_START_HOUR, type DayKey } from '../../lib/time/day'

export interface DayEntries {
  sleep: SleepSession[]
  feedings: Feeding[]
  diapers: Diaper[]
  loading: boolean
}

/**
 * Записи одного дня сразу из трёх таблиц — для итоговых карточек на «Сегодня».
 * Один запрос вместо трёх: querier читает все таблицы за раз, поэтому на уровень
 * страницы приходится по одному чтению на таблицу, а не по три.
 *
 * Разделы ниже держат свои запросы (это готовые компоненты со своими списками),
 * поэтому их данные не передать сюда без переделки — итоги читают базу сами.
 */
export function useDayEntries(
  childId: string | null | undefined,
  dayKey: DayKey,
  dayStartHour = DEFAULT_DAY_START_HOUR,
): DayEntries {
  const { data, loading } = useLive(async () => {
    if (!childId) return { sleep: [], feedings: [], diapers: [] }
    // Репозитории переименованы, чтобы не конфликтовать с полями результата.
    const [sleep, feedings, diapers] = await Promise.all([
      sleepSessions.listForDay(childId, dayKey, dayStartHour),
      feedingsRepo.listForDay(childId, dayKey, dayStartHour),
      diapersRepo.listForDay(childId, dayKey, dayStartHour),
    ])
    return { sleep, feedings, diapers }
  }, [childId, dayKey, dayStartHour])

  return {
    sleep: data?.sleep ?? [],
    feedings: data?.feedings ?? [],
    diapers: data?.diapers ?? [],
    loading,
  }
}
