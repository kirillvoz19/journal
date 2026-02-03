export const GROUP_SUBJECTS = [
  'Немецкий',
  'Английский',
  'Польский',
  'Другой язык',
] as const

export const GROUP_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const

export type GroupSubject = (typeof GROUP_SUBJECTS)[number]
export type GroupLevel = (typeof GROUP_LEVELS)[number]

