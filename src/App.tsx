import { useState, useEffect, useRef } from 'react'
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Snackbar,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { BelarusianText } from './components/BelarusianText'
import { Teachers } from './components/Teachers'
import { Groups } from './components/Groups'

const theme = createTheme({
  palette: {
    mode: 'light',
    background: {
      default: '#ffffff',
    },
  },
})

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [snackbar, setSnackbar] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error'
  }>({
    open: false,
    message: '',
    severity: 'error',
  })

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity })
  }

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false })
  }

  const refreshTimerRef = useRef<number | null>(null)

  // Проверка авторизации при загрузке
  useEffect(() => {
    const storedAccessToken = localStorage.getItem('accessToken')
    const storedRefreshToken = localStorage.getItem('refreshToken')

    if (storedAccessToken && storedRefreshToken) {
      setAccessToken(storedAccessToken)
      setIsAuthenticated(true)
      // Проверяем валидность токена
      checkTokenAndRefresh()
    }
  }, [])

  // Настройка автоматического обновления токена
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      setupTokenRefresh()
    }

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
      }
    }
  }, [isAuthenticated, accessToken])

  // Проверка и обновление токена
  const checkTokenAndRefresh = async () => {
    const storedAccessToken = localStorage.getItem('accessToken')

    if (!storedAccessToken) {
      handleLogout()
      return
    }

    // Проверяем срок действия access токена
    try {
      const payload = JSON.parse(atob(storedAccessToken.split('.')[1]))
      const expiresAt = payload.exp * 1000
      const now = Date.now()

      // Если токен истекает в течение 2 минут, обновляем
      if (expiresAt - now < 2 * 60 * 1000) {
        await refreshAccessToken()
      }
    } catch (error) {
      console.error('Error checking token:', error)
      await refreshAccessToken()
    }
  }

  // Настройка автоматического обновления токена
  const setupTokenRefresh = () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
    }

    try {
      const payload = JSON.parse(atob(accessToken!.split('.')[1]))
      const expiresAt = payload.exp * 1000
      const now = Date.now()
      const timeUntilExpiry = expiresAt - now - 2 * 60 * 1000 // Обновляем за 2 минуты до истечения

      if (timeUntilExpiry > 0) {
        refreshTimerRef.current = window.setTimeout(() => {
          refreshAccessToken()
        }, timeUntilExpiry)
      } else {
        // Токен уже истекает, обновляем сразу
        refreshAccessToken()
      }
    } catch (error) {
      console.error('Error setting up token refresh:', error)
    }
  }

  // Обновление access токена
  const refreshAccessToken = async () => {
    const storedRefreshToken = localStorage.getItem('refreshToken')
    if (!storedRefreshToken) {
      handleLogout()
      return
    }

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      })

      if (response.ok) {
        const data = await response.json() as {
          accessToken: string
          refreshToken: string
        }
        setAccessToken(data.accessToken)
        localStorage.setItem('accessToken', data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)
        setupTokenRefresh()
      } else {
        handleLogout()
      }
    } catch (error) {
      console.error('Error refreshing token:', error)
      handleLogout()
    }
  }

  // Выход
  const handleLogout = () => {
    setIsAuthenticated(false)
    setAccessToken(null)
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
    }
  }

  // Логин
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    setLoginLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      if (response.ok) {
        const data = await response.json() as {
          accessToken: string
          refreshToken: string
        }
        setAccessToken(data.accessToken)
        setIsAuthenticated(true)
        localStorage.setItem('accessToken', data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)
        setUsername('')
        setPassword('')
      } else {
        const errorData = await response.json() as { error: string }
        const errorMessage = errorData.error || 'Invalid credentials'
        setLoginError(errorMessage)
        showSnackbar(errorMessage, 'error')
      }
    } catch (error) {
      console.error('Login error:', error)
      const errorMessage = 'Failed to login. Please try again.'
      setLoginError(errorMessage)
      showSnackbar(errorMessage, 'error')
    } finally {
      setLoginLoading(false)
    }
  }

  // Запрос с автоматическим обновлением токена при 401
  const authenticatedFetch = async (
    url: string,
    options: RequestInit = {}
  ) => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      handleLogout()
      throw new Error('Not authenticated')
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    })

    // Если получили 401, пробуем обновить токен
    if (response.status === 401) {
      await refreshAccessToken()
      const newToken = localStorage.getItem('accessToken')
      if (newToken) {
        // Повторяем запрос с новым токеном
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${newToken}`,
          },
        })
      } else {
        handleLogout()
        throw new Error('Authentication failed')
      }
    }

    return response
  }

  // Форма логина
  if (!isAuthenticated) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            minHeight: '100vh',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Container sx={{ width: '400px' }}>
            <Paper
              elevation={3}
              sx={{
                p: 4,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <Typography variant="h4" component="h1" align="center" gutterBottom>
                <BelarusianText belarusian="Уваход" russian="Вход" />
              </Typography>

              {loginError && (
                <Alert severity="error">
                  <BelarusianText
                    belarusian="Памылка ўваходу"
                    russian="Ошибка входа"
                  />
                  : {loginError}
                </Alert>
              )}

              <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Tooltip title="Логин" arrow>
                  <TextField
                    label="Лагін"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    fullWidth
                  />
                </Tooltip>
                <Tooltip title="Пароль" arrow>
                  <TextField
                    label="Пароль"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    fullWidth
                  />
                </Tooltip>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loginLoading}
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  {loginLoading ? (
                    <BelarusianText
                      belarusian="Уваход..."
                      russian="Вход..."
                    />
                  ) : (
                    <BelarusianText belarusian="Увайсці" russian="Войти" />
                  )}
                </Button>
              </Box>
            </Paper>
          </Container>
        </Box>

        {/* Тостер для ошибок входа */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </ThemeProvider>
    )
  }

  // Основное приложение
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
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
            <Button variant="outlined" onClick={handleLogout}>
              <BelarusianText belarusian="Выйсці" russian="Выйти" />
            </Button>
          </Box>

          <Box>
            <Accordion defaultExpanded={false}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>
                  <BelarusianText belarusian="Групы" russian="Группы" />
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Groups authenticatedFetch={authenticatedFetch} />
              </AccordionDetails>
            </Accordion>

            <Accordion defaultExpanded={false}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>
                  <BelarusianText
                    belarusian="Выкладчыкі"
                    russian="Преподаватели"
                  />
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Teachers
                  authenticatedFetch={authenticatedFetch}
                />
              </AccordionDetails>
            </Accordion>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  )
}

export default App
