export type TeacherId = number

export interface Teacher {
  id: TeacherId
  username: string
  fullName: string
  createdAt?: string
  /** Только в ответе POST при создании (чтобы показать сгенерированный пароль); в БД не хранится */
  password?: string
}

export interface UpdateTeacherRequest {
  id: TeacherId
  password?: string
  fullName?: string
}
