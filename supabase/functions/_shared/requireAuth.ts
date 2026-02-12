import { verifyJWT, extractToken } from './auth.ts'
import { jsonResponse } from './cors.ts'

export interface AuthUser {
  id: number
  username: string
  role?: string
}

export async function requireAuth(request: Request): Promise<{ user: AuthUser } | Response> {
  const token = extractToken(request)
  if (!token) return jsonResponse({ error: 'Unauthorized - No token provided' }, 401)
  const secret = Deno.env.get('JWT_SECRET')
  const payload = await verifyJWT(token, secret)
  if (!payload || payload.type !== 'access') {
    return jsonResponse({ error: 'Unauthorized - Invalid token' }, 401)
  }
  return {
    user: { id: payload.userId, username: payload.username, role: payload.role },
  }
}
