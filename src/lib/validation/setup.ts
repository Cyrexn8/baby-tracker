import { z } from 'zod'

/** Включает русские сообщения об ошибках для стандартных проверок zod. */
export function setupValidation(): void {
  z.config(z.locales.ru())
}
