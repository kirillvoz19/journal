export type TeacherId = number

export type TeacherPasswordsByTeacherId = Record<string, string>

const STORAGE_KEY = 'teacherPasswordsByTeacherId:v1'

const isRecord = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null) return false
  return true
}

export const readTeacherPasswordsFromStorage = (): TeacherPasswordsByTeacherId => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}

    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return {}

    const result: TeacherPasswordsByTeacherId = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string' && value.trim().length > 0) {
        result[key] = value
      }
    }

    return result
  } catch {
    return {}
  }
}

export const writeTeacherPasswordsToStorage = (
  passwords: TeacherPasswordsByTeacherId
): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(passwords))
  } catch {
    // ignore storage errors (quota, disabled, etc.)
  }
}

export const getTeacherPassword = (
  passwords: TeacherPasswordsByTeacherId,
  teacherId: TeacherId
): string | undefined => passwords[String(teacherId)]

export const upsertTeacherPassword = (
  prev: TeacherPasswordsByTeacherId,
  teacherId: TeacherId,
  password: string
): TeacherPasswordsByTeacherId => {
  const trimmedPassword = password.trim()
  if (!trimmedPassword) return prev

  return { ...prev, [String(teacherId)]: trimmedPassword }
}

export const removeTeacherPassword = (
  prev: TeacherPasswordsByTeacherId,
  teacherId: TeacherId
): TeacherPasswordsByTeacherId => {
  const key = String(teacherId)
  if (!Object.prototype.hasOwnProperty.call(prev, key)) return prev

  const next: TeacherPasswordsByTeacherId = { ...prev }
  delete next[key]
  return next
}
