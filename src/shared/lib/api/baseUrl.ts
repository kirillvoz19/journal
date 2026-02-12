/**
 * Base URL for backend API.
 * When VITE_SUPABASE_URL is set (e.g. on GitHub Pages or with Supabase backend),
 * API calls go to Supabase Edge Functions. Otherwise relative /api (Cloudflare Pages).
 */
export function getApiBaseUrl(): string {
  const url = import.meta.env.VITE_SUPABASE_URL
  if (!url || url.includes('placeholder')) return ''
  return `${url.replace(/\/$/, '')}/functions/v1`
}

/**
 * Resolve full API URL for a given path (e.g. /api/auth/login or /api/teachers).
 * Maps Cloudflare-style paths to Supabase function names.
 */
export function getApiUrl(path: string): string {
  const base = getApiBaseUrl()
  if (!base) return path

  const p = path.replace(/^\//, '')
  if (p.startsWith('api/auth/login')) return `${base}/login`
  if (p.startsWith('api/auth/refresh')) return `${base}/refresh`
  if (p.startsWith('api/teachers/') && p.includes('/password')) {
    const id = p.split('/')[2]
    return `${base}/teacher-password?id=${id}`
  }
  if (p.startsWith('api/teachers')) return `${base}/teachers${path.includes('?') ? path.slice(path.indexOf('?')) : ''}`
  if (p.startsWith('api/groups')) return `${base}/groups${path.includes('?') ? path.slice(path.indexOf('?')) : ''}`
  if (p.startsWith('api/attendance')) return `${base}/attendance${path.includes('?') ? path.slice(path.indexOf('?')) : ''}`
  if (p.startsWith('api/backup')) return `${base}/backup`
  return path
}

/** Заголовки для запросов к Supabase Edge Functions: шлюз требует Authorization: Bearer anon_key. */
export function getSupabaseRequestHeaders(accessToken?: string): Record<string, string> {
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!anon || anon === 'placeholder') return {}
  const headers: Record<string, string> = { Authorization: `Bearer ${anon}` }
  if (accessToken) headers['X-Access-Token'] = accessToken
  return headers
}

export function isSupabaseBackend(): boolean {
  return !!getApiBaseUrl()
}
