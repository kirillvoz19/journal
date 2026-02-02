import type { AttendanceRecord, AttendanceStatus, Group, GroupSchedule, GroupStudent } from './types'

export type AuthenticatedFetch = (url: string, options?: RequestInit) => Promise<Response>

const ATTENDANCE_KEY_SEPARATOR = '::'
const SCHEDULE_SIGNATURE_SEPARATOR = '||'

const isNonEmptyString = (value: string): boolean => value.trim().length > 0

export const getStudentAttendanceKeyPart = (student: GroupStudent): string => {
  return student.fullName
}

export const getScheduleAttendanceKeyPart = (schedule: GroupSchedule): string => {
  return `${schedule.date}${SCHEDULE_SIGNATURE_SEPARATOR}${schedule.startTime}${SCHEDULE_SIGNATURE_SEPARATOR}${schedule.endTime}`
}

export const makeAttendanceKey = (studentKeyPart: string, scheduleKeyPart: string): string => {
  return `${studentKeyPart}${ATTENDANCE_KEY_SEPARATOR}${scheduleKeyPart}`
}

export const makeAttendanceKeyFromEntities = (student: GroupStudent, schedule: GroupSchedule): string => {
  return makeAttendanceKey(getStudentAttendanceKeyPart(student), getScheduleAttendanceKeyPart(schedule))
}

export const parseAttendanceKey = (
  key: string
): { studentKeyPart: string; scheduleKeyPart: string } | null => {
  const parts = key.split(ATTENDANCE_KEY_SEPARATOR)
  if (parts.length !== 2) {
    return null
  }
  const [studentKeyPart, scheduleKeyPart] = parts
  if (!isNonEmptyString(studentKeyPart) || !isNonEmptyString(scheduleKeyPart)) {
    return null
  }
  return { studentKeyPart, scheduleKeyPart }
}

const findStudentByKeyPart = (students: GroupStudent[], studentKeyPart: string): GroupStudent | undefined => {
  return students.find((s) => s.fullName === studentKeyPart)
}

const findScheduleByKeyPart = (schedules: GroupSchedule[], scheduleKeyPart: string): GroupSchedule | undefined => {
  return schedules.find((s) => getScheduleAttendanceKeyPart(s) === scheduleKeyPart)
}

export const saveAttendanceRecords = async (params: {
  authenticatedFetch: AuthenticatedFetch
  group: Group
  attendanceMap: Map<string, AttendanceStatus>
}): Promise<void> => {
  const { authenticatedFetch, group, attendanceMap } = params

  const students = group.students ?? []
  const schedules = group.schedules ?? []

  if (students.length === 0 || schedules.length === 0 || attendanceMap.size === 0) {
    return
  }

  for (const [key, status] of attendanceMap.entries()) {
    const parsed = parseAttendanceKey(key)
    if (!parsed) {
      continue
    }

    const student = findStudentByKeyPart(students, parsed.studentKeyPart)
    const schedule = findScheduleByKeyPart(schedules, parsed.scheduleKeyPart)

    if (!student || !schedule || typeof student.id !== 'number' || typeof schedule.id !== 'number') {
      continue
    }

    await authenticatedFetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: student.id,
        scheduleId: schedule.id,
        status,
      }),
    })
  }
}

export const deleteAttendanceRecords = async (params: {
  authenticatedFetch: AuthenticatedFetch
  group: Group
  unsetAttendanceKeys: Set<string>
}): Promise<void> => {
  const { authenticatedFetch, group, unsetAttendanceKeys } = params

  const students = group.students ?? []
  const schedules = group.schedules ?? []

  if (students.length === 0 || schedules.length === 0 || unsetAttendanceKeys.size === 0) {
    return
  }

  for (const key of unsetAttendanceKeys.values()) {
    const parsed = parseAttendanceKey(key)
    if (!parsed) {
      continue
    }

    const student = findStudentByKeyPart(students, parsed.studentKeyPart)
    const schedule = findScheduleByKeyPart(schedules, parsed.scheduleKeyPart)

    if (!student || !schedule || typeof student.id !== 'number' || typeof schedule.id !== 'number') {
      continue
    }

    await authenticatedFetch(`/api/attendance?studentId=${student.id}&scheduleId=${schedule.id}`, {
      method: 'DELETE',
    })
  }
}

export const loadAttendanceMapForGroup = async (params: {
  authenticatedFetch: AuthenticatedFetch
  group: Group
}): Promise<Map<string, AttendanceStatus>> => {
  const { authenticatedFetch, group } = params

  const schedules = group.schedules ?? []
  const students = group.students ?? []

  if (schedules.length === 0 || students.length === 0) {
    return new Map()
  }

  const schedulesWithIds = schedules.filter(
    (schedule): schedule is GroupSchedule & { id: number } => typeof schedule.id === 'number'
  )

  if (schedulesWithIds.length === 0) {
    return new Map()
  }

  const map = new Map<string, AttendanceStatus>()

  await Promise.all(
    schedulesWithIds.map(async (schedule) => {
      const response = await authenticatedFetch(`/api/attendance?scheduleId=${schedule.id}`)
      if (!response.ok) {
        return
      }
      const records = (await response.json()) as AttendanceRecord[]
      for (const record of records) {
        const student = students.find((s) => s.id === record.studentId)
        const scheduleEntity = schedules.find((s) => s.id === record.scheduleId)
        if (!student || !scheduleEntity) {
          continue
        }
        map.set(makeAttendanceKeyFromEntities(student, scheduleEntity), record.status)
      }
    })
  )

  return map
}

