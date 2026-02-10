import type { D1Database, PagesFunction } from '@cloudflare/workers-types'
import { verifyJWT, extractToken } from '../utils/auth'

interface Env {
  DB: D1Database
  JWT_SECRET?: string
}

// Middleware для проверки авторизации
export function requireAuth(handler: PagesFunction<Env>): PagesFunction<Env> {
  return (async (context) => {
    const { request, env } = context

    // Извлекаем токен из заголовка
    const token = extractToken(request)

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No token provided' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Проверяем токен
    const payload = await verifyJWT(token, env.JWT_SECRET)

    if (!payload || payload.type !== 'access') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Добавляем информацию о пользователе в context для использования в handler
    ;(context as any).user = {
      id: payload.userId,
      username: payload.username,
      role: payload.role,
    }

    return handler(context)
  }) as PagesFunction<Env>
}
