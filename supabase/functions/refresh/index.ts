import { getSupabaseAdmin } from '../_shared/db.ts'
import {
  verifyRefreshToken,
  createAccessToken,
  createRefreshToken,
  saveRefreshToken,
  saveTeacherRefreshToken,
  deleteRefreshToken,
  extractToken,
} from '../_shared/auth.ts'
import { corsResponse, jsonResponse } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const body = await req.json().catch(() => ({})) as { refreshToken?: string }
    const refreshToken = body.refreshToken ?? extractToken(req)
    if (!refreshToken) {
      return jsonResponse({ error: 'Refresh token is required' }, 400)
    }

    const supabase = getSupabaseAdmin()
    const jwtSecret = Deno.env.get('JWT_SECRET')
    const userData = await verifyRefreshToken(supabase, refreshToken, jwtSecret)
    if (!userData) {
      return jsonResponse({ error: 'Invalid or expired refresh token' }, 401)
    }

    await deleteRefreshToken(supabase, refreshToken)
    const accessToken = await createAccessToken(userData.userId, userData.username, jwtSecret, userData.role)
    const newRefreshToken = await createRefreshToken(userData.userId, userData.username, jwtSecret, userData.role)
    if (userData.role === 'teacher') {
      await saveTeacherRefreshToken(supabase, userData.userId, newRefreshToken)
    } else {
      await saveRefreshToken(supabase, userData.userId, newRefreshToken)
    }

    return jsonResponse({
      accessToken,
      refreshToken: newRefreshToken,
      user: { id: userData.userId, username: userData.username, role: userData.role ?? undefined },
    })
  } catch (err) {
    console.error('Refresh error:', err)
    return jsonResponse({ error: 'Failed to refresh token' }, 500)
  }
})
