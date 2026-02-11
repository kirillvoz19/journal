/**
 * Шифрование пароля преподавателя для хранения в БД.
 * Ключ выводится из JWT_SECRET (SHA-256 → 32 байта), отдельная переменная не нужна.
 * Формат в БД: "enc:" + base64(iv(12) + ciphertext + authTag(16)) (AES-256-GCM).
 */

const PREFIX = 'enc:'
const IV_LENGTH = 12
const TAG_LENGTH = 16

async function getKeyBytes(env: { JWT_SECRET?: string }): Promise<Uint8Array> {
  const secret = env.JWT_SECRET || 'your-secret-key-change-in-production'
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(secret)
  )
  return new Uint8Array(hash)
}

export async function encryptTeacherPassword(
  plaintext: string,
  env: { JWT_SECRET?: string }
): Promise<string> {
  const keyBytes = await getKeyBytes(env)
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes.buffer as ArrayBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  )

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const encoded = new TextEncoder().encode(plaintext)

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: TAG_LENGTH * 8 },
    key,
    encoded
  )

  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(ciphertext), iv.length)

  const base64 = btoa(String.fromCharCode(...combined))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  return PREFIX + base64
}

export function isEncryptedStored(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX)
}

export async function decryptTeacherPassword(
  stored: string | null | undefined,
  env: { JWT_SECRET?: string }
): Promise<string | null> {
  if (stored == null || stored === '') return null
  if (!isEncryptedStored(stored)) return stored

  const keyBytes = await getKeyBytes(env)
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes.buffer as ArrayBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )

  const base64 = stored.slice(PREFIX.length).replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const combined = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))

  if (combined.length < IV_LENGTH + TAG_LENGTH) return null

  const iv = combined.slice(0, IV_LENGTH)
  const ciphertext = combined.slice(IV_LENGTH)

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, tagLength: TAG_LENGTH * 8 },
      key,
      ciphertext
    )
    return new TextDecoder().decode(decrypted)
  } catch {
    return null
  }
}
