import { db } from '../db/db'
import type { Measurement } from '../db/schema'
import { byChild, createEntityRepository, type EntityRepository } from './base'

export interface MeasurementInput {
  childId: string
  /** 'YYYY-MM-DD' */
  measuredOn: string
  weightKg?: number | null
  heightCm?: number | null
  note?: string
}

export interface MeasurementRepository extends EntityRepository<Measurement> {
  /** Все измерения ребёнка по возрастанию даты. */
  listByChild(childId: string): Promise<Measurement[]>
  add(input: MeasurementInput): Promise<Measurement>
}

function byDateAscending(rows: Measurement[]): Measurement[] {
  return [...rows].sort(
    (a, b) => a.measuredOn.localeCompare(b.measuredOn) || a.createdAt.getTime() - b.createdAt.getTime(),
  )
}

async function listByChild(childId: string): Promise<Measurement[]> {
  return byDateAscending(await byChild(db.measurements, childId).toArray())
}

const base = createEntityRepository(db.measurements)

export const measurements: MeasurementRepository = {
  ...base,
  listByChild,
  add: (input) =>
    base.create({
      childId: input.childId,
      measuredOn: input.measuredOn,
      weightKg: input.weightKg ?? null,
      heightCm: input.heightCm ?? null,
      note: input.note ?? '',
    }),
}
