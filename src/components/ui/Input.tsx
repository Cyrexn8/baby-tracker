import type { ComponentPropsWithRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'

/** Общий вид поля: рамка внутри, фокус и ошибка меняют её цвет. */
export const FIELD_STYLES =
  'h-11 w-full rounded-xl bg-surface px-3.5 text-base text-fg placeholder:text-fg-muted inset-ring-1 inset-ring-line transition-shadow focus:inset-ring-2 focus:inset-ring-focus aria-invalid:inset-ring-danger disabled:opacity-50 read-only:bg-surface-muted'

export type InputProps = ComponentPropsWithRef<'input'> & {
  /** true, когда поле содержит ошибку: подсвечивает рамку. */
  invalid?: boolean
}

export function Input({ className, invalid, ...props }: InputProps) {
  return <input className={cn(FIELD_STYLES, className)} aria-invalid={invalid || undefined} {...props} />
}

export type TextareaProps = ComponentPropsWithRef<'textarea'> & { invalid?: boolean }

export function Textarea({ className, invalid, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(FIELD_STYLES, 'h-auto min-h-24 resize-y py-2.5', className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  )
}

export type SelectProps = ComponentPropsWithRef<'select'>

/** Обычный select с единой стрелкой; варианты передаются дочерними <option>. */
export function Select({ className, children, ...props }: SelectProps) {
  return (
    <span className="relative block">
      <select className={cn(FIELD_STYLES, 'appearance-none pr-10', className)} {...props}>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-fg-muted"
        aria-hidden="true"
      />
    </span>
  )
}
