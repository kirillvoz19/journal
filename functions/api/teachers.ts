import type { D1Database, PagesFunction } from '@cloudflare/workers-types'
import { requireAuth } from '../middleware/auth'
import { hashPassword } from '../utils/auth'

interface Env {
  DB: D1Database
  JWT_SECRET?: string
}

interface Teacher {
  id?: number
  username: string
  passwordHash?: string
  fullName: string
  createdAt?: string
}

// @ts-ignore
export const onRequestGet: PagesFunction<Env> = requireAuth(async (context) => {
  const { env } = context

  try {
    if (!env.DB) {
      return new Response(
        JSON.stringify({ error: 'Database not configured' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const result = await env.DB.prepare(
      'SELECT id, username, fullName, createdAt FROM teachers ORDER BY id'
    ).all()

    const teachers = (result.results || []) as Teacher[]

    return new Response(JSON.stringify(teachers), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error fetching teachers:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch teachers' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})

// @ts-ignore
export const onRequestPost: PagesFunction<Env> = requireAuth(async (context) => {
  const { env, request } = context

  try {
    if (!env.DB) {
      return new Response(
        JSON.stringify({ error: 'Database not configured' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const body = (await request.json()) as {
      username: string
      password: string
      fullName: string
    }

    if (!body.username || !body.password || !body.fullName) {
      return new Response(
        JSON.stringify({ error: 'Username, password and fullName are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(body.password)

    const result = await env.DB.prepare(
      'INSERT INTO teachers (username, passwordHash, fullName, createdAt) VALUES (?, ?, ?, ?)'
    )
      .bind(body.username, passwordHash, body.fullName, new Date().toISOString())
      .run()

    return new Response(
      JSON.stringify({
        id: result.meta.last_row_id,
        username: body.username,
        fullName: body.fullName,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error: any) {
    console.error('Error creating teacher:', error)
    if (error.message?.includes('UNIQUE constraint')) {
      return new Response(
        JSON.stringify({ error: 'Username already exists' }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
    return new Response(
      JSON.stringify({ error: 'Failed to create teacher' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})

// @ts-ignore
export const onRequestPut: PagesFunction<Env> = requireAuth(async (context) => {
  const { env, request } = context

  try {
    if (!env.DB) {
      return new Response(
        JSON.stringify({ error: 'Database not configured' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const body = (await request.json()) as {
      id: number
      password?: string
      fullName?: string
    }

    if (!body.id) {
      return new Response(
        JSON.stringify({ error: 'Teacher ID is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const updates: string[] = []
    const values: any[] = []

    if (body.password) {
      const passwordHash = await hashPassword(body.password)
      updates.push('passwordHash = ?')
      values.push(passwordHash)
    }

    if (body.fullName) {
      updates.push('fullName = ?')
      values.push(body.fullName)
    }

    if (updates.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No fields to update' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    values.push(body.id)

    const result = await env.DB.prepare(
      `UPDATE teachers SET ${updates.join(', ')} WHERE id = ?`
    )
      .bind(...values)
      .run()

    if (result.meta.changes === 0) {
      return new Response(
        JSON.stringify({ error: 'Teacher not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Fetch updated teacher
    const teacherResult = await env.DB.prepare(
      'SELECT id, username, fullName, createdAt FROM teachers WHERE id = ?'
    )
      .bind(body.id)
      .first()

    return new Response(JSON.stringify(teacherResult), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error updating teacher:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to update teacher' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})

// @ts-ignore
export const onRequestDelete: PagesFunction<Env> = requireAuth(async (context) => {
  const { env, request } = context

  try {
    if (!env.DB) {
      return new Response(
        JSON.stringify({ error: 'Database not configured' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Teacher ID is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const result = await env.DB.prepare('DELETE FROM teachers WHERE id = ?')
      .bind(parseInt(id))
      .run()

    if (result.meta.changes === 0) {
      return new Response(
        JSON.stringify({ error: 'Teacher not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error deleting teacher:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to delete teacher' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
