export type MonthLabel = {
  belarusian: string
  russian: string
}

const capitalizeFirstLetter = (value: string): string => {
  const trimmed = value.trim()
  if (trimmed.length === 0) return trimmed
  return `${trimmed[0].toUpperCase()}${trimmed.slice(1)}`
}

const formatMonthYear = (params: { year: number; monthIndex0: number; locale: string }): string => {
  const { year, monthIndex0, locale } = params
  const date = new Date(year, monthIndex0, 1)
  // Make output deterministic across browsers (avoid "г." suffix in some locales).
  const month = new Intl.DateTimeFormat(locale, { month: 'long' }).format(date)
  return `${month} ${year}`
}

export const getMonthLabel = (params: { year: number; monthIndex0: number }): MonthLabel => {
  const { year, monthIndex0 } = params
  // Belarusian locale name in JS is "be-BY". If OS doesn't support it, browser may fallback.
  const belarusian = capitalizeFirstLetter(
    formatMonthYear({ year, monthIndex0, locale: 'be-BY' })
  )
  const russian = capitalizeFirstLetter(formatMonthYear({ year, monthIndex0, locale: 'ru-RU' }))

  return { belarusian, russian }
}

