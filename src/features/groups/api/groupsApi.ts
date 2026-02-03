import type { Teacher } from '../../../entities/teacher/model/types'
import type { AuthenticatedFetch } from '../model/attendance'
import type { Group } from '../model/types'

export const fetchTeachers = async (params: {
  authenticatedFetch: AuthenticatedFetch
}): Promise<Teacher[]> => {
  const { authenticatedFetch } = params
  const response = await authenticatedFetch('/api/teachers')
  if (!response.ok) return []
  return (await response.json()) as Teacher[]
}

export const fetchGroups = async (params: {
  authenticatedFetch: AuthenticatedFetch
}): Promise<Group[]> => {
  const { authenticatedFetch } = params
  const response = await authenticatedFetch('/api/groups')
  if (!response.ok) return []
  return (await response.json()) as Group[]
}

export const fetchGroupById = async (params: {
  authenticatedFetch: AuthenticatedFetch
  groupId: number
}): Promise<Group | null> => {
  const { authenticatedFetch, groupId } = params
  const groups = await fetchGroups({ authenticatedFetch })
  const found = groups.find((g) => g.id === groupId)
  return found ?? null
}

export const createGroup = async (params: {
  authenticatedFetch: AuthenticatedFetch
  payload: Omit<Group, 'id' | 'teacherFullName' | 'createdAt'>
}): Promise<{ group: Group } | { error: string }> => {
  const { authenticatedFetch, payload } = params

  const response = await authenticatedFetch('/api/groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const body = (await response.json()) as { error?: string }
    return { error: body.error || 'Памылка пры даданні групы' }
  }

  const group = (await response.json()) as Group
  return { group }
}

export const updateGroup = async (params: {
  authenticatedFetch: AuthenticatedFetch
  payload: Required<Pick<Group, 'id'>> &
    Omit<Group, 'teacherFullName' | 'createdAt'>
}): Promise<{ group: Group } | { error: string }> => {
  const { authenticatedFetch, payload } = params

  const response = await authenticatedFetch('/api/groups', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const body = (await response.json()) as { error?: string }
    return { error: body.error || 'Памылка пры рэдагаванні групы' }
  }

  const group = (await response.json()) as Group
  return { group }
}

export const deleteGroup = async (params: {
  authenticatedFetch: AuthenticatedFetch
  groupId: number
}): Promise<{ ok: true } | { error: string }> => {
  const { authenticatedFetch, groupId } = params

  const response = await authenticatedFetch(`/api/groups?id=${groupId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const body = (await response.json()) as { error?: string }
    return { error: body.error || 'Памылка пры выдаленні групы' }
  }

  return { ok: true }
}

