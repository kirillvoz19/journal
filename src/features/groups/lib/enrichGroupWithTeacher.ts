import type { Teacher } from '../../../entities/teacher/model/types'
import type { Group } from '../model/types'

export const enrichGroupWithTeacher = (params: {
  group: Group
  teachers: Teacher[]
}): Group => {
  const { group, teachers } = params
  const teacher = teachers.find((t) => t.id === group.teacherId)
  return {
    ...group,
    teacherFullName: teacher?.fullName || '',
  }
}

export const enrichGroupsWithTeachers = (params: {
  groups: Group[]
  teachers: Teacher[]
}): Group[] => {
  const { groups, teachers } = params
  return groups.map((group) => enrichGroupWithTeacher({ group, teachers }))
}

