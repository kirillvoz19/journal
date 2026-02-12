import { getSupabaseAdmin } from '../_shared/db.ts'
import {
  verifyPassword,
  createAccessToken,
  createRefreshToken,
  saveRefreshToken,
  saveTeacherRefreshToken,
  getUserByUsername,
  getTeacherByUsername,
} from '../_shared/auth.ts'
import { corsResponse, jsonResponse } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  // Лог каждого запроса — смотреть в Invocations / по execution_id
  console.log('[login] request:', req.method, new URL(req.url).pathname)

  if (req.method === 'OPTIONS') return corsResponse()

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const body = (await req.json()) as { username?: string; password?: string }
    if (!body.username || !body.password) {
      return jsonResponse({ error: 'Username and password are required' }, 400)
    }

    const supabase = getSupabaseAdmin()
    const jwtSecret = Deno.env.get('JWT_SECRET')

    // Временное логирование для отладки 401 (удалить после тестов)
    console.log('[login] username:', body.username, '| password from request:', body.password)

    const user = await getUserByUsername(supabase, body.username)
    if (user) {
      console.log('[login] user found, stored hash prefix:', user.passwordHash?.slice(0, 30) + '...')
      const valid = await verifyPassword(body.password, user.passwordHash)
      console.log('[login] verifyPassword result:', valid)
      if (!valid) return jsonResponse({ error: 'Invalid credentials' }, 401)
      const accessToken = await createAccessToken(user.id, user.username, jwtSecret, user.role)
      const refreshToken = await createRefreshToken(user.id, user.username, jwtSecret, user.role)
      await saveRefreshToken(supabase, user.id, refreshToken)
      return jsonResponse({
        accessToken,
        refreshToken,
        user: { id: user.id, username: user.username, role: user.role ?? undefined },
      })
    }

    const teacher = await getTeacherByUsername(supabase, body.username)
    if (!teacher) {
      console.log('[login] no user and no teacher for username:', body.username)
      return jsonResponse({ error: 'Invalid credentials' }, 401)
    }
    console.log('[login] teacher found, stored hash prefix:', teacher.passwordHash?.slice(0, 30) + '...')
    const valid = await verifyPassword(body.password, teacher.passwordHash)
    console.log('[login] teacher verifyPassword result:', valid)
    if (!valid) return jsonResponse({ error: 'Invalid credentials' }, 401)
    const accessToken = await createAccessToken(teacher.id, teacher.username, jwtSecret, 'teacher')
    const refreshToken = await createRefreshToken(teacher.id, teacher.username, jwtSecret, 'teacher')
    await saveTeacherRefreshToken(supabase, teacher.id, refreshToken)
    return jsonResponse({
      accessToken,
      refreshToken,
      user: { id: teacher.id, username: teacher.username, role: 'teacher' },
    })
  } catch (err) {
    console.error('[login] Login error:', err)
    console.error('[login] stack:', err instanceof Error ? err.stack : 'no stack')
    return jsonResponse({ error: 'Failed to login' }, 500)
  }
})
