import type { AttendanceStatus, GroupSchedule, GroupStudent } from '../../../model/types'

export type ScheduleStripProps = {
  schedules: GroupSchedule[]
  students: GroupStudent[]
  attendanceMap: Map<string, AttendanceStatus>
  disabled?: boolean
  onAddLesson: (params?: { isoDate?: string }) => void
  onAddStudent: () => void
  onEditStudent: (index: number) => void
  onDeleteStudent: (index: number) => void
  onEditLesson: (params: { schedule: GroupSchedule }) => void
  onDeleteLesson: (params: { schedule: GroupSchedule }) => void
}
