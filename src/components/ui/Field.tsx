import { useId, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

/** Атрибуты, которые поле ввода получает от подписи: связывают их для скринридеров. */
export interface FieldControlProps {
  id: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
}

export interface FieldProps {
  label: string
  /** Подсказка под полем. */
  hint?: string
  /** Текст ошибки: подсвечивает поле и озвучивается. */
  error?: string
  /** Отметка «необязательно» в подписи. */
  optional?: boolean
  className?: string
  /**
   * Либо готовый элемент, либо функция: она получает атрибуты, которые нужно передать полю.
   *
   * Для одного поля передавайте функцию — подпись свяжется с ним через `htmlFor`.
   * Для группы полей (набор радио-кнопок) передавайте готовый элемент — подпись станет
   * заголовком группы (`legend`).
   */
  children: ReactNode | ((control: FieldControlProps) => ReactNode)
}

export function Field({ label, hint, error, optional, className, children }: FieldProps) {
  const id = useId()
  const hintId = useId()
  const errorId = useId()

  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined
  const caption = (
    <>
      {label}
      {optional && <span className="ml-1 font-normal text-fg-muted">· необязательно</span>}
    </>
  )
  const messages = (
    <>
      {hint && !error && (
        <p id={hintId} className="text-xs text-fg-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </>
  )

  if (typeof children !== 'function') {
    return (
      <fieldset className={cn('min-w-0 space-y-1.5', className)} aria-describedby={describedBy}>
        <legend className="block text-sm font-semibold">{caption}</legend>
        {children}
        {messages}
      </fieldset>
    )
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-semibold">
        {caption}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {messages}
    </div>
  )
}
