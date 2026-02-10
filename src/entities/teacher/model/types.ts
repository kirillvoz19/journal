export type TeacherId = number

export interface Teacher {
  id: TeacherId
  username: string
  fullName: string
  createdAt?: string
  /** Present only for admin: plaintext password for viewing/sharing */
  password?: string
}

export interface UpdateTeacherRequest {
  id: TeacherId
  password?: string
  fullName?: string
}
