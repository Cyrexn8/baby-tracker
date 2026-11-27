import { cn } from '../../lib/cn'

/** Круглый значок с первой буквой имени и цветом ребёнка. */
export function Avatar({ name, color, className }: { name: string; color: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white select-none',
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {initials(name)}
    </span>
  )
}

/** Первая буква имени; для двух слов — первая буква каждого: «Аня М» → «АМ». */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return (words[0] ?? '?').charAt(0).toUpperCase()
  return ((words[0] ?? '').charAt(0) + (words[1] ?? '').charAt(0)).toUpperCase()
}
