import { getSupabaseAdmin } from '../_shared/db.ts'
import { requireAuth } from '../_shared/requireAuth.ts'
import { hashPassword } from '../_shared/auth.ts'
import { encryptTeacherPassword } from '../_shared/teacherEncryption.ts'
import { corsResponse, jsonResponse } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()

  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth
  const { user } = auth

  const supabase = getSupabaseAdmin()

  try {
    if (req.method === 'GET') {
      const { data: teachers, error } = await supabase
        .from('teachers')
        .select('id, username, fullName, createdAt')
        .order('id')
      if (error) throw error
      return jsonResponse(teachers ?? [])
    }

    if (req.method === 'POST') {
      const body = (await req.json()) as { username?: string; password?: string; fullName?: string }
      if (!body.username || !body.password || !body.fullName) {
        return jsonResponse({ error: 'Username, password and fullName are required' }, 400)
      }
      const passwordHash = await hashPassword(body.password)
      const passwordEncrypted = await encryptTeacherPassword(body.password)
      const { data, error } = await supabase
        .from('teachers')
        .insert({
          username: body.username,
          passwordHash,
          passwordEncrypted,
          fullName: body.fullName,
        })
        .select('id, username, fullName')
        .single()
      if (error) {
        if (error.code === '23505') return jsonResponse({ error: 'Username already exists' }, 409)
        throw error
      }
      return jsonResponse(
        { id: data.id, username: data.username, fullName: data.fullName, password: body.password },
        201
      )
    }

    if (req.method === 'PUT') {
      const body = (await req.json()) as { id: number; password?: string; fullName?: string }
      if (!body.id) return jsonResponse({ error: 'Teacher ID is required' }, 400)
      const updates: Record<string, unknown> = {}
      if (body.password) {
        updates.passwordHash = await hashPassword(body.password)
        updates.passwordEncrypted = await encryptTeacherPassword(body.password)
      }
      if (body.fullName) updates.fullName = body.fullName
      if (Object.keys(updates).length === 0) {
        return jsonResponse({ error: 'No fields to update' }, 400)
      }
      const { data, error } = await supabase
        .from('teachers')
        .update(updates)
        .eq('id', body.id)
        .select('id, username, fullName, createdAt')
        .maybeSingle()
      if (error) throw error
      if (!data) return jsonResponse({ error: 'Teacher not found' }, 404)
      return jsonResponse(data)
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url)
      const id = url.searchParams.get('id')
      if (!id) return jsonResponse({ error: 'Teacher ID is required' }, 400)
      const { data: deleted, error } = await supabase.from('teachers').delete().eq('id', parseInt(id)).select('id').maybeSingle()
      if (error) throw error
      if (!deleted) return jsonResponse({ error: 'Teacher not found' }, 404)
      return jsonResponse({ success: true })
    }

    return jsonResponse({ error: 'Method not allowed' }, 405)
  } catch (err) {
    console.error('Teachers error:', err)
    return jsonResponse({ error: 'Failed to process request' }, 500)
  }
})
