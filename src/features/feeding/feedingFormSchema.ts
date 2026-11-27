import { z } from 'zod'
import type { FeedingType } from '../../lib/db/schema'
import { FEEDING_SIDES } from './feedingLabels'
import { parseDateTimeInputValue } from '../../lib/time/format'

const MAX_NOTE_LENGTH = 500
const MAX_FOOD_LENGTH = 80
const MAX_AMOUNT_ML = 1000

// Значения полей datetime-local: 'YYYY-MM-DDTHH:mm'.
const startAtField = z
  .string()
  .refine((value) => parseDateTimeInputValue(value) !== null, 'Укажите время')
  .refine((value) => {
    const date = parseDateTimeInputValue(value)
    return date !== null && date.getTime() <= Date.now()
  }, 'Время не может быть в будущем')

const noteField = z.string().trim().max(MAX_NOTE_LENGTH, `Не длиннее ${MAX_NOTE_LENGTH} символов`)

/** Объём как строка из поля <input type="number">: проверяем цифры, потом диапазон. */
const amountField = z
  .string()
  .refine((value) => /^\d+$/.test(value.trim()), 'Укажите объём')
  .refine((value) => {
    const amount = Number(value)
    return Number.isInteger(amount) && amount >= 1 && amount <= MAX_AMOUNT_ML
  }, `Объём от 1 до ${MAX_AMOUNT_ML} мл`)

// Конец строго позже начала: перекрёстная проверка на объекте груди, ошибка — на поле конца.
const breastSchema = z
  .object({
    type: z.literal('breast'),
    startAt: startAtField,
    side: z.enum(FEEDING_SIDES, 'Выберите грудь'),
    // Пустая строка означает «кормление ещё идёт».
    endAt: z.string().refine((value) => value === '' || parseDateTimeInputValue(value) !== null, 'Укажите время'),
    note: noteField,
  })
  .refine(
    (values) => {
      if (values.endAt === '') return true
      const start = parseDateTimeInputValue(values.startAt)
      const end = parseDateTimeInputValue(values.endAt)
      return start !== null && end !== null && end.getTime() > start.getTime()
    },
    { message: 'Конец должен быть позже начала', path: ['endAt'] },
  )

const bottleSchema = z.object({
  type: z.literal('bottle'),
  startAt: startAtField,
  amountMl: amountField,
  food: z.string().trim().max(MAX_FOOD_LENGTH, `Не длиннее ${MAX_FOOD_LENGTH} символов`),
  note: noteField,
})

const solidSchema = z.object({
  type: z.literal('solid'),
  startAt: startAtField,
  food: z.string().trim().min(1, 'Укажите блюдо').max(MAX_FOOD_LENGTH, `Не длиннее ${MAX_FOOD_LENGTH} символов`),
  // Реакция необязательная: пустая строка — «не отмечали».
  reaction: z.string(),
  note: noteField,
})

/** Поля зависят от типа, поэтому проверка — разветвление по `type`. */
export const feedingFormSchema = z.discriminatedUnion('type', [breastSchema, bottleSchema, solidSchema])

/**
 * Плоский тип формы. react-hook-form не строит пути полей по объединению типов
 * (register('amountMl') не прошёл бы проверку для грудной ветки), поэтому форма
 * держит все поля сразу, а лишние для ветки отбрасывает zod. Все значения — строки:
 * в числа и даты их превращает панель формы при сохранении.
 */
export interface FeedingFormValues {
  type: FeedingType
  startAt: string
  side: (typeof FEEDING_SIDES)[number]
  endAt: string
  amountMl: string
  food: string
  reaction: string
  note: string
}
