import type { D1Database } from '@cloudflare/workers-types'

// JWT Secret - в продакшене должен быть в environment variables
// Можно установить через Cloudflare Dashboard -> Pages -> Settings -> Environment Variables
// Или через wrangler.toml: [vars] JWT_SECRET = "your-secret-key"
function getJWTSecret(env?: { JWT_SECRET?: string }): string {
  // В продакшене используем переменную окружения, иначе fallback на дефолтный ключ
  return env?.JWT_SECRET || (globalThis as any).JWT_SECRET || 'your-secret-key-change-in-production'
}

const ACCESS_TOKEN_EXPIRY = 15 * 60 * 1000 // 15 минут
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000 // 7 дней

interface JWTPayload {
  userId: number
  username: string
  type: 'access' | 'refresh'
  exp: number
  iat: number
}

// Константы для PBKDF2
const PBKDF2_ITERATIONS = 100000 // Количество итераций (можно увеличить для большей безопасности)
const PBKDF2_KEY_LENGTH = 256 // Длина ключа в битах (32 байта)
const SALT_LENGTH = 16 // Длина salt в байтах

// Хеширование пароля используя PBKDF2 (более безопасно, чем SHA-256)
// Формат результата: base64(salt):base64(hash)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  
  // Генерируем случайный salt
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  
  // Импортируем пароль как ключ для PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  
  // Выполняем PBKDF2
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    PBKDF2_KEY_LENGTH
  )
  
  // Преобразуем в base64url
  const saltBase64 = btoa(String.fromCharCode(...salt))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashBase64 = btoa(String.fromCharCode(...hashArray))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  
  // Возвращаем в формате salt:hash
  return `${saltBase64}:${hashBase64}`
}

// Проверка пароля
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    // Разделяем salt и hash
    const [saltBase64, hashBase64] = storedHash.split(':')
    
    if (!saltBase64 || !hashBase64) {
      // Старый формат (SHA-256 без salt) - для обратной совместимости
      return verifyPasswordLegacy(password, storedHash)
    }
    
    // Декодируем salt и hash
    const salt = Uint8Array.from(
      atob(saltBase64.replace(/-/g, '+').replace(/_/g, '/')),
      c => c.charCodeAt(0)
    )
    
    const storedHashArray = Uint8Array.from(
      atob(hashBase64.replace(/-/g, '+').replace(/_/g, '/')),
      c => c.charCodeAt(0)
    )
    
    // Вычисляем хеш пароля с тем же salt
    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    )
    
    const computedHashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      PBKDF2_KEY_LENGTH
    )
    
    const computedHash = new Uint8Array(computedHashBuffer)
    
    // Сравниваем хеши (константное время)
    if (computedHash.length !== storedHashArray.length) {
      return false
    }
    
    let isEqual = true
    for (let i = 0; i < computedHash.length; i++) {
      if (computedHash[i] !== storedHashArray[i]) {
        isEqual = false
      }
    }
    
    return isEqual
  } catch (error) {
    console.error('Password verification error:', error)
    return false
  }
}

// Обратная совместимость со старым форматом (SHA-256)
async function verifyPasswordLegacy(password: string, hash: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return passwordHash === hash
}

// Base64 URL encoding
function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

// Base64 URL decoding
function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) {
    str += '='
  }
  return atob(str)
}

// Создание JWT токена
export async function createJWT(
  payload: Omit<JWTPayload, 'exp' | 'iat'>, 
  expiresIn: number,
  secret?: string
): Promise<string> {
  const jwtSecret = secret || getJWTSecret()
  const now = Math.floor(Date.now() / 1000)
  const jwtPayload: JWTPayload = {
    ...payload,
    exp: now + Math.floor(expiresIn / 1000),
    iat: now,
  }

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  }

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(jwtPayload))

  const signatureInput = `${encodedHeader}.${encodedPayload}`
  
  // Создание подписи используя Web Crypto API
  const encoder = new TextEncoder()
  const keyData = encoder.encode(jwtSecret)
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signatureInput)
  )

  // Преобразуем ArrayBuffer в base64url
  const signatureArray = Array.from(new Uint8Array(signatureBuffer))
  const binaryString = String.fromCharCode(...signatureArray)
  const signature = base64UrlEncode(binaryString)

  return `${encodedHeader}.${encodedPayload}.${signature}`
}

// Верификация JWT токена
export async function verifyJWT(token: string, secret?: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    const [encodedHeader, encodedPayload, signature] = parts

    // Проверка подписи
    const encoder = new TextEncoder()
    const jwtSecret = secret || getJWTSecret()
    const keyData = encoder.encode(jwtSecret)
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    const signatureInput = `${encodedHeader}.${encodedPayload}`
    const signatureBuffer = Uint8Array.from(
      atob(signature.replace(/-/g, '+').replace(/_/g, '/'))
        .split('')
        .map(c => c.charCodeAt(0))
    )

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBuffer,
      encoder.encode(signatureInput)
    )

    if (!isValid) {
      return null
    }

    // Декодирование payload
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as JWTPayload

    // Проверка срока действия
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null
    }

    return payload
  } catch (error) {
    console.error('JWT verification error:', error)
    return null
  }
}

// Извлечение токена из заголовка Authorization
export function extractToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}

// Создание access токена
export async function createAccessToken(userId: number, username: string, secret?: string): Promise<string> {
  return createJWT({ userId, username, type: 'access' }, ACCESS_TOKEN_EXPIRY, secret)
}

// Создание refresh токена
export async function createRefreshToken(userId: number, username: string, secret?: string): Promise<string> {
  return createJWT({ userId, username, type: 'refresh' }, REFRESH_TOKEN_EXPIRY, secret)
}

// Сохранение refresh токена в БД
export async function saveRefreshToken(
  db: D1Database,
  userId: number,
  token: string
): Promise<void> {
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY).toISOString()
  await db.prepare(
    'INSERT INTO refresh_tokens (userId, token, expiresAt) VALUES (?, ?, ?)'
  )
    .bind(userId, token, expiresAt)
    .run()
}

// Проверка refresh токена в БД
export async function verifyRefreshToken(
  db: D1Database,
  token: string,
  secret?: string
): Promise<{ userId: number; username: string } | null> {
  // Проверяем JWT
  const payload = await verifyJWT(token, secret)
  if (!payload || payload.type !== 'refresh') {
    return null
  }

  // Проверяем наличие токена в БД
  const result = await db.prepare(
    'SELECT userId, expiresAt FROM refresh_tokens WHERE token = ?'
  )
    .bind(token)
    .first<{ userId: number; expiresAt: string }>()

  if (!result) {
    return null
  }

  // Проверяем срок действия
  if (new Date(result.expiresAt) < new Date()) {
    // Удаляем истекший токен
    await db.prepare('DELETE FROM refresh_tokens WHERE token = ?').bind(token).run()
    return null
  }

  // Получаем username
  const user = await db.prepare('SELECT username FROM users WHERE id = ?')
    .bind(result.userId)
    .first<{ username: string }>()

  if (!user) {
    return null
  }

  return { userId: result.userId, username: user.username }
}

// Удаление refresh токена
export async function deleteRefreshToken(db: D1Database, token: string): Promise<void> {
  await db.prepare('DELETE FROM refresh_tokens WHERE token = ?').bind(token).run()
}

// Получение пользователя по username
export async function getUserByUsername(
  db: D1Database,
  username: string
): Promise<{ id: number; username: string; passwordHash: string } | null> {
  return db.prepare('SELECT id, username, passwordHash FROM users WHERE username = ?')
    .bind(username)
    .first<{ id: number; username: string; passwordHash: string }>()
}
