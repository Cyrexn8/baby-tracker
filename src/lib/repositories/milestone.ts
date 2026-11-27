import { db } from '../db/db'
import type { Milestone } from '../db/schema'
import { byChild, createEntityRepository, type EntityRepository } from './base'

export interface MilestoneInput {
  childId: string
  title: string
  /** 'YYYY-MM-DD' */
  date: string
  categoryId?: string | null
  note?: string
  /** id записи в таблице `files`. */
  photoId?: string | null
}

export interface MilestoneRepository extends EntityRepository<Milestone> {
  /** События ребёнка от новых к старым. */
  listByChild(childId: string): Promise<Milestone[]>
  add(input: MilestoneInput): Promise<Milestone>
}

function newestFirst(rows: Milestone[]): Milestone[] {
  return [...rows].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.getTime() - a.createdAt.getTime(),
  )
}

async function listByChild(childId: string): Promise<Milestone[]> {
  return newestFirst(await byChild(db.milestones, childId).toArray())
}

const base = createEntityRepository(db.milestones)

export const milestones: MilestoneRepository = {
  ...base,
  listByChild,
  add: (input) =>
    base.create({
      childId: input.childId,
      title: input.title,
      date: input.date,
      categoryId: input.categoryId ?? null,
      note: input.note ?? '',
      photoId: input.photoId ?? null,
    }),
}
