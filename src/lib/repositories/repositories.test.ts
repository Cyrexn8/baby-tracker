import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db'
import {
  childProfiles,
  diapers,
  feedings,
  files,
  measurements,
  milestones,
  reminderCompletions,
  reminders,
  settingsRepository,
  sleepSessions,
} from './index'
import { at, clearDatabase } from '../../test/helpers'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

const INPUT = { name: 'Соня', birthDate: '2026-02-15', avatarColor: '#d95d6e' } as const

/** Даёт двум записям разные createdAt: иначе порядок «в порядке добавления» не проверить. */
async function addOrderedChildren(): Promise<[string, string]> {
  const first = await childProfiles.add({ ...INPUT, name: 'Вторая' })
  const second = await childProfiles.add({ ...INPUT, name: 'Первая' })
  await db.children.update(first.id, { createdAt: at(2026, 5, 1) })
  await db.children.update(second.id, { createdAt: at(2026, 5, 2) })
  return [first.id, second.id]
}

describe('children', () => {
  beforeEach(clearDatabase)

  it('add заполняет id и служебные поля', async () => {
    const child = await childProfiles.add(INPUT)

    expect(child.id).toMatch(UUID)
    expect(child.createdAt).toBeInstanceOf(Date)
    expect(child.updatedAt).toEqual(child.createdAt)
    expect(child.deletedAt).toBeNull()
    expect(child.name).toBe('Соня')
  })

  it('list возвращает в порядке добавления', async () => {
    const [firstId, secondId] = await addOrderedChildren()

    const list = await childProfiles.list()

    expect(list.map((child) => child.id)).toEqual([firstId, secondId])
  })

  it('update меняет поля и обновляет updatedAt', async () => {
    const child = await childProfiles.add(INPUT)

    const updated = await childProfiles.update(child.id, { name: 'Сонечка' })

    expect(updated.name).toBe('Сонечка')
    expect(updated.birthDate).toBe('2026-02-15')
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(child.updatedAt.getTime())
    expect((await childProfiles.get(child.id))?.name).toBe('Сонечка')
  })

  it('update несуществующей записи бросает ошибку', async () => {
    await expect(childProfiles.update('нет-такой', { name: 'x' })).rejects.toThrow()
  })

  it('remove скрывает запись, но не стирает из базы', async () => {
    const child = await childProfiles.add(INPUT)

    await childProfiles.remove(child.id)

    expect(await childProfiles.list()).toEqual([])
    expect(await childProfiles.get(child.id)).toBeUndefined()
    expect((await db.children.get(child.id))?.deletedAt).toBeInstanceOf(Date)
  })

  it('remove повторно не ошибка', async () => {
    const child = await childProfiles.add(INPUT)
    await childProfiles.remove(child.id)
    await expect(childProfiles.remove(child.id)).resolves.toBeUndefined()
  })

  it('removeWithContent удаляет все записи ребёнка вместе с фотографией события', async () => {
    const child = await childProfiles.add(INPUT)
    await sleepSessions.add({ childId: child.id, startAt: at(2026, 5, 12, 23) })
    await feedings.add({ childId: child.id, type: 'bottle', startAt: at(2026, 5, 13, 7) })
    await diapers.add({ childId: child.id, at: at(2026, 5, 13, 8), type: 'pee' })
    await measurements.add({ childId: child.id, measuredOn: '2026-05-13', weightKg: 4.2 })
    const photo = await files.add(new ArrayBuffer(4), { name: 'a.jpg', mimeType: 'image/jpeg' })
    await milestones.add({ childId: child.id, title: 'Улыбка', date: '2026-05-13', photoId: photo.id })
    const own = await reminders.add({ childId: child.id, title: 'Витамин D', rule: { kind: 'daily', time: '09:00' } })
    await reminderCompletions.markDone(own.id, at(2026, 5, 13, 9))

    await childProfiles.removeWithContent(child.id)

    for (const repository of [sleepSessions, feedings, diapers, measurements, milestones, files]) {
      expect(await repository.list()).toEqual([])
    }
    expect(await reminders.list()).toEqual([])
    // Сами строки остались в базе с отметкой удаления.
    expect(await db.sleepSessions.count()).toBe(1)
    expect((await db.files.get(photo.id))?.deletedAt).toBeInstanceOf(Date)
  })

  it('removeWithContent не трогает записи другого ребёнка и общие напоминания', async () => {
    const sonya = await childProfiles.add(INPUT)
    const misha = await childProfiles.add({ ...INPUT, name: 'Миша', avatarColor: '#2e75b5' })
    await diapers.add({ childId: sonya.id, at: at(2026, 5, 13, 8), type: 'pee' })
    await diapers.add({ childId: misha.id, at: at(2026, 5, 13, 9), type: 'poop' })
    const common = await reminders.add({ childId: null, title: 'Упражнения', rule: { kind: 'daily', time: '10:00' } })

    await childProfiles.removeWithContent(sonya.id)

    expect((await childProfiles.list()).map((child) => child.name)).toEqual(['Миша'])
    expect((await diapers.list()).every((diaper) => diaper.childId === misha.id)).toBe(true)
    expect((await reminders.list()).map((reminder) => reminder.id)).toEqual([common.id])
  })

  it('removeWithContent повторно ничего не делает', async () => {
    const child = await childProfiles.add(INPUT)
    await childProfiles.removeWithContent(child.id)
    await expect(childProfiles.removeWithContent(child.id)).resolves.toBeUndefined()
  })
})

describe('sleepSessions', () => {
  beforeEach(clearDatabase)

  it('start запускает таймер, stop останавливает', async () => {
    const child = await childProfiles.add(INPUT)

    const started = await sleepSessions.start(child.id, at(2026, 5, 13, 12))
    expect(started.endAt).toBeNull()
    expect(started.source).toBe('timer')
    expect((await sleepSessions.getRunning(child.id))?.id).toBe(started.id)

    const stopped = await sleepSessions.stop(started.id, at(2026, 5, 13, 13, 30))
    expect(stopped.endAt).toEqual(at(2026, 5, 13, 13, 30))
    expect(await sleepSessions.getRunning(child.id)).toBeUndefined()
  })

  it('stop для уже законченного сна ничего не меняет', async () => {
    const child = await childProfiles.add(INPUT)
    const session = await sleepSessions.add({ childId: child.id, startAt: at(2026, 5, 13, 12), endAt: at(2026, 5, 13, 13) })

    const again = await sleepSessions.stop(session.id, at(2026, 5, 13, 20))

    expect(again.endAt).toEqual(at(2026, 5, 13, 13))
  })

  it('stop несуществующего сна бросает ошибку', async () => {
    await expect(sleepSessions.stop('нет-такого')).rejects.toThrow()
  })

  it('add подставляет значения по умолчанию', async () => {
    const child = await childProfiles.add(INPUT)

    const session = await sleepSessions.add({ childId: child.id, startAt: at(2026, 5, 13, 12) })

    expect(session).toMatchObject({ endAt: null, note: '', source: 'manual' })
  })

  it('listForDay относит ночной сон к дню начала', async () => {
    const child = await childProfiles.add(INPUT)
    const lateEvening = await sleepSessions.add({
      childId: child.id,
      startAt: at(2026, 5, 12, 23, 30),
      endAt: at(2026, 5, 13, 6, 30),
    })
    const earlyMorning = await sleepSessions.add({ childId: child.id, startAt: at(2026, 5, 13, 7), endAt: at(2026, 5, 13, 8) })

    const sessions = await sleepSessions.listForDay(child.id, '2026-05-12')

    expect(sessions.map((session) => session.id)).toEqual([lateEvening.id])
    expect((await sleepSessions.listForDay(child.id, '2026-05-13')).map((session) => session.id)).toEqual([earlyMorning.id])
  })

  it('listOverlapping находит пересекающиеся сны, включая идущий', async () => {
    const child = await childProfiles.add(INPUT)
    const before = await sleepSessions.add({ childId: child.id, startAt: at(2026, 5, 13, 6), endAt: at(2026, 5, 13, 7) })
    const crossing = await sleepSessions.add({ childId: child.id, startAt: at(2026, 5, 13, 9), endAt: at(2026, 5, 13, 11) })
    const running = await sleepSessions.start(child.id, at(2026, 5, 13, 15))

    const sessions = await sleepSessions.listOverlapping(child.id, { from: at(2026, 5, 13, 10), to: at(2026, 5, 13, 20) })

    expect(sessions.map((session) => session.id)).toEqual([running.id, crossing.id])
    expect(sessions.map((session) => session.id)).not.toContain(before.id)
  })

  it('записи другого ребёнка не попадают в выборку', async () => {
    const sonya = await childProfiles.add(INPUT)
    const misha = await childProfiles.add({ ...INPUT, name: 'Миша', avatarColor: '#2e75b5' })
    await sleepSessions.add({ childId: misha.id, startAt: at(2026, 5, 13, 12) })

    expect(await sleepSessions.listByChild(sonya.id)).toEqual([])
    expect(await sleepSessions.getRunning(sonya.id)).toBeUndefined()
  })
})

describe('feedings', () => {
  beforeEach(clearDatabase)

  it('add подставляет значения по умолчанию', async () => {
    const child = await childProfiles.add(INPUT)

    const feeding = await feedings.add({ childId: child.id, type: 'bottle', startAt: at(2026, 5, 13, 7) })

    expect(feeding).toMatchObject({
      endAt: null,
      side: null,
      amountMl: null,
      food: null,
      reaction: null,
      note: '',
    })
  })

  it('getRunning находит только идущее грудное кормление', async () => {
    const child = await childProfiles.add(INPUT)
    await feedings.add({ childId: child.id, type: 'bottle', startAt: at(2026, 5, 13, 7) })
    const breast = await feedings.add({ childId: child.id, type: 'breast', startAt: at(2026, 5, 13, 8), side: 'left' })

    expect((await feedings.getRunning(child.id))?.id).toBe(breast.id)

    await feedings.update(breast.id, { endAt: at(2026, 5, 13, 8, 20) })
    expect(await feedings.getRunning(child.id)).toBeUndefined()
  })

  it('listForDay и listInRange отбирают по началу кормления', async () => {
    const child = await childProfiles.add(INPUT)
    await feedings.add({ childId: child.id, type: 'solid', startAt: at(2026, 5, 12, 23), food: 'кабачок' })
    const today = await feedings.add({ childId: child.id, type: 'solid', startAt: at(2026, 5, 13, 12), food: 'тыква' })

    expect((await feedings.listForDay(child.id, '2026-05-13')).map((feeding) => feeding.id)).toEqual([today.id])
    expect(
      (await feedings.listInRange(child.id, { from: at(2026, 5, 13), to: at(2026, 5, 14) })).map((feeding) => feeding.id),
    ).toEqual([today.id])
  })
})

describe('diapers', () => {
  beforeEach(clearDatabase)

  it('add и выборки за день и за промежуток', async () => {
    const child = await childProfiles.add(INPUT)
    const lateEvening = await diapers.add({ childId: child.id, at: at(2026, 5, 12, 23), type: 'pee' })
    const earlyMorning = await diapers.add({ childId: child.id, at: at(2026, 5, 13, 5), type: 'poop' })
    const midday = await diapers.add({ childId: child.id, at: at(2026, 5, 13, 12), type: 'both', note: 'много' })

    expect(midday.note).toBe('много')
    expect(lateEvening.note).toBe('')
    expect((await diapers.listForDay(child.id, '2026-05-12')).map((diaper) => diaper.id)).toEqual([earlyMorning.id, lateEvening.id])
    expect((await diapers.listInRange(child.id, { from: at(2026, 5, 13), to: at(2026, 5, 14) })).map((diaper) => diaper.id)).toEqual([
      midday.id,
      earlyMorning.id,
    ])
  })
})

describe('measurements и milestones', () => {
  beforeEach(clearDatabase)

  it('измерения идут по возрастанию даты', async () => {
    const child = await childProfiles.add(INPUT)
    const may = await measurements.add({ childId: child.id, measuredOn: '2026-05-13', weightKg: 4.2 })
    const april = await measurements.add({ childId: child.id, measuredOn: '2026-04-13', heightCm: 53 })

    const list = await measurements.listByChild(child.id)

    expect(list.map((measurement) => measurement.id)).toEqual([april.id, may.id])
    expect(april.weightKg).toBeNull()
    expect(may.heightCm).toBeNull()
  })

  it('события идут от новых к старым', async () => {
    const child = await childProfiles.add(INPUT)
    const smile = await milestones.add({ childId: child.id, title: 'Улыбка', date: '2026-05-13' })
    const tooth = await milestones.add({ childId: child.id, title: 'Первый зуб', date: '2026-08-01', categoryId: 'teeth' })

    const list = await milestones.listByChild(child.id)

    expect(list.map((milestone) => milestone.id)).toEqual([tooth.id, smile.id])
    expect(smile).toMatchObject({ categoryId: null, note: '', photoId: null })
  })
})

describe('files', () => {
  beforeEach(clearDatabase)

  it('сохраняет и возвращает байты', async () => {
    const bytes = new Uint8Array([1, 2, 3, 250]).buffer as ArrayBuffer

    const file = await files.add(bytes, { name: 'photo.jpg', mimeType: 'image/jpeg' })
    const loaded = await files.get(file.id)

    expect(loaded?.name).toBe('photo.jpg')
    expect(loaded?.mimeType).toBe('image/jpeg')
    expect(Array.from(new Uint8Array(loaded!.data!))).toEqual([1, 2, 3, 250])
  })
})

describe('reminders', () => {
  beforeEach(clearDatabase)

  const DAILY = { kind: 'daily', time: '10:00' } as const

  it('add включает напоминание и очищает перенос', async () => {
    const reminder = await reminders.add({ childId: null, title: 'Упражнения', rule: DAILY })

    expect(reminder).toMatchObject({ active: true, snoozedUntil: null, note: '' })
  })

  it('listActive не возвращает выключенные и удалённые', async () => {
    const on = await reminders.add({ childId: null, title: 'Включено', rule: DAILY })
    const off = await reminders.add({ childId: null, title: 'Выключено', rule: DAILY, active: false })
    const deleted = await reminders.add({ childId: null, title: 'Удалено', rule: DAILY })
    await reminders.remove(deleted.id)

    const list = await reminders.listActive()

    expect(list.map((reminder) => reminder.id)).toEqual([on.id])
    expect((await reminders.get(off.id))?.title).toBe('Выключено')
  })

  it('setSnooze ставит и сбрасывает перенос', async () => {
    const reminder = await reminders.add({ childId: null, title: 'Упражнения', rule: DAILY })

    await reminders.setSnooze(reminder.id, at(2026, 5, 13, 10, 30))
    expect((await reminders.get(reminder.id))?.snoozedUntil).toEqual(at(2026, 5, 13, 10, 30))

    await reminders.setSnooze(reminder.id, null)
    expect((await reminders.get(reminder.id))?.snoozedUntil).toBeNull()
  })

  it('setSnooze несуществующего напоминания бросает ошибку', async () => {
    await expect(reminders.setSnooze('нет-такого', null)).rejects.toThrow()
  })

  it('markDone не создаёт дубль, unmarkDone снимает отметку', async () => {
    const reminder = await reminders.add({ childId: null, title: 'Упражнения', rule: DAILY })
    const dueAt = at(2026, 5, 13, 10)

    const first = await reminderCompletions.markDone(reminder.id, dueAt, at(2026, 5, 13, 10, 5))
    const second = await reminderCompletions.markDone(reminder.id, dueAt, at(2026, 5, 13, 10, 9))

    expect(second.id).toBe(first.id)
    expect(second.doneAt).toEqual(at(2026, 5, 13, 10, 5))
    expect(await reminderCompletions.listForReminders([reminder.id])).toHaveLength(1)

    await reminderCompletions.unmarkDone(reminder.id, dueAt)
    expect(await reminderCompletions.listForReminders([reminder.id])).toEqual([])
    // Повторное снятие — не ошибка.
    await expect(reminderCompletions.unmarkDone(reminder.id, dueAt)).resolves.toBeUndefined()
  })

  it('listRelevant берёт свежие отметки и всю историю указанных напоминаний', async () => {
    const once = await reminders.add({ childId: null, title: 'Разовое', rule: { kind: 'once', at: at(2026, 5, 1, 9) } })
    const daily = await reminders.add({ childId: null, title: 'Ежедневное', rule: DAILY })
    const old = await reminderCompletions.markDone(once.id, at(2026, 5, 1, 9))
    const fresh = await reminderCompletions.markDone(daily.id, at(2026, 5, 13, 10))
    await reminderCompletions.markDone(daily.id, at(2026, 5, 12, 10))

    const relevant = await reminderCompletions.listRelevant(at(2026, 5, 13, 6), [once.id])

    expect(relevant.map((completion) => completion.id).sort()).toEqual([old.id, fresh.id].sort())
  })
})

describe('settings', () => {
  beforeEach(clearDatabase)

  it('по умолчанию — системная тема и день с 6:00', async () => {
    expect(await settingsRepository.get()).toEqual(settingsRepository.DEFAULTS)
  })

  it('set сохраняет, get читает', async () => {
    await settingsRepository.set('theme', 'dark')
    await settingsRepository.set('dayStartHour', 4)
    await settingsRepository.setMany({ lastFeedingTab: 'breast', activeChildId: 'child-1' })

    expect(await settingsRepository.get()).toEqual({
      ...settingsRepository.DEFAULTS,
      theme: 'dark',
      dayStartHour: 4,
      lastFeedingTab: 'breast',
      activeChildId: 'child-1',
    })
  })

  it('set отбрасывает недопустимое значение', async () => {
    await expect(settingsRepository.set('theme', 'neon' as never)).rejects.toThrow()
    await expect(settingsRepository.set('dayStartHour', 99)).rejects.toThrow()
    await expect(settingsRepository.set('onboardingDone', 'да' as never)).rejects.toThrow()
  })

  it('get игнорирует испорченные значения в базе', async () => {
    await db.settings.bulkPut([
      { key: 'theme', value: 'neon' },
      { key: 'onboardingDone', value: true },
      { key: 'dayStartHour', value: 'утро' },
      { key: 'unknown-key', value: 1 },
    ])

    expect(await settingsRepository.get()).toEqual({ ...settingsRepository.DEFAULTS, onboardingDone: true })
  })

  it('reset возвращает значения по умолчанию', async () => {
    await settingsRepository.set('theme', 'dark')
    await settingsRepository.reset()
    expect(await settingsRepository.get()).toEqual(settingsRepository.DEFAULTS)
  })
})
