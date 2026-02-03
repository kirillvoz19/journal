import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { AuthenticatedFetch } from '../../../features/groups/model/attendance'
import { AuthenticatedLayout } from '../../layouts/AuthenticatedLayout'
import { HomePage } from '../../../pages/home/ui/HomePage'
import { GroupCreatePage } from '../../../pages/groups/create/ui/GroupCreatePage'
import { GroupEditPage } from '../../../pages/groups/edit/ui/GroupEditPage'

export interface AppRouterProps {
  authenticatedFetch: AuthenticatedFetch
  onLogout: () => void
}

export const AppRouter = (props: AppRouterProps) => {
  const { authenticatedFetch, onLogout } = props

  return (
    <HashRouter>
      <Routes>
        <Route
          path="/"
          element={
            <AuthenticatedLayout
              authenticatedFetch={authenticatedFetch}
              onLogout={onLogout}
            />
          }
        >
          <Route index element={<HomePage />} />
          <Route path="groups/new" element={<GroupCreatePage />} />
          <Route path="groups/:groupId/edit" element={<GroupEditPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

