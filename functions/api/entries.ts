import type { PagesFunction } from '@cloudflare/workers-types'

interface Env {
  DB: D1Database
}

interface JournalEntry {
  id?: number
  title: string
  content: string
  createdAt?: string
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context
  
  try {
    // Check if DB is available
    if (!env.DB) {
      return new Response(
        JSON.stringify({ error: 'Database not configured' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const { results } = await env.DB.prepare(
      'SELECT * FROM entries ORDER BY createdAt DESC'
    ).all<JournalEntry>()

    return new Response(JSON.stringify(results), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error fetching entries:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch entries' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
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

    const body = await request.json<{ title: string; content: string }>()

    if (!body.title || !body.content) {
      return new Response(
        JSON.stringify({ error: 'Title and content are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const result = await env.DB.prepare(
      'INSERT INTO entries (title, content, createdAt) VALUES (?, ?, ?)'
    )
      .bind(body.title, body.content, new Date().toISOString())
      .run()

    return new Response(
      JSON.stringify({ id: result.meta.last_row_id, ...body }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error creating entry:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to create entry' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
