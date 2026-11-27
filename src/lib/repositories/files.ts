import { db } from '../db/db'
import type { StoredFile } from '../db/schema'
import { createEntityRepository, type EntityRepository } from './base'

export interface FileRepository extends EntityRepository<StoredFile> {
  /** Сохраняет байты файла и возвращает запись с id. */
  add(data: ArrayBuffer, meta: { name: string; mimeType: string }): Promise<StoredFile>
  /** Даёт временный URL для <img>. Не забудьте отозвать через URL.revokeObjectURL. */
  toObjectUrl(file: StoredFile): string
}

const base = createEntityRepository(db.files)

export const files: FileRepository = {
  ...base,
  add: (data, meta) => base.create({ data, name: meta.name, mimeType: meta.mimeType }),
  toObjectUrl: (file) => URL.createObjectURL(new Blob([file.data], { type: file.mimeType })),
}
