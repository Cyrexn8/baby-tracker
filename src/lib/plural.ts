/**
 * Склонение русских числительных: plural(1, 'день', 'дня', 'дней') → 'день'.
 */
export function plural(count: number, one: string, few: string, many: string): string {
  const absolute = Math.abs(count) % 100
  const lastDigit = absolute % 10
  if (absolute > 10 && absolute < 20) return many
  if (lastDigit > 1 && lastDigit < 5) return few
  if (lastDigit === 1) return one
  return many
}

/** 1 → '1 день', 3 → '3 дня', 11 → '11 дней'. */
export function countLabel(count: number, one: string, few: string, many: string): string {
  return `${count} ${plural(count, one, few, many)}`
}
