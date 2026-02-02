export type AuthTokens = {
  accessToken: string
  refreshToken: string
}

const ACCESS_TOKEN_KEY = 'accessToken'
const REFRESH_TOKEN_KEY = 'refreshToken'

export const readAccessTokenFromStorage = (): string | null =>
  localStorage.getItem(ACCESS_TOKEN_KEY)

export const readRefreshTokenFromStorage = (): string | null =>
  localStorage.getItem(REFRESH_TOKEN_KEY)

export const writeTokensToStorage = (tokens: AuthTokens): void => {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
}

export const clearTokensFromStorage = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

