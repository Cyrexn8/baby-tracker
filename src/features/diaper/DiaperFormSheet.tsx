import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import type { Diaper } from '../../lib/db/schema'
import { diapers } from '../../lib/repositories'
import { toDateTimeInputValue, parseDateTimeInputValue } from '../../lib/time/format'
import { Sheet } from '../../components/ui/Sheet'
import { Button } from '../../components/ui/Button'
import { DateTimeField } from '../../components/ui/DateTimeField'
import { Field } from '../../components/ui/Field'
import { Textarea } from '../../components/ui/Input'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { DIAPER_TYPES, diaperTypeTitle } from './diaperLabels'
import { diaperFormSchema, type DiaperFormValues } from './diaperFormSchema'

export interface DiaperFormSheetProps {
  open: boolean
  onClose: () => void
  /** Ребёнок, к которому относится запись. */
  childId: string
  /** Изменяемая запись. Без неё форма добавляет новую. */
  diaper?: Diaper
}

/**
 * Панель с формой подгузника: время, тип, заметка.
 * Одинаковая и для добавления за другое время, и для изменения существующей записи.
 *
 * Сама форма живёт, только пока панель открыта: значения по умолчанию («сейчас»)
 * берутся на момент открытия, а не на момент загрузки страницы.
 */
export function DiaperFormSheet({ open, onClose, childId, diaper }: DiaperFormSheetProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={diaper ? 'Изменить запись' : 'Новая запись'}
      description="Подгузник меняют не только «сейчас» — укажите время вручную."
    >
      {open && <DiaperForm childId={childId} diaper={diaper} onClose={onClose} />}
    </Sheet>
  )
}

interface DiaperFormProps {
  childId: string
  diaper?: Diaper
  onClose: () => void
}

function DiaperForm({ childId, diaper, onClose }: DiaperFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DiaperFormValues>({
    resolver: zodResolver(diaperFormSchema),
    // Новая запись по умолчанию ставится «сейчас»: чаще всего время угадано верно.
    defaultValues: {
      at: toDateTimeInputValue(diaper?.at ?? new Date()),
      type: diaper?.type ?? 'pee',
      note: diaper?.note ?? '',
    },
  })

  const selectedType = watch('type')

  const handleSubmitValues = async (values: DiaperFormValues) => {
    // Дата хранится в базе как Date, в форме — строкой datetime-local.
    const at = parseDateTimeInputValue(values.at)
    if (!at) {
      // Схема не пропустит пустую строку, поэтому сюда попадаем только при сбое полей ввода.
      toast.error('Укажите время')
      return
    }
    try {
      if (diaper) {
        await diapers.update(diaper.id, { at, type: values.type, note: values.note })
        toast.success('Изменения сохранены')
      } else {
        await diapers.add({ childId, at, type: values.type, note: values.note })
        toast.success('Запись добавлена')
      }
      onClose()
    } catch (error) {
      console.error(error)
      toast.error('Не удалось сохранить. Попробуйте ещё раз.')
    }
  }

  return (
    <form onSubmit={handleSubmit(handleSubmitValues)} noValidate className="space-y-5">
      <DateTimeField
        label="Время"
        error={errors.at?.message}
        registration={register('at')}
        // Родной календарь не даст выбрать будущее; проверка в схеме остаётся на случай вставки значения.
        max={toDateTimeInputValue(new Date())}
      />

      <Field label="Тип">
        <SegmentedControl
          label="Тип"
          value={selectedType}
          options={DIAPER_TYPES.map((type) => ({ value: type, label: diaperTypeTitle(type) }))}
          onChange={(type) => setValue('type', type, { shouldValidate: true, shouldDirty: true })}
        />
      </Field>

      <Field label="Заметка" optional error={errors.note?.message}>
        {(control) => (
          <Textarea
            {...control}
            {...register('note')}
            placeholder="Например: небольшая сыпь под подгузником"
            maxLength={500}
            rows={3}
          />
        )}
      </Field>

      <div className="flex gap-3">
        <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Отмена
        </Button>
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? 'Сохранение…' : diaper ? 'Сохранить' : 'Добавить'}
        </Button>
      </div>
    </form>
  )
}
