import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import type { Feeding, FeedingReaction, FeedingType } from '../../lib/db/schema'
import { feedings, type FeedingInput } from '../../lib/repositories'
import { toDateTimeInputValue, parseDateTimeInputValue } from '../../lib/time/format'
import { Sheet } from '../../components/ui/Sheet'
import { Button } from '../../components/ui/Button'
import { DateTimeField } from '../../components/ui/DateTimeField'
import { Field } from '../../components/ui/Field'
import { Input, Textarea } from '../../components/ui/Input'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { FEEDING_SIDES, FEEDING_TYPE_TITLES, REACTION_LABELS, SIDE_TITLES } from './feedingLabels'
import { feedingFormSchema, type FeedingFormValues } from './feedingFormSchema'

export interface FeedingFormSheetProps {
  open: boolean
  onClose: () => void
  /** Ребёнок, к которому относится запись. */
  childId: string
  /** Тип записи: панель открывается с вкладки, поэтому тип приходит снаружи. */
  type: FeedingType
  /** Изменяемое кормление. Без него форма добавляет новое. */
  feeding?: Feeding
  /** Конец, подставленный заранее — так панель таймера предлагает поправить забытое время. */
  endPreset?: Date
}

/** Значения формы по умолчанию: зависят от типа, поэтому собирает отдельная функция. */
function buildDefaults(type: FeedingType, feeding: Feeding | undefined, endPreset?: Date): FeedingFormValues {
  const startAt = toDateTimeInputValue(feeding?.startAt ?? new Date())
  const note = feeding?.note ?? ''
  switch (type) {
    case 'breast': {
      // У идущего кормления конец пустой, а endPreset — предложение поправить забытое время.
      const end = feeding?.endAt ?? endPreset ?? null
      return {
        type,
        startAt,
        side: feeding?.side ?? 'left',
        endAt: end ? toDateTimeInputValue(end) : '',
        // Неиспользуемые веткой поля — пустые: zod их отбрасывает при проверке.
        amountMl: '',
        food: '',
        reaction: '',
        note,
      }
    }
    case 'bottle':
      return {
        type,
        startAt,
        side: 'left',
        endAt: '',
        amountMl: feeding?.amountMl ? String(feeding.amountMl) : '',
        food: feeding?.food ?? '',
        reaction: '',
        note,
      }
    case 'solid':
      return {
        type,
        startAt,
        side: 'left',
        endAt: '',
        amountMl: '',
        food: feeding?.food ?? '',
        reaction: feeding?.reaction ?? '',
        note,
      }
  }
}

/**
 * Панель с формой кормления. Поля зависят от типа: у груди — сторона и конец,
 * у бутылочки — объём и содержимое, у прикорма — блюдо и реакция.
 *
 * Сама форма живёт, только пока панель открыта: значения по умолчанию («сейчас»)
 * берутся на момент открытия, а не на момент загрузки страницы.
 */
export function FeedingFormSheet({ open, onClose, childId, type, feeding, endPreset }: FeedingFormSheetProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={feeding ? 'Изменить кормление' : 'Новая запись'}
      description={`Тип — ${FEEDING_TYPE_TITLES[type].toLowerCase()}. Укажите время начала.`}
    >
      {open && (
        <FeedingForm childId={childId} type={type} feeding={feeding} endPreset={endPreset} onClose={onClose} />
      )}
    </Sheet>
  )
}

interface FeedingFormProps {
  childId: string
  type: FeedingType
  feeding?: Feeding
  endPreset?: Date
  onClose: () => void
}

function FeedingForm({ childId, type, feeding, endPreset, onClose }: FeedingFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FeedingFormValues>({
    // Приведение типов: схема — объединение по типу, а форма — плоский интерфейс.
    // Проверка остаётся строгой в zod, лишние для ветки поля он отбрасывает сам.
    resolver: zodResolver(feedingFormSchema) as unknown as Resolver<FeedingFormValues>,
    defaultValues: buildDefaults(type, feeding, endPreset),
  })

  const selectedSide = watch('side')
  const selectedReaction = watch('reaction')

  const handleSubmitValues = async (values: FeedingFormValues) => {
    // Дата хранится в базе как Date, объём — числом: форма держит строки.
    const startAt = parseDateTimeInputValue(values.startAt)
    if (!startAt) {
      // Схема не пропустит пустую строку, поэтому сюда попадаем только при сбое полей ввода.
      toast.error('Укажите время')
      return
    }
    const input: FeedingInput = {
      childId,
      type: values.type,
      startAt,
      note: values.note,
    }
    if (values.type === 'breast') {
      input.side = values.side
      input.endAt = values.endAt === '' ? null : parseDateTimeInputValue(values.endAt)
    } else if (values.type === 'bottle') {
      input.amountMl = Number(values.amountMl)
      input.food = values.food === '' ? null : values.food
    } else {
      input.food = values.food
      input.reaction = values.reaction === '' ? null : (values.reaction as FeedingReaction)
    }

    try {
      if (feeding) {
        await feedings.update(feeding.id, input)
        toast.success('Изменения сохранены')
      } else {
        await feedings.add(input)
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
        label="Начало"
        error={errors.startAt?.message}
        registration={register('startAt')}
        // Родной календарь не даст выбрать будущее; проверка в схеме остаётся на случай вставки значения.
        max={toDateTimeInputValue(new Date())}
      />

      {type === 'breast' && (
        <>
          <Field label="Грудь" error={errors.side?.message}>
            <SegmentedControl
              label="Грудь"
              value={selectedSide ?? 'left'}
              options={FEEDING_SIDES.map((side) => ({ value: side, label: SIDE_TITLES[side] }))}
              onChange={(side) => setValue('side', side, { shouldValidate: true, shouldDirty: true })}
            />
          </Field>

          <DateTimeField
            label="Конец"
            optional
            hint="Оставьте пустым, если кормление ещё идёт"
            error={errors.endAt?.message}
            registration={register('endAt')}
            max={toDateTimeInputValue(new Date())}
          />
        </>
      )}

      {type === 'bottle' && (
        <>
          <Field label="Объём, мл" error={errors.amountMl?.message}>
            {(control) => (
              <Input
                {...control}
                {...register('amountMl')}
                type="number"
                inputMode="numeric"
                min={1}
                max={1000}
                step={10}
                placeholder="Например, 120"
              />
            )}
          </Field>

          <Field label="Что в бутылочке" optional error={errors.food?.message}>
            {(control) => (
              <Input {...control} {...register('food')} placeholder="Смесь, сцеженное молоко…" maxLength={80} />
            )}
          </Field>
        </>
      )}

      {type === 'solid' && (
        <>
          <Field label="Блюдо" error={errors.food?.message}>
            {(control) => <Input {...control} {...register('food')} placeholder="Кабачок, каша…" maxLength={80} />}
          </Field>

          <Field label="Реакция" optional hint="Можно не отмечать — и выбрать позже в списке">
            <SegmentedControl
              label="Реакция"
              value={selectedReaction ?? ''}
              options={[
                // Пустой вариант — «не отмечали»: реакция необязательная.
                { value: '', label: '—' },
                { value: 'liked', label: REACTION_LABELS.liked },
                { value: 'neutral', label: REACTION_LABELS.neutral },
                { value: 'refused', label: REACTION_LABELS.refused },
              ]}
              onChange={(reaction) => setValue('reaction', reaction, { shouldValidate: true, shouldDirty: true })}
            />
          </Field>
        </>
      )}

      <Field label="Заметка" optional error={errors.note?.message}>
        {(control) => (
          <Textarea
            {...control}
            {...register('note')}
            placeholder="Например: ела с удовольствием, но недолго"
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
          {isSubmitting ? 'Сохранение…' : feeding ? 'Сохранить' : 'Добавить'}
        </Button>
      </div>
    </form>
  )
}
