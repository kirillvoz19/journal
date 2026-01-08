import { useState, useEffect, useRef } from 'react'
import './App.css'

interface JournalEntry {
  id?: number
  title: string
  content: string
  createdAt?: string
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

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
        const data = await response.json() as { accessToken: string; refreshToken: string }
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
    setEntries([])
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
        const data = await response.json() as { accessToken: string; refreshToken: string }
        setAccessToken(data.accessToken)
        setIsAuthenticated(true)
        localStorage.setItem('accessToken', data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)
        setUsername('')
        setPassword('')
        fetchEntries()
      } else {
        const errorData = await response.json() as { error: string }
        setLoginError(errorData.error || 'Invalid credentials')
      }
    } catch (error) {
      console.error('Login error:', error)
      setLoginError('Failed to login. Please try again.')
    } finally {
      setLoginLoading(false)
    }
  }

  // Запрос с автоматическим обновлением токена при 401
  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
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

  // Загрузка записей
  const fetchEntries = async () => {
    try {
      setLoading(true)
      const response = await authenticatedFetch('/api/entries')
      if (response.ok) {
        const data = await response.json() as JournalEntry[]
        setEntries(data as JournalEntry[])
      } else if (response.status === 401) {
        handleLogout()
      }
    } catch (error) {
      console.error('Error fetching entries:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchEntries()
    }
  }, [isAuthenticated])

  // Создание записи
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return

    try {
      setLoading(true)
      const response = await authenticatedFetch('/api/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, content }),
      })

      if (response.ok) {
        setTitle('')
        setContent('')
        fetchEntries()
      } else if (response.status === 401) {
        handleLogout()
      }
    } catch (error) {
      console.error('Error creating entry:', error)
    } finally {
      setLoading(false)
    }
  }

  // Форма логина
  if (!isAuthenticated) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>📔 Journal</h1>
        </header>

        <main className="app-main">
          <section className="login-form">
            <h2>Login</h2>
            <form onSubmit={handleLogin}>
              {loginError && <div className="error-message">{loginError}</div>}
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                required
              />
              <button type="submit" disabled={loginLoading} className="button">
                {loginLoading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          </section>
        </main>
      </div>
    )
  }

  // Основное приложение
  return (
    <div className="app">
      <header className="app-header">
        <h1>📔 Journal</h1>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </header>

      <main className="app-main">
        <section className="entry-form">
          <h2>New Entry</h2>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
            />
            <textarea
              placeholder="Write your thoughts..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="textarea"
              rows={6}
            />
            <button type="submit" disabled={loading} className="button">
              {loading ? 'Saving...' : 'Save Entry'}
            </button>
          </form>
        </section>

        <section className="entries-list">
          <h2>Entries</h2>
          {loading && entries.length === 0 ? (
            <p>Loading...</p>
          ) : entries.length === 0 ? (
            <p className="empty-state">No entries yet. Create your first entry!</p>
          ) : (
            <div className="entries">
              {entries.map((entry) => (
                <article key={entry.id} className="entry-card">
                  <h3>{entry.title}</h3>
                  <p className="entry-date">
                    {entry.createdAt
                      ? new Date(entry.createdAt).toLocaleDateString()
                      : ''}
                  </p>
                  <p className="entry-content">{entry.content}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
