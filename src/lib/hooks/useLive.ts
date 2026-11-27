import { useLiveQuery } from 'dexie-react-hooks'
import type { DependencyList } from 'react'

export interface LiveResult<T> {
  /** Результат запроса; `undefined`, пока идёт первое чтение или оно завершилось ошибкой. */
  data: T | undefined
  /** Идёт первое чтение после смены зависимостей. */
  loading: boolean
  /** Ошибка чтения из базы или `undefined`. */
  error: unknown
}

type Loaded<T> = { ok: true; data: T } | { ok: false; error: unknown }

/**
 * Подписка на запрос к базе: перечитывает данные при каждом их изменении.
 *
 * Внутри `querier` обращайтесь к репозиториям — они читают базу через Dexie,
 * и тогда компонент обновится сам. Зависимости (`deps`) работают как в useEffect:
 * id ребёнка, границы дня и тому подобное нужно перечислить.
 *
 * Пока `loading` равно true, `data` ещё не готово — покажите заглушку.
 */
export function useLive<T>(querier: () => Promise<T> | T, deps: DependencyList = []): LiveResult<T> {
  const result = useLiveQuery<Loaded<T>>(() => {
    let query: Promise<T> | T
    try {
      query = querier()
    } catch (error) {
      return Promise.resolve({ ok: false, error })
    }
    return Promise.resolve(query).then(
      (data): Loaded<T> => ({ ok: true, data }),
      (error: unknown): Loaded<T> => ({ ok: false, error }),
    )
  }, [...deps])

  return {
    data: result?.ok ? result.data : undefined,
    error: result && !result.ok ? result.error : undefined,
    loading: result === undefined,
  }
}
