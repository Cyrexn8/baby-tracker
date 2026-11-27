import { z } from 'zod'
import { isDayKey, todayKey } from '../../lib/time/day'

/** Заметка не важна для дневника, ограничиваем её, чтобы не раздувать записи. */
const MAX_NOTE_LENGTH = 500

const WEIGHT_RANGE = { min: 0.1, max: 30 } as const
const HEIGHT_RANGE = { min: 20, max: 160 } as const

/** Число из поля <input type="number">: цифры и при желании запятая или точка. */
const DECIMAL_PATTERN = /^\d+(?:[.,]\d+)?$/

function parseDecimal(value: string): number {
  return Number(value.replace(',', '.'))
}

const weightField = z
  .string()
  .refine((value) => value === '' || DECIMAL_PATTERN.test(value.trim()), 'Укажите число')
  .refine((value) => {
    if (value === '') return true
    const weight = parseDecimal(value.trim())
    return weight >= WEIGHT_RANGE.min && weight <= WEIGHT_RANGE.max
  }, `Вес от ${String(WEIGHT_RANGE.min).replace('.', ',')} до ${WEIGHT_RANGE.max} кг`)

const heightField = z
  .string()
  .refine((value) => value === '' || DECIMAL_PATTERN.test(value.trim()), 'Укажите число')
  .refine((value) => {
    if (value === '') return true
    const height = parseDecimal(value.trim())
    return height >= HEIGHT_RANGE.min && height <= HEIGHT_RANGE.max
  }, `Рост от ${HEIGHT_RANGE.min} до ${HEIGHT_RANGE.max} см`)

export const measurementFormSchema = z
  .object({
    // Значение <input type="date">: 'YYYY-MM-DD' — сразу в формате записи.
    measuredOn: z
      .string()
      .refine(isDayKey, 'Укажите дату')
      .refine((value) => isDayKey(value) && value <= todayKey(new Date()), 'Дата не может быть в будущем'),
    weightKg: weightField,
    heightCm: heightField,
    note: z.string().trim().max(MAX_NOTE_LENGTH, `Не длиннее ${MAX_NOTE_LENGTH} символов`),
  })
  // Хоть одно из чисел обязательно, иначе непонятно, что записали.
  // Ошибка вешается на поле веса: оно первое в форме.
  .refine((values) => values.weightKg !== '' || values.heightCm !== '', {
    message: 'Укажите вес или рост — хотя бы одно из двух',
    path: ['weightKg'],
  })

export type MeasurementFormValues = z.infer<typeof measurementFormSchema>
