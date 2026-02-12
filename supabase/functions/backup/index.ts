import { getSupabaseAdmin } from '../_shared/db.ts'
import { requireAuth } from '../_shared/requireAuth.ts'
import { corsResponse, jsonResponse } from '../_shared/cors.ts'

function formatRestoreDate(isoDate: string): string {
  const d = new Date(isoDate)
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()

  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth
  const { user } = auth

  const supabase = getSupabaseAdmin()
  const isAdmin = user.role === 'admin'
  const isTeacher = user.role === 'teacher'

  try {
    if (req.method === 'GET') {
      let teachers: Array<{ id: number; username: string; passwordHash: string; fullName: string; createdAt: string }> = []
      let groups: Array<{
        id: number
        name: string
        teacherId: number | null
        subject: string
        customSubject: string | null
        level: string
        createdAt: string
        schedules: Array<Record<string, unknown>>
        students: Array<Record<string, unknown>>
      }> = []

      if (isAdmin) {
        const { data: t } = await supabase.from('teachers').select('id, username, passwordHash, fullName, createdAt').order('id')
        teachers = (t ?? []) as typeof teachers
        const { data: g } = await supabase.from('groups').select('id, name, teacherId, subject, customSubject, level, createdAt').order('id')
        groups = (g ?? []).map((row) => ({ ...row, schedules: [], students: [] })) as typeof groups
      } else if (isTeacher) {
        const { data: t } = await supabase.from('teachers').select('id, username, passwordHash, fullName, createdAt').eq('id', user.id).maybeSingle()
        if (t) teachers = [t as (typeof teachers)[0]]
        const { data: g } = await supabase.from('groups').select('id, name, teacherId, subject, customSubject, level, createdAt').eq('teacherId', user.id).order('id')
        groups = (g ?? []).map((row) => ({ ...row, schedules: [], students: [] })) as typeof groups
      }

      for (const group of groups) {
        const { data: sched } = await supabase.from('group_schedules').select('*').eq('groupId', group.id).order('date').order('startTime')
        const { data: stud } = await supabase.from('group_students').select('*').eq('groupId', group.id).order('id')
        group.schedules = (sched ?? []).map((s) => ({ ...s, isTrialLesson: s.isTrialLesson ? 1 : 0 }))
        group.students = stud ?? []
      }

      const scheduleIds: number[] = []
      const studentIds: number[] = []
      for (const g of groups) {
        for (const s of g.schedules as Array<{ id: number }>) scheduleIds.push(s.id)
        for (const s of g.students as Array<{ id: number }>) studentIds.push(s.id)
      }

      let attendance: Array<{ studentId: number; scheduleId: number; status: string }> = []
      if (scheduleIds.length > 0 && studentIds.length > 0) {
        const { data: att } = await supabase
          .from('attendance')
          .select('studentId, scheduleId, status')
          .in('studentId', studentIds)
          .in('scheduleId', scheduleIds)
        attendance = (att ?? []) as typeof attendance
      }

      const payload = {
        version: 1,
        savedAt: new Date().toISOString(),
        teachers,
        groups,
        attendance,
      }
      return new Response(JSON.stringify(payload, null, 2), {
        headers: {
          ...Object.fromEntries([['Content-Type', 'application/json'], ['Access-Control-Allow-Origin', '*']]),
          'Content-Disposition': `attachment; filename="journal-backup-${new Date().toISOString().slice(0, 10)}.json"`,
        },
      })
    }

    if (req.method === 'POST') {
      const body = (await req.json()) as {
        version?: number
        savedAt?: string
        teachers?: Array<{ id: number; username: string; passwordHash: string; fullName: string }>
        groups?: Array<{
          id: number
          name: string
          teacherId: number | null
          subject: string
          customSubject: string | null
          level: string
          schedules: Array<{ id: number; date: string; startTime: string; endTime: string; isTrialLesson?: number | boolean; comment?: string | null }>
          students: Array<{ id: number; fullName: string; email?: string | null; phone?: string | null }>
        }>
        attendance?: Array<{ studentId: number; scheduleId: number; status: string }>
      }
      if (!body.version || !body.savedAt || !Array.isArray(body.teachers) || !Array.isArray(body.groups) || !Array.isArray(body.attendance)) {
        return jsonResponse({ error: 'Invalid backup format' }, 400)
      }

      const dateStr = formatRestoreDate(body.savedAt)
      const suffix = ` (адноўлены ${dateStr})`
      const oldToNewTeacher: Record<number, number> = {}
      const oldToNewGroup: Record<number, number> = {}
      const oldToNewSchedule: Record<number, number> = {}
      const oldToNewStudent: Record<number, number> = {}

      for (const t of body.teachers) {
        const { data: inserted, error } = await supabase
          .from('teachers')
          .insert({
            username: t.username + suffix,
            passwordHash: t.passwordHash,
            passwordEncrypted: null,
            fullName: t.fullName,
          })
          .select('id')
          .single()
        if (error) {
          if (error.code === '23505') {
            return jsonResponse({
              error: 'Імя карыстальніка або назва ўжо існуе (паспрабуйце іншую копію або дату)\n\nИмя пользователя или название уже существует (попробуйте другую копию или дату)',
            }, 409)
          }
          throw error
        }
        oldToNewTeacher[t.id] = inserted.id
      }

      for (const g of body.groups) {
        const newTeacherId = g.teacherId != null ? oldToNewTeacher[g.teacherId] ?? null : null
        const { data: groupRow, error: gErr } = await supabase
          .from('groups')
          .insert({
            name: g.name + suffix,
            teacherId: newTeacherId,
            subject: g.subject,
            customSubject: g.customSubject ?? null,
            level: g.level,
          })
          .select('id')
          .single()
        if (gErr) throw gErr
        const ngid = groupRow.id
        oldToNewGroup[g.id] = ngid

        for (const s of g.schedules) {
          const { data: sRow, error: sErr } = await supabase
            .from('group_schedules')
            .insert({
              groupId: ngid,
              date: s.date,
              startTime: s.startTime,
              endTime: s.endTime,
              isTrialLesson: typeof s.isTrialLesson === 'number' ? s.isTrialLesson === 1 : !!s.isTrialLesson,
              comment: s.comment ?? null,
            })
            .select('id')
            .single()
          if (sErr) throw sErr
          oldToNewSchedule[s.id] = sRow.id
        }

        for (const st of g.students) {
          const { data: stRow, error: stErr } = await supabase
            .from('group_students')
            .insert({
              groupId: ngid,
              fullName: st.fullName,
              email: st.email ?? null,
              phone: st.phone ?? null,
            })
            .select('id')
            .single()
          if (stErr) throw stErr
          oldToNewStudent[st.id] = stRow.id
        }
      }

      for (const a of body.attendance) {
        const newStudentId = oldToNewStudent[a.studentId]
        const newScheduleId = oldToNewSchedule[a.scheduleId]
        if (newStudentId == null || newScheduleId == null) continue
        await supabase.from('attendance').upsert(
          { studentId: newStudentId, scheduleId: newScheduleId, status: a.status },
          { onConflict: 'studentId,scheduleId' }
        )
      }

      return jsonResponse({
        success: true,
        teachersCreated: body.teachers.length,
        groupsCreated: body.groups.length,
      })
    }

    return jsonResponse({ error: 'Method not allowed' }, 405)
  } catch (err) {
    console.error('Backup error:', err)
    return jsonResponse({ error: 'Failed to process backup' }, 500)
  }
})
