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

    const user = await getUserByUsername(supabase, body.username)
    if (user) {
      const valid = await verifyPassword(body.password, user.passwordHash)
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
    if (!teacher) return jsonResponse({ error: 'Invalid credentials' }, 401)
    const valid = await verifyPassword(body.password, teacher.passwordHash)
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
    console.error('Login error:', err)
    return jsonResponse({ error: 'Failed to login' }, 500)
  }
})
