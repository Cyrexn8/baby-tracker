/**
 * Цвета аватара ребёнка: достаточно тёмные, чтобы на них читалась белая буква.
 */
export const AVATAR_COLORS = [
  '#d95d6e',
  '#c2652e',
  '#a97a0e',
  '#2e8b5e',
  '#2e75b5',
  '#6b5bb5',
  '#a84a8e',
] as const

export type AvatarColor = (typeof AVATAR_COLORS)[number]

/** Названия цветов для скринридеров: подпись радио-кнопки выбора цвета. */
export const AVATAR_COLOR_LABELS: Record<AvatarColor, string> = {
  '#d95d6e': 'коралловый',
  '#c2652e': 'терракотовый',
  '#a97a0e': 'горчичный',
  '#2e8b5e': 'изумрудный',
  '#2e75b5': 'голубой',
  '#6b5bb5': 'лавандовый',
  '#a84a8e': 'орхидея',
}
