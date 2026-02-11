import type { D1Database, PagesFunction } from '@cloudflare/workers-types'
import { requireAuth } from '../../../middleware/auth'
import { decryptTeacherPassword } from '../../../utils/teacherPasswordEncryption'

interface Env {
  DB: D1Database
  JWT_SECRET?: string
}

// GET /api/teachers/:id/password — расшифрованный пароль только для admin (на любом устройстве)
// @ts-ignore
export const onRequestGet: PagesFunction<Env> = requireAuth(async (context) => {
  const { env } = context
  const user = (context as any).user as { id: number; username: string; role?: string } | undefined
  if (user?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const id = (context.params as { id?: string })?.id
  if (!id) {
    return new Response(JSON.stringify({ error: 'Teacher ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    if (!env.DB) {
      return new Response(
        JSON.stringify({ error: 'Database not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const row = await env.DB.prepare(
      'SELECT passwordEncrypted FROM teachers WHERE id = ?'
    )
      .bind(parseInt(id, 10))
      .first<{ passwordEncrypted: string | null }>()

    if (!row) {
      return new Response(JSON.stringify({ error: 'Teacher not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const password = await decryptTeacherPassword(row.passwordEncrypted, env)
    return new Response(
      JSON.stringify({ password: password ?? '' }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching teacher password:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to get password' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
