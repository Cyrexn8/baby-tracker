/**
 * Единая точка доступа к данным. Компоненты и хуки работают с базой только отсюда.
 *
 * Все записи удаляются мягко (`remove` ставит `deletedAt`), поэтому у репозиториев
 * нет метода физического удаления, кроме служебных случаев.
 */
export { createEntityRepository, byChild, newestFirst } from './base'
export type { EntityRepository, EntityPatch, NewEntity } from './base'

export { childProfiles, type ChildRepository, type ChildInput } from './children'
export { sleepSessions, type SleepRepository, type SleepSessionInput } from './sleep'
export { feedings, type FeedingRepository, type FeedingInput } from './feeding'
export { diapers, type DiaperRepository, type DiaperInput } from './diaper'
export { measurements, type MeasurementRepository, type MeasurementInput } from './measurement'
export { milestones, type MilestoneRepository, type MilestoneInput } from './milestone'
export { files, type FileRepository } from './files'
export { reminders, type ReminderRepository, type ReminderInput } from './reminders'
export {
  reminderCompletions,
  type ReminderCompletionRepository,
} from './reminderCompletions'
export { settingsRepository, type Settings } from './settings'
