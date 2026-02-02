export type TeacherId = number

export interface Teacher {
  id: TeacherId
  username: string
  fullName: string
  createdAt?: string
}

export interface UpdateTeacherRequest {
  id: TeacherId
  password?: string
  fullName?: string
}
