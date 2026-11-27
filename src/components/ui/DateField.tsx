import type { UseFormRegisterReturn } from 'react-hook-form'
import { Field } from './Field'
import { Input } from './Input'

export interface DateFieldProps {
  label: string
  /** Текст ошибки — показывает его под полем и связывает с полем для скринридеров. */
  error?: string
  hint?: string
  /** Пометка «· необязательно» в подписи: для полей, которые можно оставить пустыми. */
  optional?: boolean
  /** Результат `register('имяПоля')` из react-hook-form. */
  registration: UseFormRegisterReturn
  /** Самое позднее допустимое значение в формате поля ('ГГГГ-ММ-ДД'), например «сегодня». */
  max?: string
  className?: string
}

/**
 * Поле даты на родном календаре (<input type="date">).
 * Значение — строка 'ГГГГ-ММ-ДД'; читать и проверять её умеют
 * parseDateInputValue и isDayKey из src/lib/time/.
 */
export function DateField({ label, error, hint, optional, registration, max, className }: DateFieldProps) {
  return (
    <Field label={label} error={error} hint={hint} optional={optional} className={className}>
      {(control) => <Input {...control} {...registration} type="date" max={max} />}
    </Field>
  )
}
