import { useState, useEffect, useRef } from 'react'
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  Tooltip,
  Snackbar,
} from '@mui/material'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { BelarusianText } from './components/BelarusianText'
import { getJwtExpiryMs, getJwtPayload } from './shared/lib/auth/jwt'
import {
  clearTokensFromStorage,
  readAccessTokenFromStorage,
  readRefreshTokenFromStorage,
  writeTokensToStorage,
  type AuthTokens,
} from './shared/lib/auth/tokens'
import { getApiUrl, getSupabaseRequestHeaders, isSupabaseBackend } from './shared/lib/api/baseUrl'
import { AppRouter } from './app/providers/router/AppRouter'

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
    setSnackbar((prev) => ({ ...prev, open: false }))
  }

  const refreshTimerRef = useRef<number | null>(null)
  const refreshInFlightRef = useRef<Promise<boolean> | null>(null)

  const jwtPayload = accessToken ? getJwtPayload(accessToken) : null
  const isAdmin = !!accessToken && jwtPayload?.role === 'admin'
  const isTeacher = !!accessToken && jwtPayload?.role === 'teacher'
  const authUsername = jwtPayload?.username ?? ''

  const TOKEN_REFRESH_EARLY_MS = 2 * 60 * 1000
  const MIN_REFRESH_RETRY_DELAY_MS = 1000

  // Проверка авторизации при загрузке
  useEffect(() => {
    const storedAccessToken = readAccessTokenFromStorage()
    const storedRefreshToken = readRefreshTokenFromStorage()

    if (storedAccessToken && storedRefreshToken) {
      setAccessToken(storedAccessToken)
      setIsAuthenticated(true)
      // Проверяем валидность токена
      void checkTokenAndRefresh(storedAccessToken)
    }
  }, [])

  // Настройка автоматического обновления токена
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      setupTokenRefresh(accessToken)
    }

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
      }
    }
  }, [isAuthenticated, accessToken])

  // Проверка и обновление токена
  const checkTokenAndRefresh = async (token: string) => {
    const expiresAtMs = getJwtExpiryMs(token)
    if (!expiresAtMs) {
      await refreshAccessToken()
      return
    }

    const nowMs = Date.now()
    if (expiresAtMs - nowMs < TOKEN_REFRESH_EARLY_MS) {
      await refreshAccessToken()
    }
  }

  // Настройка автоматического обновления токена
  const setupTokenRefresh = (token: string) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
    }

    const expiresAtMs = getJwtExpiryMs(token)
    if (!expiresAtMs) return

    const nowMs = Date.now()
    const refreshInMs = expiresAtMs - nowMs - TOKEN_REFRESH_EARLY_MS

    if (refreshInMs > 0) {
      refreshTimerRef.current = window.setTimeout(() => {
        void refreshAccessToken()
      }, refreshInMs)
      return
    }

    // Токен уже "на пороге" истечения — рефрешим один раз,
    // но не допускаем рекурсивного каскада.
    refreshTimerRef.current = window.setTimeout(() => {
      void refreshAccessToken()
    }, MIN_REFRESH_RETRY_DELAY_MS)
  }

  // Обновление access токена
  const refreshAccessToken = async () => {
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current
    }

    const storedRefreshToken = localStorage.getItem('refreshToken')
    if (!storedRefreshToken) {
      handleLogout()
      return false
    }

    const runRefresh = async (): Promise<boolean> => {
      try {
        const response = await fetch(getApiUrl('/api/auth/refresh'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getSupabaseRequestHeaders(),
          },
          body: JSON.stringify({ refreshToken: storedRefreshToken }),
        })

        if (!response.ok) {
          handleLogout()
          return false
        }

        const data = (await response.json()) as AuthTokens
        if (!data.accessToken || !data.refreshToken) {
          handleLogout()
          return false
        }

        setAccessToken(data.accessToken)
        writeTokensToStorage(data)
        setupTokenRefresh(data.accessToken)
        return true
      } catch (error) {
        console.error('Error refreshing token:', error)
        handleLogout()
        return false
      }
    }

    const refreshPromise = runRefresh().finally(() => {
      refreshInFlightRef.current = null
    })

    refreshInFlightRef.current = refreshPromise
    return refreshPromise
  }

  // Выход
  const handleLogout = () => {
    setIsAuthenticated(false)
    setAccessToken(null)
    clearTokensFromStorage()
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
      const response = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getSupabaseRequestHeaders(),
        },
        body: JSON.stringify({ username, password }),
      })

      if (response.ok) {
        const data = (await response.json()) as AuthTokens
        setAccessToken(data.accessToken)
        setIsAuthenticated(true)
        writeTokensToStorage(data)
        setUsername('')
        setPassword('')
        setupTokenRefresh(data.accessToken)
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
    const resolvedUrl = getApiUrl(url)
    // Никогда не запускаем refresh из самого refresh-endpoint
    if (resolvedUrl.includes('/refresh')) {
      return fetch(resolvedUrl, options)
    }

    const token = readAccessTokenFromStorage()
    if (!token) {
      handleLogout()
      throw new Error('Not authenticated')
    }

    const response = await fetch(resolvedUrl, {
      ...options,
      headers: {
        ...options.headers,
        ...(isSupabaseBackend() ? getSupabaseRequestHeaders(token) : { Authorization: `Bearer ${token}` }),
      },
    })

    // Если получили 401, пробуем обновить токен
    if (response.status === 401) {
      const didRefreshSucceed = await refreshAccessToken()
      if (!didRefreshSucceed) {
        throw new Error('Authentication failed')
      }

      const newToken = readAccessTokenFromStorage()
      if (!newToken) {
        handleLogout()
        throw new Error('Authentication failed')
      }

      const retriedResponse = await fetch(resolvedUrl, {
        ...options,
        headers: {
          ...options.headers,
          ...(isSupabaseBackend() ? getSupabaseRequestHeaders(newToken) : { Authorization: `Bearer ${newToken}` }),
        },
      })

      if (retriedResponse.status === 401) {
        handleLogout()
        throw new Error('Authentication failed')
      }

      return retriedResponse
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
      <AppRouter
        authenticatedFetch={authenticatedFetch}
        onLogout={handleLogout}
        isAdmin={isAdmin}
        isTeacher={isTeacher}
        username={authUsername}
      />
    </ThemeProvider>
  )
}

export default App
