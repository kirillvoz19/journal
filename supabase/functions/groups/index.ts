import { getSupabaseAdmin } from '../_shared/db.ts'
import { requireAuth } from '../_shared/requireAuth.ts'
import { corsResponse, jsonResponse } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()

  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth
  const { user } = auth

  const supabase = getSupabaseAdmin()
  const isTeacher = user.role === 'teacher'

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const idParam = url.searchParams.get('id')

      if (idParam) {
        const groupId = parseInt(idParam, 10)
        const { data: group, error: gErr } = await supabase
          .from('groups')
          .select('id, name, teacherId, subject, customSubject, level, createdAt')
          .eq('id', groupId)
          .maybeSingle()
        if (gErr) throw gErr
        if (!group) return jsonResponse({ error: 'Group not found' }, 404)
        if (isTeacher && group.teacherId !== user.id) return jsonResponse({ error: 'Forbidden' }, 403)

        const [schedRes, studRes] = await Promise.all([
          supabase.from('group_schedules').select('*').eq('groupId', groupId).order('date').order('startTime'),
          supabase.from('group_students').select('*').eq('groupId', groupId).order('id'),
        ])
        const schedules = (schedRes.data ?? []).map((s) => ({ ...s, isTrialLesson: !!s.isTrialLesson }))
        return jsonResponse({ ...group, schedules, students: studRes.data ?? [] })
      }

      const q = supabase.from('groups').select('id, name, teacherId, subject, customSubject, level, createdAt').order('id')
      if (isTeacher) q.eq('teacherId', user.id)
      const { data: groups, error } = await q
      if (error) throw error

      const result = []
      for (const g of groups ?? []) {
        const [schedRes, studRes] = await Promise.all([
          supabase.from('group_schedules').select('*').eq('groupId', g.id).order('date').order('startTime'),
          supabase.from('group_students').select('*').eq('groupId', g.id).order('id'),
        ])
        const schedules = (schedRes.data ?? []).map((s) => ({ ...s, isTrialLesson: !!s.isTrialLesson }))
        result.push({ ...g, schedules, students: studRes.data ?? [] })
      }
      return jsonResponse(result)
    }

    if (req.method === 'POST') {
      const body = (await req.json()) as {
        name?: string
        teacherId?: number | null
        subject?: string
        customSubject?: string
        level?: string
        schedules?: Array<{ date: string; startTime: string; endTime: string; isTrialLesson?: boolean; comment?: string }>
        students?: Array<{ fullName: string; email?: string; phone?: string }>
      }
      if (!body.name || !body.subject || !body.level) {
        return jsonResponse({ error: 'Name, subject and level are required' }, 400)
      }
      const teacherId = isTeacher ? user.id : body.teacherId ?? null
      const { data: group, error: insErr } = await supabase
        .from('groups')
        .insert({
          name: body.name,
          teacherId,
          subject: body.subject,
          customSubject: body.customSubject ?? null,
          level: body.level,
        })
        .select('id, name, teacherId, subject, customSubject, level, createdAt')
        .single()
      if (insErr) throw insErr
      const groupId = group.id

      if (body.schedules?.length) {
        await supabase.from('group_schedules').insert(
          body.schedules.map((s) => ({
            groupId,
            date: s.date,
            startTime: s.startTime,
            endTime: s.endTime,
            isTrialLesson: !!s.isTrialLesson,
            comment: s.comment ?? null,
          }))
        )
      }
      if (body.students?.length) {
        await supabase.from('group_students').insert(
          body.students.map((s) => ({
            groupId,
            fullName: s.fullName,
            email: s.email ?? null,
            phone: s.phone ?? null,
          }))
        )
      }

      const [schedRes, studRes] = await Promise.all([
        supabase.from('group_schedules').select('*').eq('groupId', groupId).order('date').order('startTime'),
        supabase.from('group_students').select('*').eq('groupId', groupId).order('id'),
      ])
      const schedules = (schedRes.data ?? []).map((s) => ({ ...s, isTrialLesson: !!s.isTrialLesson }))
      return jsonResponse({ ...group, schedules, students: studRes.data ?? [] }, 201)
    }

    if (req.method === 'PUT') {
      const body = (await req.json()) as {
        id: number
        name?: string
        teacherId?: number | null
        subject?: string
        customSubject?: string
        level?: string
        schedules?: Array<{ date: string; startTime: string; endTime: string; isTrialLesson?: boolean; comment?: string }>
        students?: Array<{ fullName: string; email?: string; phone?: string }>
      }
      if (!body.id) return jsonResponse({ error: 'Group ID is required' }, 400)

      if (isTeacher) {
        const { data: existing } = await supabase.from('groups').select('teacherId').eq('id', body.id).maybeSingle()
        if (!existing || existing.teacherId !== user.id) return jsonResponse({ error: 'Forbidden' }, 403)
      }

      const updates: Record<string, unknown> = {}
      if (body.name !== undefined) updates.name = body.name
      if (body.teacherId !== undefined) updates.teacherId = body.teacherId
      if (body.subject !== undefined) updates.subject = body.subject
      if (body.customSubject !== undefined) updates.customSubject = body.customSubject ?? null
      if (body.level !== undefined) updates.level = body.level
      if (Object.keys(updates).length > 0) {
        const { error: upErr } = await supabase.from('groups').update(updates).eq('id', body.id)
        if (upErr) throw upErr
      }

      if (body.schedules !== undefined) {
        await supabase.from('group_schedules').delete().eq('groupId', body.id)
        if (body.schedules.length > 0) {
          await supabase.from('group_schedules').insert(
            body.schedules.map((s) => ({
              groupId: body.id,
              date: s.date,
              startTime: s.startTime,
              endTime: s.endTime,
              isTrialLesson: !!s.isTrialLesson,
              comment: s.comment ?? null,
            }))
          )
        }
      }
      if (body.students !== undefined) {
        await supabase.from('group_students').delete().eq('groupId', body.id)
        if (body.students.length > 0) {
          await supabase.from('group_students').insert(
            body.students.map((s) => ({
              groupId: body.id,
              fullName: s.fullName,
              email: s.email ?? null,
              phone: s.phone ?? null,
            }))
          )
        }
      }

      const { data: group, error: gErr } = await supabase
        .from('groups')
        .select('id, name, teacherId, subject, customSubject, level, createdAt')
        .eq('id', body.id)
        .single()
      if (gErr) throw gErr
      const [schedRes, studRes] = await Promise.all([
        supabase.from('group_schedules').select('*').eq('groupId', body.id).order('date').order('startTime'),
        supabase.from('group_students').select('*').eq('groupId', body.id).order('id'),
      ])
      const schedules = (schedRes.data ?? []).map((s) => ({ ...s, isTrialLesson: !!s.isTrialLesson }))
      return jsonResponse({ ...group, schedules, students: studRes.data ?? [] })
    }

    if (req.method === 'DELETE') {
      const url = new URL(req.url)
      const id = url.searchParams.get('id')
      if (!id) return jsonResponse({ error: 'Group ID is required' }, 400)
      const groupId = parseInt(id, 10)
      if (isTeacher) {
        const { data: existing } = await supabase.from('groups').select('teacherId').eq('id', groupId).maybeSingle()
        if (!existing || existing.teacherId !== user.id) return jsonResponse({ error: 'Forbidden' }, 403)
      }
      const { data: deleted, error } = await supabase.from('groups').delete().eq('id', groupId).select('id').maybeSingle()
      if (error) throw error
      if (!deleted) return jsonResponse({ error: 'Group not found' }, 404)
      return jsonResponse({ success: true })
    }

    return jsonResponse({ error: 'Method not allowed' }, 405)
  } catch (err) {
    console.error('Groups error:', err)
    return jsonResponse({ error: 'Failed to process request' }, 500)
  }
})
