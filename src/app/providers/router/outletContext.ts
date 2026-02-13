import type { AuthenticatedFetch } from '../../../features/groups/model/attendance'

export interface AppOutletContext {
  authenticatedFetch: AuthenticatedFetch
  isAdmin: boolean
  isTeacher: boolean
  /** Логин текущего пользователя (из JWT); для учителя — совпадает с teacher.username */
  currentUsername: string
}

