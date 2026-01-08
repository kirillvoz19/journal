import type { D1Database, PagesFunction } from '@cloudflare/workers-types'
import {
  verifyPassword,
  createAccessToken,
  createRefreshToken,
  saveRefreshToken,
  getUserByUsername,
} from '../../utils/auth'

interface Env {
  DB: D1Database
  JWT_SECRET?: string
}

// @ts-ignore
export const onRequestPost: PagesFunction<Env> = async (context): Promise<Response> => {
  const { env, request } = context

  try {
    if (!env.DB) {
      return new Response(
        JSON.stringify({ error: 'Database not configured' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const body = (await request.json()) as { username: string; password: string }

    if (!body.username || !body.password) {
      return new Response(
        JSON.stringify({ error: 'Username and password are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Получаем пользователя из БД
    const user = await getUserByUsername(env.DB, body.username)

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Проверяем пароль
    const isValidPassword = await verifyPassword(body.password, user.passwordHash)

    if (!isValidPassword) {
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Создаем токены
    const jwtSecret = env.JWT_SECRET
    const accessToken = await createAccessToken(user.id, user.username, jwtSecret)
    const refreshToken = await createRefreshToken(user.id, user.username, jwtSecret)

    // Сохраняем refresh токен в БД
    await saveRefreshToken(env.DB, user.id, refreshToken)

    return new Response(
      JSON.stringify({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Login error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to login' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
