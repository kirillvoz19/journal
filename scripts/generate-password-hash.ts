// Скрипт для генерации хеша пароля
// Запуск: npx tsx scripts/generate-password-hash.ts

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function main() {
  const password = 'z69BIa'
  const hash = await hashPassword(password)
  console.log(`Password: ${password}`)
  console.log(`Hash: ${hash}`)
  console.log('\nSQL для вставки:')
  console.log(`INSERT OR IGNORE INTO users (username, passwordHash) VALUES ('admin', '${hash}');`)
}

main().catch(console.error)
