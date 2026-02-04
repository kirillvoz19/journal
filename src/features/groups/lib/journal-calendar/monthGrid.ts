export type WeekdayIndex0Mon = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type MonthGridCell = {
  kind: 'empty' | 'day'
  dayOfMonth?: number
  isoDate?: string // YYYY-MM-DD
}

const pad2 = (value: number): string => String(value).padStart(2, '0')

export const makeIsoDate = (params: { year: number; monthIndex0: number; dayOfMonth: number }): string => {
  const { year, monthIndex0, dayOfMonth } = params
  return `${year}-${pad2(monthIndex0 + 1)}-${pad2(dayOfMonth)}`
}

export const getDaysInMonth = (params: { year: number; monthIndex0: number }): number => {
  const { year, monthIndex0 } = params
  return new Date(year, monthIndex0 + 1, 0).getDate()
}

export const getMonthStartWeekdayIndex0Mon = (params: { year: number; monthIndex0: number }): WeekdayIndex0Mon => {
  const { year, monthIndex0 } = params
  // JS: 0=Sun..6=Sat. Need 0=Mon..6=Sun.
  const jsDayIndex0Sun = new Date(year, monthIndex0, 1).getDay()
  const index0Mon = ((jsDayIndex0Sun + 6) % 7) as WeekdayIndex0Mon
  return index0Mon
}

export const buildMonthGrid = (params: { year: number; monthIndex0: number }): MonthGridCell[] => {
  const { year, monthIndex0 } = params
  const leadingEmptyCount = getMonthStartWeekdayIndex0Mon({ year, monthIndex0 })
  const daysInMonth = getDaysInMonth({ year, monthIndex0 })

  const cells: MonthGridCell[] = []

  for (let i = 0; i < leadingEmptyCount; i += 1) {
    cells.push({ kind: 'empty' })
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      kind: 'day',
      dayOfMonth: day,
      isoDate: makeIsoDate({ year, monthIndex0, dayOfMonth: day }),
    })
  }

  // Trailing empties to complete the last week (multiple of 7)
  const remainder = cells.length % 7
  if (remainder !== 0) {
    const trailing = 7 - remainder
    for (let i = 0; i < trailing; i += 1) {
      cells.push({ kind: 'empty' })
    }
  }

  return cells
}

export const WEEKDAY_LABELS_RU_SHORT: readonly string[] = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const
export const WEEKDAY_LABELS_BE_SHORT: readonly string[] = ['Пн', 'Аў', 'Ср', 'Чц', 'Пт', 'Сб', 'Нд'] as const

