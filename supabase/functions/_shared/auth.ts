// JWT + password helpers for Edge Functions (Deno). DB operations use Supabase client.

const ACCESS_TOKEN_EXPIRY_MS = 15 * 60 * 1000
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000
const PBKDF2_ITERATIONS = 100000
const PBKDF2_KEY_LENGTH = 256
const SALT_LENGTH = 16

function getJWTSecret(): string {
  return Deno.env.get('JWT_SECRET') || 'your-secret-key-change-in-production'
}

function base64UrlEncode(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  return atob(str)
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    PBKDF2_KEY_LENGTH
  )
  const saltB64 = btoa(String.fromCharCode(...salt)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(hashBuffer))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  return `${saltB64}:${hashB64}`
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const [saltBase64, hashBase64] = storedHash.split(':')
    if (!saltBase64 || !hashBase64) return verifyPasswordLegacy(password, storedHash)
    const salt = Uint8Array.from(atob(saltBase64.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
    const storedHashArray = Uint8Array.from(atob(hashBase64.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
    const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
    const computedHashBuffer = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
      keyMaterial,
      PBKDF2_KEY_LENGTH
    )
    const computedHash = new Uint8Array(computedHashBuffer)
    if (computedHash.length !== storedHashArray.length) return false
    let isEqual = true
    for (let i = 0; i < computedHash.length; i++) {
      if (computedHash[i] !== storedHashArray[i]) isEqual = false
    }
    return isEqual
  } catch {
    return false
  }
}

async function verifyPasswordLegacy(password: string, hash: string): Promise<boolean> {
  const data = new TextEncoder().encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const passwordHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return passwordHash === hash
}

interface JWTPayload {
  userId: number
  username: string
  role?: string
  type: 'access' | 'refresh'
  exp: number
  iat: number
}

export async function createJWT(
  payload: Omit<JWTPayload, 'exp' | 'iat'>,
  expiresInMs: number,
  secret?: string
): Promise<string> {
  const jwtSecret = secret ?? getJWTSecret()
  const now = Math.floor(Date.now() / 1000)
  const jwtPayload: JWTPayload = {
    ...payload,
    exp: now + Math.floor(expiresInMs / 1000),
    iat: now,
  }
  const header = { alg: 'HS256', typ: 'JWT' }
  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload))
  const signatureInput = `${encodedHeader}.${encodedPayload}`
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(jwtSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signatureInput))
  const signature = base64UrlEncode(String.fromCharCode(...new Uint8Array(signatureBuffer)))
  return `${encodedHeader}.${encodedPayload}.${signature}`
}

export async function verifyJWT(token: string, secret?: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [encodedHeader, encodedPayload, signature] = parts
    const jwtSecret = secret ?? getJWTSecret()
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(jwtSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )
    const signatureBuffer = Uint8Array.from(
      atob(signature.replace(/-/g, '+').replace(/_/g, '/')).split('').map((c) => c.charCodeAt(0))
    )
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBuffer,
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
    )
    if (!isValid) return null
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as JWTPayload
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

export async function createAccessToken(
  userId: number,
  username: string,
  secret?: string,
  role?: string | null
): Promise<string> {
  return createJWT({ userId, username, role: role ?? undefined, type: 'access' }, ACCESS_TOKEN_EXPIRY_MS, secret)
}

export async function createRefreshToken(
  userId: number,
  username: string,
  secret?: string,
  role?: string | null
): Promise<string> {
  return createJWT({ userId, username, role: role ?? undefined, type: 'refresh' }, REFRESH_TOKEN_EXPIRY_MS, secret)
}

export function extractToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  return authHeader.slice(7)
}

// DB helpers using Supabase client (service role)
type SupabaseClient = ReturnType<typeof import('npm:@supabase/supabase-js@2').createClient>

export async function getUserByUsername(
  supabase: SupabaseClient,
  username: string
): Promise<{ id: number; username: string; passwordHash: string; role: string | null } | null> {
  const { data } = await supabase.from('users').select('id, username, passwordHash, role').eq('username', username).maybeSingle()
  return data as { id: number; username: string; passwordHash: string; role: string | null } | null
}

export async function getTeacherByUsername(
  supabase: SupabaseClient,
  username: string
): Promise<{ id: number; username: string; passwordHash: string } | null> {
  const { data } = await supabase.from('teachers').select('id, username, passwordHash').eq('username', username).maybeSingle()
  return data as { id: number; username: string; passwordHash: string } | null
}

const REFRESH_TOKEN_EXPIRY_ISO = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS).toISOString()

export async function saveRefreshToken(supabase: SupabaseClient, userId: number, token: string): Promise<void> {
  await supabase.from('refresh_tokens').insert({
    userId,
    token,
    expiresAt: REFRESH_TOKEN_EXPIRY_ISO,
  })
}

export async function saveTeacherRefreshToken(supabase: SupabaseClient, teacherId: number, token: string): Promise<void> {
  await supabase.from('teacher_refresh_tokens').insert({
    teacherId,
    token,
    expiresAt: REFRESH_TOKEN_EXPIRY_ISO,
  })
}

export async function verifyRefreshToken(
  supabase: SupabaseClient,
  token: string,
  secret?: string
): Promise<{ userId: number; username: string; role: string | null } | null> {
  const payload = await verifyJWT(token, secret)
  if (!payload || payload.type !== 'refresh') return null

  const { data: rt } = await supabase.from('refresh_tokens').select('userId, expiresAt').eq('token', token).maybeSingle()
  if (rt) {
    if (new Date(rt.expiresAt) < new Date()) {
      await supabase.from('refresh_tokens').delete().eq('token', token)
      return null
    }
    const { data: user } = await supabase.from('users').select('username, role').eq('id', rt.userId).maybeSingle()
    if (!user) return null
    return { userId: rt.userId, username: user.username, role: user.role }
  }

  const { data: trt } = await supabase.from('teacher_refresh_tokens').select('teacherId, expiresAt').eq('token', token).maybeSingle()
  if (!trt) return null
  if (new Date(trt.expiresAt) < new Date()) {
    await supabase.from('teacher_refresh_tokens').delete().eq('token', token)
    return null
  }
  const { data: teacher } = await supabase.from('teachers').select('username').eq('id', trt.teacherId).maybeSingle()
  if (!teacher) return null
  return { userId: trt.teacherId, username: teacher.username, role: 'teacher' }
}

export async function deleteRefreshToken(supabase: SupabaseClient, token: string): Promise<void> {
  await supabase.from('refresh_tokens').delete().eq('token', token)
  await supabase.from('teacher_refresh_tokens').delete().eq('token', token)
}
