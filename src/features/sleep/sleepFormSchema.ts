import { z } from 'zod'
import { parseDateTimeInputValue } from '../../lib/time/format'

/** Заметка не важна для дневника, ограничиваем её, чтобы не раздувать записи. */
const MAX_NOTE_LENGTH = 500

export const sleepFormSchema = z
  .object({
    // Значения полей datetime-local: 'YYYY-MM-DDTHH:mm'.
    startAt: z
      .string()
      .refine((value) => parseDateTimeInputValue(value) !== null, 'Укажите время')
      .refine((value) => {
        const date = parseDateTimeInputValue(value)
        return date !== null && date.getTime() <= Date.now()
      }, 'Время не может быть в будущем'),
    // Пустая строка означает «сон ещё идёт».
    endAt: z.string().refine((value) => value === '' || parseDateTimeInputValue(value) !== null, 'Укажите время'),
    note: z.string().trim().max(MAX_NOTE_LENGTH, `Не длиннее ${MAX_NOTE_LENGTH} символов`),
  })
  // Конец строго позже начала: проверка перекрёстная, поэтому на целом объекте,
  // а ошибка вешается на поле конца (path), чтобы подсветилось нужное поле.
  .refine(
    (values) => {
      if (values.endAt === '') return true
      const start = parseDateTimeInputValue(values.startAt)
      const end = parseDateTimeInputValue(values.endAt)
      return start !== null && end !== null && end.getTime() > start.getTime()
    },
    { message: 'Конец должен быть позже начала', path: ['endAt'] },
  )

export type SleepFormValues = z.infer<typeof sleepFormSchema>
