import dayjs from 'dayjs'
import type { GroupSchedule } from '../../../model/types'
import type { MonthIndex0, SchedulesByYearMonth, YearNumber } from './types'

export const groupSchedulesByYearMonth = (schedules: GroupSchedule[]): SchedulesByYearMonth => {
  const map: SchedulesByYearMonth = new Map()

  for (const schedule of schedules) {
    const d = dayjs(schedule.date)
    if (!d.isValid()) continue
    const year = d.year() as YearNumber
    const monthIndex0 = d.month() as MonthIndex0

    const yearMap = map.get(year) ?? new Map<MonthIndex0, GroupSchedule[]>()
    const monthList = yearMap.get(monthIndex0) ?? []

    monthList.push(schedule)
    yearMap.set(monthIndex0, monthList)
    map.set(year, yearMap)
  }

  // Normalize ordering: schedules by date+time, months ascending, years ascending
  for (const [, yearMap] of map) {
    for (const [monthIndex0, monthList] of yearMap) {
      monthList.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date)
        if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime)
        return a.endTime.localeCompare(b.endTime)
      })
      yearMap.set(monthIndex0, monthList)
    }
  }

  return new Map(
    Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, yearMap]) => [
        year,
        new Map(Array.from(yearMap.entries()).sort(([a], [b]) => a - b)),
      ])
  )
}

export const getScheduleForDate = (params: {
  schedules: GroupSchedule[]
  isoDate: string
}): GroupSchedule | null => {
  const { schedules, isoDate } = params
  // Assumption: one lesson per day; if multiple exist we take the earliest by startTime.
  const sameDay = schedules.filter((s) => s.date === isoDate)
  if (sameDay.length === 0) return null
  const sorted = [...sameDay].sort((a, b) => a.startTime.localeCompare(b.startTime))
  return sorted[0] ?? null
}

export const getLessonMinutes = (params: { startTime: string; endTime: string }): number => {
  const { startTime, endTime } = params
  const start = dayjs(startTime, 'HH:mm')
  const end = dayjs(endTime, 'HH:mm')
  if (!start.isValid() || !end.isValid()) return 0
  const diff = end.diff(start, 'minute')
  return diff > 0 ? diff : 0
}

