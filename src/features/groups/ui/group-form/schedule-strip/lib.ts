import dayjs from 'dayjs'
import {
  getScheduleAttendanceKeyPart,
  getStudentAttendanceKeyPart,
  makeAttendanceKey,
} from '../../../model/attendance'
import type {
  AttendanceEditStatus,
  AttendanceStatus,
  GroupSchedule,
  GroupStudent,
} from '../../../model/types'

export const sortSchedules = (schedules: GroupSchedule[]): GroupSchedule[] =>
  [...schedules].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime)
    return a.endTime.localeCompare(b.endTime)
  })

/** Ключ недели (с понедельника, как в основном календаре) */
export const getWeekKey = (isoDate: string): string => {
  const d = dayjs(isoDate)
  if (!d.isValid()) return ''
  const daysSinceMonday = (d.day() + 6) % 7
  return d.subtract(daysSinceMonday, 'day').format('YYYY-MM-DD')
}

/** Ключ месяца в формате YYYY-MM */
export const getMonthKey = (isoDate: string): string => {
  const d = dayjs(isoDate)
  return d.isValid() ? d.format('YYYY-MM') : ''
}

/** Колер кружочка колькасці хвілін: 0 — чырвоны, 30 — аранжавы, 45 — жоўты, 60 — зялёны, 90 — сіні, іншае — фіялетавы */
export const getDurationColorStyle = (
  minutes: number
): { backgroundColor: string; color: string } => {
  switch (minutes) {
    case 0:
      return { backgroundColor: '#d32f2f', color: '#ffffff' }
    case 30:
      return { backgroundColor: '#ed6c02', color: '#ffffff' }
    case 45:
      return { backgroundColor: '#fbc02d', color: 'rgba(0, 0, 0, 0.87)' }
    case 60:
      return { backgroundColor: '#2e7d32', color: '#ffffff' }
    case 90:
      return { backgroundColor: '#1976d2', color: '#ffffff' }
    default:
      return { backgroundColor: '#7b1fa2', color: '#ffffff' }
  }
}

/** Колер полоскі наведвальнасці: прысутнічаў — зялёны, адсутнічаў — чырвоны, не адзначана — аранжавы */
export const getAttendanceColor = (status: AttendanceEditStatus): string => {
  switch (status) {
    case 'present':
      return '#4caf50'
    case 'absent':
      return '#f44336'
    case 'unset':
    default:
      return '#ff9800'
  }
}

/** Статусы наведвальнасці занятака па ўсіх студэнтах (у парадку агульнага спісу) */
export const getLessonAttendanceStatuses = (params: {
  students: GroupStudent[]
  schedule: GroupSchedule
  attendanceMap: Map<string, AttendanceStatus>
}): AttendanceEditStatus[] => {
  const { students, schedule, attendanceMap } = params
  const schedulePart = getScheduleAttendanceKeyPart(schedule)
  return students.map((student) => {
    const key = makeAttendanceKey(getStudentAttendanceKeyPart(student), schedulePart)
    return attendanceMap.get(key) ?? 'unset'
  })
}
