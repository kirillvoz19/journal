export type JwtPayloadWithExp = {
  exp: number
  role?: string
  username?: string
}

const decodeBase64UrlToString = (base64Url: string): string => {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  const paddedBase64 = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  return atob(paddedBase64)
}

export const getJwtExpiryMs = (jwt: string): number | null => {
  const parts = jwt.split('.')
  if (parts.length !== 3) return null

  const payloadPart = parts[1]
  if (!payloadPart) return null

  try {
    const payloadJson = decodeBase64UrlToString(payloadPart)
    const payload = JSON.parse(payloadJson) as JwtPayloadWithExp
    if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) return null
    return payload.exp * 1000
  } catch {
    return null
  }
}

/** Декодирует payload JWT (без проверки подписи). Используется для чтения role на клиенте. */
export const getJwtPayload = (jwt: string): JwtPayloadWithExp | null => {
  const parts = jwt.split('.')
  if (parts.length !== 3) return null
  const payloadPart = parts[1]
  if (!payloadPart) return null
  try {
    const payloadJson = decodeBase64UrlToString(payloadPart)
    return JSON.parse(payloadJson) as JwtPayloadWithExp
  } catch {
    return null
  }
}

