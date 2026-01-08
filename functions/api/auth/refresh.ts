import type { PagesFunction } from '@cloudflare/workers-types'
import {
  verifyRefreshToken,
  createAccessToken,
  createRefreshToken,
  saveRefreshToken,
  deleteRefreshToken,
  extractToken,
} from '../../utils/auth'

interface Env {
  DB: D1Database
  JWT_SECRET?: string
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
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

    // Получаем refresh токен из body или заголовка
    const body = await request.json<{ refreshToken?: string }>()
    const refreshToken = body.refreshToken || extractToken(request)

    if (!refreshToken) {
      return new Response(
        JSON.stringify({ error: 'Refresh token is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Проверяем refresh токен
    const userData = await verifyRefreshToken(env.DB, refreshToken, env.JWT_SECRET)

    if (!userData) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired refresh token' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Удаляем старый refresh токен
    await deleteRefreshToken(env.DB, refreshToken)

    // Создаем новые токены
    const jwtSecret = env.JWT_SECRET
    const accessToken = await createAccessToken(userData.userId, userData.username, jwtSecret)
    const newRefreshToken = await createRefreshToken(userData.userId, userData.username, jwtSecret)

    // Сохраняем новый refresh токен
    await saveRefreshToken(env.DB, userData.userId, newRefreshToken)

    return new Response(
      JSON.stringify({
        accessToken,
        refreshToken: newRefreshToken,
        user: {
          id: userData.userId,
          username: userData.username,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Refresh token error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to refresh token' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
