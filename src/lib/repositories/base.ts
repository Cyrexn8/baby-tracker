import type { Collection, Table } from 'dexie'
import type { BaseEntity, ChildEntity } from '../db/schema'
import { createId } from '../id'
import { now } from '../clock'

export type { TimeRange } from '../time/day'

/** Данные новой записи без служебных полей: их база заполняет сама. */
export type NewEntity<T extends BaseEntity> = Omit<T, keyof BaseEntity>

/** Часть полей записи для изменения. */
export type EntityPatch<T extends BaseEntity> = Partial<Omit<T, keyof BaseEntity>>

export interface EntityRepository<T extends BaseEntity> {
  /** Все неудалённые записи. */
  list(): Promise<T[]>
  /** Запись по id. Удалённая запись считается отсутствующей. */
  get(id: string): Promise<T | undefined>
  create(input: NewEntity<T>): Promise<T>
  /** Бросает ошибку, если записи нет. */
  update(id: string, patch: EntityPatch<T>): Promise<T>
  /** Мягкое удаление: запись скрывается, но остаётся в базе для синхронизации. */
  remove(id: string): Promise<void>
}

export function createEntityRepository<T extends BaseEntity>(
  table: Table<T, string>,
): EntityRepository<T> {
  async function list(): Promise<T[]> {
    return table.filter((row) => row.deletedAt === null).toArray()
  }

  async function get(id: string): Promise<T | undefined> {
    const row = await table.get(id)
    return row && row.deletedAt === null ? row : undefined
  }

  async function create(input: NewEntity<T>): Promise<T> {
    const time = now()
    const row = { ...input, id: createId(), createdAt: time, updatedAt: time, deletedAt: null } as T
    await table.add(row)
    return row
  }

  async function update(id: string, patch: EntityPatch<T>): Promise<T> {
    const existing = await get(id)
    if (!existing) throw new Error(`Запись не найдена: ${id}`)
    const next = { ...existing, ...patch, id, updatedAt: now() } as T
    await table.put(next)
    return next
  }

  async function remove(id: string): Promise<void> {
    const existing = await get(id)
    if (!existing) return
    const time = now()
    await table.put({ ...existing, deletedAt: time, updatedAt: time } as T)
  }

  return { list, get, create, update, remove }
}

/** Неудалённые записи таблицы, принадлежащие ребёнку. */
export function byChild<T extends ChildEntity>(table: Table<T, string>, childId: string): Collection<T, string> {
  return table.where('childId').equals(childId).and((row) => row.deletedAt === null)
}

/** Отдаёт записи в обратном порядке: новые сверху. */
export function newestFirst<T extends { startAt: Date }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.startAt.getTime() - a.startAt.getTime())
}
