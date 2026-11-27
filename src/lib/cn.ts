import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Склеивает классы Tailwind: убирает повторы и оставляет последний из конфликтующих. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
