import type { UseFormRegisterReturn } from 'react-hook-form'
import { Field } from './Field'
import { Input } from './Input'

export interface DateTimeFieldProps {
  label: string
  /** Текст ошибки — показывает его под полем и связывает с полем для скринридеров. */
  error?: string
  hint?: string
  /** Пометка «· необязательно» в подписи: для полей, которые можно оставить пустыми. */
  optional?: boolean
  /** Результат `register('имяПоля')` из react-hook-form. */
  registration: UseFormRegisterReturn
  /** Самое позднее допустимое значение в формате поля ('ГГГГ-ММ-ДДЧЧ:ММ'), например «сейчас». */
  max?: string
  className?: string
}

/**
 * Поле даты и времени на родном календаре (<input type="datetime-local">).
 * Значение — строка 'ГГГГ-ММ-ДДTЧЧ:ММ'; превращать её в Date и обратно умеют
 * toDateTimeInputValue и parseDateTimeInputValue из src/lib/time/format.ts.
 */
export function DateTimeField({ label, error, hint, optional, registration, max, className }: DateTimeFieldProps) {
  return (
    <Field label={label} error={error} hint={hint} optional={optional} className={className}>
      {(control) => <Input {...control} {...registration} type="datetime-local" max={max} />}
    </Field>
  )
}
