import { Box, Button, Container, Tooltip, Typography } from '@mui/material'
import { Outlet } from 'react-router-dom'
import { BelarusianText } from '../../components/BelarusianText'
import type { AuthenticatedFetch } from '../../features/groups/model/attendance'

export interface AuthenticatedLayoutProps {
  authenticatedFetch: AuthenticatedFetch
  onLogout: () => void
  isAdmin: boolean
  isTeacher: boolean
  username: string
}

function HeaderTitle(props: { isAdmin: boolean; isTeacher: boolean; username: string }) {
  const { isAdmin, isTeacher, username } = props
  if (isAdmin) {
    return (
      <Tooltip title="Журнал администратора" arrow>
        <Typography variant="h4" component="h1" sx={{ cursor: 'default' }}>
          Журнал адміністратара
        </Typography>
      </Tooltip>
    )
  }
  if (isTeacher && username) {
    return (
      <Tooltip title={`Журнал для учителя ${username}`} arrow>
        <Typography variant="h4" component="h1" sx={{ cursor: 'default' }}>
          Журнал для настаўніка {username}
        </Typography>
      </Tooltip>
    )
  }
  return (
    <Tooltip title="Журнал" arrow>
      <Typography variant="h4" component="h1" sx={{ cursor: 'default' }}>
        Журнал
      </Typography>
    </Tooltip>
  )
}

export const AuthenticatedLayout = (props: AuthenticatedLayoutProps) => {
  const { authenticatedFetch, onLogout, isAdmin, isTeacher, username } = props

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#ffffff',
      }}
    >
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
          }}
        >
          <HeaderTitle isAdmin={isAdmin} isTeacher={isTeacher} username={username} />
          <Button variant="outlined" onClick={onLogout}>
            <BelarusianText belarusian="Выйсці" russian="Выйти" />
          </Button>
        </Box>

        <Outlet context={{ authenticatedFetch, isAdmin, isTeacher }} />
      </Container>
    </Box>
  )
}

