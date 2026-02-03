import type { FC } from 'react'
import type { AuthenticatedFetch } from '../features/groups/model/attendance'
import { GroupsTable } from '../features/groups/ui/groups-table/GroupsTable'

export interface GroupsProps {
  authenticatedFetch: AuthenticatedFetch
}

export const Groups: FC<GroupsProps> = ({ authenticatedFetch }) => {
  return <GroupsTable authenticatedFetch={authenticatedFetch} />
}
