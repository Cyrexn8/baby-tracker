import { z } from 'zod'
import { DIAPER_TYPES } from './diaperLabels'
import { parseDateTimeInputValue } from '../../lib/time/format'

/** Заметка не важна для дневника, ограничиваем её, чтобы не раздувать записи. */
const MAX_NOTE_LENGTH = 500

export const diaperFormSchema = z.object({
  // Значение <input type="datetime-local">: 'YYYY-MM-DDTHH:mm', проверяем отдельно.
  at: z
    .string()
    .refine((value) => parseDateTimeInputValue(value) !== null, 'Укажите время')
    .refine((value) => {
      const date = parseDateTimeInputValue(value)
      // Сравнение с Date.now(), а не с «сегодня»: запись сделана час назад — тоже прошедшее время.
      return date !== null && date.getTime() <= Date.now()
    }, 'Время не может быть в будущем'),
  type: z.enum(DIAPER_TYPES, 'Выберите тип'),
  note: z.string().trim().max(MAX_NOTE_LENGTH, `Не длиннее ${MAX_NOTE_LENGTH} символов`),
})

export type DiaperFormValues = z.infer<typeof diaperFormSchema>
