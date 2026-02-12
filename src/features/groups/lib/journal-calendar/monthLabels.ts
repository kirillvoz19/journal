export type MonthLabel = {
  belarusian: string
  russian: string
}

const MONTHS_BELARUSIAN: ReadonlyArray<string> = [
  'Студзень',
  'Люты',
  'Сакавік',
  'Красавік',
  'Май',
  'Чэрвень',
  'Ліпень',
  'Жнівень',
  'Верасень',
  'Кастрычнік',
  'Лістапад',
  'Снежань',
]

const capitalizeFirstLetter = (value: string): string => {
  const trimmed = value.trim()
  if (trimmed.length === 0) return trimmed
  return `${trimmed[0].toUpperCase()}${trimmed.slice(1)}`
}

const formatMonthYearRussian = (params: { year: number; monthIndex0: number }): string => {
  const { year, monthIndex0 } = params
  const date = new Date(year, monthIndex0, 1)
  const month = new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(date)
  return `${capitalizeFirstLetter(month)} ${year}`
}

export const getMonthLabel = (params: { year: number; monthIndex0: number }): MonthLabel => {
  const { year, monthIndex0 } = params
  const monthIndex = monthIndex0 >= 0 && monthIndex0 <= 11 ? monthIndex0 : 0
  const belarusian = `${MONTHS_BELARUSIAN[monthIndex]} ${year}`
  const russian = formatMonthYearRussian({ year, monthIndex0 })

  return { belarusian, russian }
}

