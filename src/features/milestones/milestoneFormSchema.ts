import { z } from 'zod'
import { isDayKey, todayKey } from '../../lib/time/day'
import { MILESTONE_CATEGORY_IDS } from './milestoneCategories'

/** Заметка не важна для дневника, ограничиваем её, чтобы не раздувать записи. */
const MAX_NOTE_LENGTH = 500

export const milestoneFormSchema = z.object({
  title: z.string().trim().min(1, 'Введите название').max(120, 'Не длиннее 120 символов'),
  // Значение <input type="date">: 'YYYY-MM-DD' — сразу в формате записи.
  date: z
    .string()
    .refine(isDayKey, 'Укажите дату')
    .refine((value) => isDayKey(value) && value <= todayKey(new Date()), 'Дата не может быть в будущем'),
  categoryId: z.enum(MILESTONE_CATEGORY_IDS, 'Выберите категорию'),
  note: z.string().trim().max(MAX_NOTE_LENGTH, `Не длиннее ${MAX_NOTE_LENGTH} символов`),
})

export type MilestoneFormValues = z.infer<typeof milestoneFormSchema>
