import type { Child } from '../db/schema'
import { db } from '../db/db'
import type { AvatarColor } from '../colors'
import { createId } from '../id'
import { now } from '../clock'
import { createEntityRepository, type EntityRepository } from './base'

export interface ChildInput {
  name: string
  /** 'YYYY-MM-DD' */
  birthDate: string
  avatarColor: AvatarColor
}

export interface ChildRepository extends EntityRepository<Child> {
  /** В порядке добавления. */
  list(): Promise<Child[]>
  /** Создаёт ребёнка и возвращает готовую запись (с id и временем создания). */
  add(input: ChildInput): Promise<Child>
  /** Удаляет ребёнка вместе со всеми его записями (мягкое удаление). */
  removeWithContent(id: string): Promise<void>
}

async function list(): Promise<Child[]> {
  const rows = await db.children.filter((row) => row.deletedAt === null).toArray()
  return rows.sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.name.localeCompare(b.name),
  )
}

async function add(input: ChildInput): Promise<Child> {
  const time = now()
  const row: Child = {
    ...input,
    id: createId(),
    createdAt: time,
    updatedAt: time,
    deletedAt: null,
  }
  await db.children.add(row)
  return row
}

async function removeWithContent(id: string): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.children,
      db.sleepSessions,
      db.feedings,
      db.diapers,
      db.measurements,
      db.milestones,
      db.files,
      db.reminders,
    ],
    async () => {
      const child = await db.children.get(id)
      if (!child || child.deletedAt !== null) return
      const time = now()
      const changes = { deletedAt: time, updatedAt: time }

      await db.children.update(id, changes)
      await db.sleepSessions.where('childId').equals(id).modify(changes)
      await db.feedings.where('childId').equals(id).modify(changes)
      await db.diapers.where('childId').equals(id).modify(changes)
      await db.measurements.where('childId').equals(id).modify(changes)
      // Напоминания «для всех» (childId === null) остаются.
      await db.reminders.where('childId').equals(id).modify(changes)

      // Вместе с событиями удаляются их фотографии.
      const milestones = await db.milestones.where('childId').equals(id).toArray()
      await db.milestones.where('childId').equals(id).modify(changes)
      const photoIds = milestones.map((m) => m.photoId).filter((photoId): photoId is string => !!photoId)
      for (const photoId of photoIds) await db.files.update(photoId, changes)
    },
  )
}

export const childProfiles: ChildRepository = {
  ...createEntityRepository(db.children),
  list,
  create: add,
  add,
  removeWithContent,
}
