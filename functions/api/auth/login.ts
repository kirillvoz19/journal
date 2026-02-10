import type { D1Database, PagesFunction } from '@cloudflare/workers-types'
import {
  verifyPassword,
  createAccessToken,
  createRefreshToken,
  saveRefreshToken,
  saveTeacherRefreshToken,
  getUserByUsername,
  getTeacherByUsername,
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

    // Сначала пробуем пользователя (users — админ)
    const user = await getUserByUsername(env.DB, body.username)

    if (user) {
      const isValidPassword = await verifyPassword(body.password, user.passwordHash)
      if (!isValidPassword) {
        return new Response(
          JSON.stringify({ error: 'Invalid credentials' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      }
      const jwtSecret = env.JWT_SECRET
      const accessToken = await createAccessToken(user.id, user.username, jwtSecret, user.role)
      const refreshToken = await createRefreshToken(user.id, user.username, jwtSecret, user.role)
      await saveRefreshToken(env.DB, user.id, refreshToken)
      return new Response(
        JSON.stringify({
          accessToken,
          refreshToken,
          user: { id: user.id, username: user.username, role: user.role ?? undefined },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Пробуем преподавателя (teachers)
    const teacher = await getTeacherByUsername(env.DB, body.username)
    if (!teacher) {
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }
    const isValidTeacherPassword = await verifyPassword(body.password, teacher.passwordHash)
    if (!isValidTeacherPassword) {
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const jwtSecret = env.JWT_SECRET
    const accessToken = await createAccessToken(teacher.id, teacher.username, jwtSecret, 'teacher')
    const refreshToken = await createRefreshToken(teacher.id, teacher.username, jwtSecret, 'teacher')
    await saveTeacherRefreshToken(env.DB, teacher.id, refreshToken)

    return new Response(
      JSON.stringify({
        accessToken,
        refreshToken,
        user: { id: teacher.id, username: teacher.username, role: 'teacher' },
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
