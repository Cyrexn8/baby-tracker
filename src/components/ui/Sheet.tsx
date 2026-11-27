import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'
import { cn } from '../../lib/cn'

export interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  /** Кнопки внизу панели. */
  footer?: ReactNode
  /** `lg` — шире стандартной, для форм с большим числом полей. */
  size?: 'md' | 'lg'
}

/**
 * Модальная панель: снизу на телефоне, по центру на широком экране.
 * Закрывается кнопкой, крестиком, клавишей Esc и нажатием на тёмный фон.
 *
 * Сам <dialog> прозрачен и занимает весь экран; тёмный фон — отдельная кнопка,
 * поэтому нажатие по нему доступно и с клавиатуры, а клик внутри панели
 * случайно её не закрывает.
 */
export function Sheet({ open, onClose, title, description, children, footer, size = 'md' }: SheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (typeof dialog.showModal !== 'function') {
      // Старый браузер без showModal(): показываем панель как обычный блок.
      if (open) dialog.setAttribute('open', '')
      else dialog.removeAttribute('open')
      return
    }
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // Страница за панелью не прокручивается.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby={titleId}
      className="fixed inset-0 m-0 h-[100dvh] max-h-none w-full max-w-none overflow-hidden bg-transparent p-0 open:block"
    >
      <div className="relative flex h-full flex-col justify-end sm:items-center sm:justify-center sm:p-6">
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={onClose}
          className="absolute inset-0 cursor-default bg-black/50"
        />
        <div
          className={cn(
            'relative flex max-h-[92dvh] w-full flex-col gap-4 rounded-t-3xl bg-surface px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-fg shadow-2xl sm:max-h-[85dvh] sm:max-w-lg sm:rounded-3xl',
            size === 'lg' && 'sm:max-w-2xl',
          )}
        >
          <div aria-hidden="true" className="mx-auto h-1 w-10 shrink-0 rounded-full bg-line sm:hidden" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg leading-tight font-bold">
                {title}
              </h2>
              {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Закрыть">
              <X className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
          {footer && <div className="flex justify-end gap-3 border-t border-line pt-4">{footer}</div>}
        </div>
      </div>
    </dialog>
  )
}
