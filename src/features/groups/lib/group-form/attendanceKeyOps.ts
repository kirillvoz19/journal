import {
  getScheduleAttendanceKeyPart,
  getStudentAttendanceKeyPart,
  makeAttendanceKey,
} from '../../model/attendance'
import type { AttendanceStatus, GroupSchedule, GroupStudent } from '../../model/types'

export const migrateStudentKeys = (params: {
  schedules: GroupSchedule[]
  fromStudent: GroupStudent
  toStudent: GroupStudent
  attendanceMap: Map<string, AttendanceStatus>
  unsetAttendanceKeys: Set<string>
}): { attendanceMap: Map<string, AttendanceStatus>; unsetAttendanceKeys: Set<string> } => {
  const { schedules, fromStudent, toStudent, attendanceMap, unsetAttendanceKeys } = params

  const fromPart = getStudentAttendanceKeyPart(fromStudent)
  const toPart = getStudentAttendanceKeyPart(toStudent)

  if (fromPart === toPart) return { attendanceMap, unsetAttendanceKeys }

  const nextMap = new Map(attendanceMap)
  const nextUnset = new Set(unsetAttendanceKeys)

  for (const schedule of schedules) {
    const schedulePart = getScheduleAttendanceKeyPart(schedule)
    const fromKey = makeAttendanceKey(fromPart, schedulePart)
    const toKey = makeAttendanceKey(toPart, schedulePart)

    const existing = nextMap.get(fromKey)
    if (existing) {
      nextMap.delete(fromKey)
      nextMap.set(toKey, existing)
    }

    if (nextUnset.has(fromKey)) {
      nextUnset.delete(fromKey)
      nextUnset.add(toKey)
    }
  }

  return { attendanceMap: nextMap, unsetAttendanceKeys: nextUnset }
}

export const removeAttendanceForStudent = (params: {
  schedules: GroupSchedule[]
  student: GroupStudent
  attendanceMap: Map<string, AttendanceStatus>
  unsetAttendanceKeys: Set<string>
}): { attendanceMap: Map<string, AttendanceStatus>; unsetAttendanceKeys: Set<string> } => {
  const { schedules, student, attendanceMap, unsetAttendanceKeys } = params
  const studentPart = getStudentAttendanceKeyPart(student)

  const nextMap = new Map(attendanceMap)
  const nextUnset = new Set(unsetAttendanceKeys)

  for (const schedule of schedules) {
    const schedulePart = getScheduleAttendanceKeyPart(schedule)
    const key = makeAttendanceKey(studentPart, schedulePart)
    nextMap.delete(key)
    nextUnset.delete(key)
  }

  return { attendanceMap: nextMap, unsetAttendanceKeys: nextUnset }
}

export const removeAttendanceForSchedule = (params: {
  students: GroupStudent[]
  schedule: GroupSchedule
  attendanceMap: Map<string, AttendanceStatus>
  unsetAttendanceKeys: Set<string>
}): { attendanceMap: Map<string, AttendanceStatus>; unsetAttendanceKeys: Set<string> } => {
  const { students, schedule, attendanceMap, unsetAttendanceKeys } = params
  const schedulePart = getScheduleAttendanceKeyPart(schedule)

  const nextMap = new Map(attendanceMap)
  const nextUnset = new Set(unsetAttendanceKeys)

  for (const student of students) {
    const studentPart = getStudentAttendanceKeyPart(student)
    const key = makeAttendanceKey(studentPart, schedulePart)
    nextMap.delete(key)
    nextUnset.delete(key)
  }

  return { attendanceMap: nextMap, unsetAttendanceKeys: nextUnset }
}

