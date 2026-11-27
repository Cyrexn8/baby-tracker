import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import type { Measurement } from '../../lib/db/schema'
import { measurements } from '../../lib/repositories'
import { todayKey } from '../../lib/time/day'
import { Sheet } from '../../components/ui/Sheet'
import { Button } from '../../components/ui/Button'
import { DateField } from '../../components/ui/DateField'
import { Field } from '../../components/ui/Field'
import { Input, Textarea } from '../../components/ui/Input'
import { measurementFormSchema, type MeasurementFormValues } from './measurementFormSchema'

export interface MeasurementFormSheetProps {
  open: boolean
  onClose: () => void
  /** Ребёнок, к которому относится запись. */
  childId: string
  /** Изменяемое измерение. Без него форма добавляет новое. */
  measurement?: Measurement
}

/**
 * Панель с формой измерения: дата, вес, рост, заметка.
 * Хоть одно из чисел обязательно — иначе непонятно, что записали.
 *
 * Сама форма живёт, только пока панель открыта: дата «сегодня» по умолчанию
 * берётся на момент открытия, а не на момент загрузки страницы.
 */
export function MeasurementFormSheet({ open, onClose, childId, measurement }: MeasurementFormSheetProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={measurement ? 'Изменить измерение' : 'Новое измерение'}
      description="Дата и хотя бы одно из чисел — вес или рост."
    >
      {open && <MeasurementForm childId={childId} measurement={measurement} onClose={onClose} />}
    </Sheet>
  )
}

interface MeasurementFormProps {
  childId: string
  measurement?: Measurement
  onClose: () => void
}

function MeasurementForm({ childId, measurement, onClose }: MeasurementFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MeasurementFormValues>({
    resolver: zodResolver(measurementFormSchema),
    defaultValues: {
      // Новая запись — на сегодня: измеряют чаще всего в день визита к врачу.
      measuredOn: measurement?.measuredOn ?? todayKey(),
      weightKg: measurement?.weightKg != null ? String(measurement.weightKg).replace('.', ',') : '',
      heightCm: measurement?.heightCm != null ? String(measurement.heightCm).replace('.', ',') : '',
      note: measurement?.note ?? '',
    },
  })

  const handleSubmitValues = async (values: MeasurementFormValues) => {
    // В базе числа хранятся как number, в форме — строки с запятой или точкой.
    const patch = {
      measuredOn: values.measuredOn,
      weightKg: values.weightKg === '' ? null : Number(values.weightKg.replace(',', '.')),
      heightCm: values.heightCm === '' ? null : Number(values.heightCm.replace(',', '.')),
      note: values.note,
    }
    try {
      if (measurement) {
        await measurements.update(measurement.id, patch)
        toast.success('Изменения сохранены')
      } else {
        await measurements.add({ childId, ...patch })
        toast.success('Измерение записано')
      }
      onClose()
    } catch (error) {
      console.error(error)
      toast.error('Не удалось сохранить. Попробуйте ещё раз.')
    }
  }

  return (
    <form onSubmit={handleSubmit(handleSubmitValues)} noValidate className="space-y-5">
      <DateField
        label="Дата"
        error={errors.measuredOn?.message}
        registration={register('measuredOn')}
        // Родной календарь не даст выбрать будущее; проверка в схеме остаётся на случай вставки значения.
        max={todayKey()}
      />

      <div className="grid grid-cols-2 gap-3">
        {/* Текстовые поля, а не type="number": запятая в jsdom и части браузеров не доезжает,
            а проверку числа и диапазона всё равно держит схема. inputMode даёт цифровую клавиатуру. */}
        <Field label="Вес, кг" optional error={errors.weightKg?.message}>
          {(control) => (
            <Input
              {...control}
              {...register('weightKg')}
              type="text"
              inputMode="decimal"
              placeholder="Например, 5,6"
              maxLength={6}
            />
          )}
        </Field>

        <Field label="Рост, см" optional error={errors.heightCm?.message}>
          {(control) => (
            <Input
              {...control}
              {...register('heightCm')}
              type="text"
              inputMode="decimal"
              placeholder="Например, 58"
              maxLength={6}
            />
          )}
        </Field>
      </div>

      <Field label="Заметка" optional error={errors.note?.message}>
        {(control) => (
          <Textarea
            {...control}
            {...register('note')}
            placeholder="Например: плановый осмотр в поликлинике"
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
          {isSubmitting ? 'Сохранение…' : measurement ? 'Сохранить' : 'Добавить'}
        </Button>
      </div>
    </form>
  )
}
