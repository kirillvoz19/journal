import { Box, Button, Container, Typography } from '@mui/material'
import { Outlet } from 'react-router-dom'
import { BelarusianText } from '../../components/BelarusianText'
import type { AuthenticatedFetch } from '../../features/groups/model/attendance'

export interface AuthenticatedLayoutProps {
  authenticatedFetch: AuthenticatedFetch
  onLogout: () => void
}

export const AuthenticatedLayout = (props: AuthenticatedLayoutProps) => {
  const { authenticatedFetch, onLogout } = props

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
          <Typography variant="h4" component="h1">
            <BelarusianText belarusian="Журнал" russian="Журнал" />
          </Typography>
          <Button variant="outlined" onClick={onLogout}>
            <BelarusianText belarusian="Выйсці" russian="Выйти" />
          </Button>
        </Box>

        <Outlet context={{ authenticatedFetch }} />
      </Container>
    </Box>
  )
}

