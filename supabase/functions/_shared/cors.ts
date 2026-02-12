const DEFAULT_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Access-Token',
  'Content-Type': 'application/json',
}

export function corsResponse(status = 204): Response {
  return new Response(null, { status, headers: DEFAULT_HEADERS })
}

export function jsonResponse(body: unknown, status = 200, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    status,
    headers: { ...DEFAULT_HEADERS, ...init?.headers },
  })
}

export function getCorsHeaders(): Record<string, string> {
  return { ...DEFAULT_HEADERS }
}
