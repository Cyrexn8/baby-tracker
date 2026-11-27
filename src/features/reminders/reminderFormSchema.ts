import { z } from 'zod'
import { parseDateTimeInputValue } from '../../lib/time/format'

/** Заметка не важна для дневника, ограничиваем её, чтобы не раздувать записи. */
const MAX_NOTE_LENGTH = 500
const MAX_EVERY_MINUTES = 720

const titleField = z.string().trim().min(1, 'Введите название').max(120, 'Не длиннее 120 символов')
const noteField = z.string().trim().max(MAX_NOTE_LENGTH, `Не длиннее ${MAX_NOTE_LENGTH} символов`)
const timeField = z.string().regex(/^\d{2}:\d{2}$/, 'Укажите время')

// Значения полей datetime-local: 'YYYY-MM-DDTHH:mm'.
const futureDateTimeField = z
  .string()
  .refine((value) => parseDateTimeInputValue(value) !== null, 'Укажите дату и время')
  .refine((value) => {
    const date = parseDateTimeInputValue(value)
    // Строго в будущем: напоминание, созданное в прошлом, сработало бы сразу.
    return date !== null && date.getTime() > Date.now()
  }, 'Разовое напоминание должно быть в будущем')

const intervalStartField = z.string().refine(
  (value) => parseDateTimeInputValue(value) !== null,
  'Укажите дату и время',
)

const everyMinutesField = z
  .string()
  .refine((value) => /^\d+$/.test(value.trim()), 'Укажите число')
  .refine((value) => {
    const minutes = Number(value)
    return Number.isInteger(minutes) && minutes >= 1 && minutes <= MAX_EVERY_MINUTES
  }, `От 1 до ${MAX_EVERY_MINUTES} минут`)

const weekdaysField = z
  .array(z.number().int().min(0).max(6))
  .min(1, 'Выберите хотя бы один день')

/**
 * Поля зависят от типа повтора, поэтому проверка — разветвление по `kind`.
 * Значения в форме — строки (дни — числа): в даты и число их превращает
 * панель формы при сохранении. Неиспользуемые поля ветка просто отбрасывает.
 */
export const reminderFormSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('once'),
    title: titleField,
    note: noteField,
    childId: z.string(),
    at: futureDateTimeField,
    active: z.boolean(),
  }),
  z.object({
    kind: z.literal('daily'),
    title: titleField,
    note: noteField,
    childId: z.string(),
    time: timeField,
    active: z.boolean(),
  }),
  z.object({
    kind: z.literal('weekly'),
    title: titleField,
    note: noteField,
    childId: z.string(),
    weekdays: weekdaysField,
    time: timeField,
    active: z.boolean(),
  }),
  z
    .object({
      kind: z.literal('interval'),
      title: titleField,
      note: noteField,
      childId: z.string(),
      everyMinutes: everyMinutesField,
      from: intervalStartField,
      // Пустая строка — «без конца».
      to: z.string().refine((value) => value === '' || parseDateTimeInputValue(value) !== null, 'Укажите дату и время'),
      active: z.boolean(),
    })
    .refine(
      (values) => {
        if (values.to === '') return true
        const from = parseDateTimeInputValue(values.from)
        const to = parseDateTimeInputValue(values.to)
        return from !== null && to !== null && to.getTime() > from.getTime()
      },
      { message: 'Конец должен быть позже начала', path: ['to'] },
    ),
])

/**
 * Плоский тип формы: react-hook-form не строит пути полей по объединению типов,
 * поэтому форма держит все поля сразу, а лишние для ветки отбрасывает zod.
 */
export interface ReminderFormValues {
  kind: 'once' | 'daily' | 'weekly' | 'interval'
  title: string
  note: string
  /** '' — «Для всех», иначе id ребёнка. */
  childId: string
  at: string
  time: string
  weekdays: number[]
  everyMinutes: string
  from: string
  to: string
  active: boolean
}
