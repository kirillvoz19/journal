import type { GroupSchedule } from '../../../model/types'

export type YearNumber = number
export type MonthIndex0 = number // 0..11

export type SchedulesByYearMonth = Map<YearNumber, Map<MonthIndex0, GroupSchedule[]>>

