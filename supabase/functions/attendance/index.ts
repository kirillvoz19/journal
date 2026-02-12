import { getSupabaseAdmin } from '../_shared/db.ts'
import { requireAuth } from '../_shared/requireAuth.ts'
import { corsResponse, jsonResponse } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()

  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth

  const supabase = getSupabaseAdmin()

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const studentId = url.searchParams.get('studentId')
      const scheduleId = url.searchParams.get('scheduleId')
      let q = supabase.from('attendance').select('*').order('createdAt', { ascending: false })
      if (studentId) q = q.eq('studentId', parseInt(studentId, 10))
      if (scheduleId) q = q.eq('scheduleId', parseInt(scheduleId, 10))
      const { data, error } = await q
      if (error) throw error
      return jsonResponse(data ?? [])
    }

    if (req.method === 'POST') {
      const body = (await req.json()) as { studentId?: number; scheduleId?: number; status?: string }
      if (!body.studentId || !body.scheduleId || !body.status) {
        return jsonResponse({ error: 'studentId, scheduleId and status are required' }, 400)
      }
      const { data: existing } = await supabase
        .from('attendance')
        .select('id')
        .eq('studentId', body.studentId)
        .eq('scheduleId', body.scheduleId)
        .maybeSingle()

      if (existing) {
        const { data: updated, error } = await supabase
          .from('attendance')
          .update({ status: body.status })
          .eq('studentId', body.studentId)
          .eq('scheduleId', body.scheduleId)
          .select()
          .single()
        if (error) throw error
        return jsonResponse(updated)
      } else {
        const { data: created, error } = await supabase
          .from('attendance')
          .insert({
            studentId: body.studentId,
            scheduleId: body.scheduleId,
            status: body.status,
          })
          .select()
          .single()
        if (error) throw error
        return jsonResponse(created, 201)
      }
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url)
      const studentId = url.searchParams.get('studentId')
      const scheduleId = url.searchParams.get('scheduleId')
      if (!studentId || !scheduleId) {
        return jsonResponse({ error: 'studentId and scheduleId are required' }, 400)
      }
      await supabase
        .from('attendance')
        .delete()
        .eq('studentId', parseInt(studentId, 10))
        .eq('scheduleId', parseInt(scheduleId, 10))
      return jsonResponse({ success: true })
    }

    return jsonResponse({ error: 'Method not allowed' }, 405)
  } catch (err) {
    console.error('Attendance error:', err)
    return jsonResponse({ error: 'Failed to process request' }, 500)
  }
})
