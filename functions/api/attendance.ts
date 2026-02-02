import type { D1Database, PagesFunction } from '@cloudflare/workers-types'
import { requireAuth } from '../middleware/auth'

interface Env {
  DB: D1Database
  JWT_SECRET?: string
}

interface Attendance {
  id?: number
  studentId: number
  scheduleId: number
  status: 'present' | 'absent'
  createdAt?: string
}

// @ts-ignore
export const onRequestGet: PagesFunction<Env> = requireAuth(async (context) => {
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
    const studentId = url.searchParams.get('studentId')
    const scheduleId = url.searchParams.get('scheduleId')

    let query = 'SELECT * FROM attendance WHERE 1=1'
    const params: number[] = []

    if (studentId) {
      query += ' AND studentId = ?'
      params.push(parseInt(studentId))
    }
    if (scheduleId) {
      query += ' AND scheduleId = ?'
      params.push(parseInt(scheduleId))
    }

    query += ' ORDER BY createdAt DESC'

    const result = await env.DB.prepare(query).bind(...params).all()

    return new Response(JSON.stringify(result.results || []), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    console.error('Error fetching attendance')
    return new Response(
      JSON.stringify({ error: 'Failed to fetch attendance' }),
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

    const body = (await request.json()) as Attendance

    if (!body.studentId || !body.scheduleId || !body.status) {
      return new Response(
        JSON.stringify({ error: 'studentId, scheduleId and status are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Check if attendance already exists
    const existing = await env.DB.prepare(
      'SELECT id FROM attendance WHERE studentId = ? AND scheduleId = ?'
    )
      .bind(body.studentId, body.scheduleId)
      .first()

    if (existing) {
      // Update existing
      const result = await env.DB.prepare(
        'UPDATE attendance SET status = ? WHERE studentId = ? AND scheduleId = ?'
      )
        .bind(body.status, body.studentId, body.scheduleId)
        .run()

      const updated = await env.DB.prepare(
        'SELECT * FROM attendance WHERE studentId = ? AND scheduleId = ?'
      )
        .bind(body.studentId, body.scheduleId)
        .first()

      return new Response(JSON.stringify(updated), {
        headers: { 'Content-Type': 'application/json' },
      })
    } else {
      // Insert new
      const result = await env.DB.prepare(
        'INSERT INTO attendance (studentId, scheduleId, status, createdAt) VALUES (?, ?, ?, ?)'
      )
        .bind(body.studentId, body.scheduleId, body.status, new Date().toISOString())
        .run()

      const created = await env.DB.prepare(
        'SELECT * FROM attendance WHERE id = ?'
      )
        .bind(result.meta.last_row_id)
        .first()

      return new Response(JSON.stringify(created), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  } catch {
    console.error('Error saving attendance')
    return new Response(
      JSON.stringify({ error: 'Failed to save attendance' }),
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
    const studentId = url.searchParams.get('studentId')
    const scheduleId = url.searchParams.get('scheduleId')

    if (!studentId || !scheduleId) {
      return new Response(
        JSON.stringify({ error: 'studentId and scheduleId are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    await env.DB.prepare(
      'DELETE FROM attendance WHERE studentId = ? AND scheduleId = ?'
    )
      .bind(parseInt(studentId), parseInt(scheduleId))
      .run()

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    console.error('Error deleting attendance')
    return new Response(
      JSON.stringify({ error: 'Failed to delete attendance' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
