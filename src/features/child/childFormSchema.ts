import { z } from 'zod'
import { AVATAR_COLORS } from '../../lib/colors'
import { isDayKey, todayKey } from '../../lib/time/day'

export const childFormSchema = z.object({
  name: z.string().trim().min(1, 'Введите имя').max(60, 'Не длиннее 60 символов'),
  birthDate: z
    .string()
    .refine(isDayKey, 'Укажите дату рождения')
    .refine((value) => isDayKey(value) && value <= todayKey(new Date()), 'Дата не может быть в будущем'),
  avatarColor: z.enum(AVATAR_COLORS, 'Выберите цвет'),
})

export type ChildFormValues = z.infer<typeof childFormSchema>
