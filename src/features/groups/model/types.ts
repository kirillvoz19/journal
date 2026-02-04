import type { Teacher } from '../../../entities/teacher/model/types'
export type { Teacher }

export interface GroupSchedule {
  id?: number
  date: string
  startTime: string
  endTime: string
  isTrialLesson?: boolean
  comment?: string
}

export interface GroupStudent {
  id?: number
  fullName: string
  email?: string
  phone?: string
}

export interface Group {
  id?: number
  name: string
  teacherId: number
  teacherFullName?: string
  subject: string
  customSubject?: string
  level: string
  createdAt?: string
  schedules?: GroupSchedule[]
  students?: GroupStudent[]
}

export type AttendanceStatus = 'present' | 'absent'
export type AttendanceEditStatus = AttendanceStatus | 'unset'

export interface AttendanceRecord {
  id?: number
  studentId: number
  scheduleId: number
  status: AttendanceStatus
  createdAt?: string
}

