// Скрипт для генерации PBKDF2 хеша пароля
// Запуск: npx tsx scripts/generate-password-hash-pbkdf2.ts

const PBKDF2_ITERATIONS = 100000
const PBKDF2_KEY_LENGTH = 256
const SALT_LENGTH = 16

async function hashPasswordPBKDF2(password: string, salt?: Uint8Array): Promise<string> {
  const encoder = new TextEncoder()
  
  // Используем переданный salt или генерируем новый
  const saltBytes = salt || crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    PBKDF2_KEY_LENGTH
  )
  
  const saltBase64 = btoa(String.fromCharCode(...saltBytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashBase64 = btoa(String.fromCharCode(...hashArray))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  
  return `${saltBase64}:${hashBase64}`
}

async function main() {
  const password = 'z69BIa'
  const hash = await hashPasswordPBKDF2(password)
  console.log(`Password: ${password}`)
  console.log(`PBKDF2 Hash (salt:hash): ${hash}`)
  console.log('\nSQL для вставки:')
  console.log(`INSERT OR IGNORE INTO users (username, passwordHash) VALUES ('admin', '${hash}');`)
  console.log('\n⚠️  ВАЖНО: Каждый раз будет генерироваться новый salt, поэтому хеш будет разным!')
  console.log('Это нормально - каждый пользователь должен иметь уникальный salt.')
}

main().catch(console.error)
