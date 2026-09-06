import type { D1Database, PagesFunction } from '@cloudflare/workers-types'
import { requireAuth } from '../middleware/auth'

interface Env {
  DB: D1Database
  JWT_SECRET?: string
}

interface BackupTeacher {
  id: number
  username: string
  passwordHash: string
  fullName: string
  createdAt: string
}

interface BackupGroupSchedule {
  id: number
  groupId: number
  date: string
  startTime: string
  endTime: string
  isTrialLesson: number
  comment: string | null
  createdAt: string
}

interface BackupGroupStudent {
  id: number
  groupId: number
  fullName: string
  email: string | null
  phone: string | null
  createdAt: string
}

interface BackupGroup {
  id: number
  name: string
  teacherId: number | null
  subject: string
  customSubject: string | null
  level: string
  createdAt: string
  schedules: BackupGroupSchedule[]
  students: BackupGroupStudent[]
}

interface BackupAttendance {
  studentId: number
  scheduleId: number
  status: string
}

interface BackupPayload {
  version: number
  savedAt: string
  teachers: BackupTeacher[]
  groups: BackupGroup[]
  attendance: BackupAttendance[]
}

function formatRestoreDate(isoDate: string): string {
  const d = new Date(isoDate)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}

// GET — скачать бэкап (админ: всё, преподаватель: свой профиль + свои группы)
// @ts-expect-error requireAuth wraps handler
export const onRequestGet: PagesFunction<Env> = requireAuth(async (context) => {
  const { env } = context
  const user = (context as any).user as { id: number; username: string; role?: string }

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const isAdmin = user?.role === 'admin'
    const isTeacher = user?.role === 'teacher'

    let teachers: BackupTeacher[] = []
    let groups: BackupGroup[] = []

    if (isAdmin) {
      const teachersResult = await env.DB.prepare(
        'SELECT id, username, passwordHash, fullName, createdAt FROM teachers ORDER BY id'
      ).all()
      teachers = (teachersResult.results || []) as unknown as BackupTeacher[]

      const groupsResult = await env.DB.prepare(
        'SELECT id, name, teacherId, subject, customSubject, level, createdAt FROM groups ORDER BY id'
      ).all()
      groups = (groupsResult.results || []) as unknown as BackupGroup[]
    } else if (isTeacher) {
      const teacherResult = await env.DB.prepare(
        'SELECT id, username, passwordHash, fullName, createdAt FROM teachers WHERE id = ?'
      )
        .bind(user.id)
        .first()
      if (teacherResult) {
        teachers = [teacherResult as unknown as BackupTeacher]
      }
      const groupsResult = await env.DB.prepare(
        'SELECT id, name, teacherId, subject, customSubject, level, createdAt FROM groups WHERE teacherId = ? ORDER BY id'
      )
        .bind(user.id)
        .all()
      groups = (groupsResult.results || []) as unknown as BackupGroup[]
    }

    for (const group of groups) {
      const schedulesResult = await env.DB.prepare(
        'SELECT id, groupId, date, startTime, endTime, isTrialLesson, comment, createdAt FROM group_schedules WHERE groupId = ? ORDER BY date, startTime'
      )
        .bind(group.id)
        .all()
      group.schedules = (schedulesResult.results || []) as unknown as BackupGroupSchedule[]

      const studentsResult = await env.DB.prepare(
        'SELECT id, groupId, fullName, email, phone, createdAt FROM group_students WHERE groupId = ? ORDER BY id'
      )
        .bind(group.id)
        .all()
      group.students = (studentsResult.results || []) as unknown as BackupGroupStudent[]
    }

    const scheduleIds: number[] = []
    const studentIds: number[] = []
    for (const g of groups) {
      for (const s of g.schedules) scheduleIds.push(s.id)
      for (const s of g.students) studentIds.push(s.id)
    }

    const attendance: BackupAttendance[] = []
    if (scheduleIds.length > 0 && studentIds.length > 0) {
      const placeholdersS = scheduleIds.map(() => '?').join(',')
      const placeholdersSt = studentIds.map(() => '?').join(',')
      const attResult = await env.DB.prepare(
        `SELECT studentId, scheduleId, status FROM attendance WHERE studentId IN (${placeholdersSt}) AND scheduleId IN (${placeholdersS})`
      )
        .bind(...studentIds, ...scheduleIds)
        .all()
      attendance.push(...((attResult.results || []) as unknown as BackupAttendance[]))
    }

    const payload: BackupPayload = {
      version: 1,
      savedAt: new Date().toISOString(),
      teachers,
      groups,
      attendance,
    }

    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="journal-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    })
  } catch (err) {
    console.error('Backup export error:', err)
    return new Response(JSON.stringify({ error: 'Failed to create backup' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

// POST — восстановить из бэкапа (создаём новые группы с суффиксом "адноўлены DD.MM.YYYY",
// преподавателей — с латинским суффиксом _restored_DDMMYYYY, т.к. логин допускает только a-zA-Z0-9_)
// @ts-expect-error requireAuth wraps handler
export const onRequestPost: PagesFunction<Env> = requireAuth(async (context) => {
  const { env, request } = context

  if (!env.DB) {
    return new Response(JSON.stringify({ error: 'Database not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body: BackupPayload
  try {
    body = (await request.json()) as BackupPayload
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!body.version || !body.savedAt || !Array.isArray(body.teachers) || !Array.isArray(body.groups) || !Array.isArray(body.attendance)) {
    return new Response(JSON.stringify({ error: 'Invalid backup format' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const dateStr = formatRestoreDate(body.savedAt)
  const groupSuffix = ` (адноўлены ${dateStr})`
  // Логин допускает только латиницу, цифры и подчёркивание (a-zA-Z0-9_),
  // иначе под восстановленной учеткой невозможно войти
  const usernameSuffix = `_restored_${dateStr.replace(/\./g, '')}`
  const oldToNewTeacher: Record<number, number> = {}
  const oldToNewGroup: Record<number, number> = {}
  const oldToNewSchedule: Record<number, number> = {}
  const oldToNewStudent: Record<number, number> = {}

  try {
    for (const t of body.teachers) {
      const result = await env.DB.prepare(
        'INSERT INTO teachers (username, passwordHash, passwordEncrypted, fullName, createdAt) VALUES (?, ?, ?, ?, ?)'
      )
        .bind(t.username + usernameSuffix, t.passwordHash, null, t.fullName, new Date().toISOString())
        .run()
      const newId = result.meta.last_row_id as number
      oldToNewTeacher[t.id] = newId
    }

    for (const g of body.groups) {
      const newTeacherId = g.teacherId != null ? oldToNewTeacher[g.teacherId] ?? null : null
      const groupRun = await env.DB.prepare(
        'INSERT INTO groups (name, teacherId, subject, customSubject, level, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
      )
        .bind(
          g.name + groupSuffix,
          newTeacherId,
          g.subject,
          g.customSubject ?? null,
          g.level,
          new Date().toISOString()
        )
        .run()
      const ngid = groupRun.meta.last_row_id as number
      oldToNewGroup[g.id] = ngid

      for (const s of g.schedules) {
        const sRun = await env.DB.prepare(
          'INSERT INTO group_schedules (groupId, date, startTime, endTime, isTrialLesson, comment, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )
          .bind(ngid, s.date, s.startTime, s.endTime, s.isTrialLesson ?? 0, s.comment ?? null, new Date().toISOString())
          .run()
        oldToNewSchedule[s.id] = sRun.meta.last_row_id as number
      }

      for (const st of g.students) {
        const stRun = await env.DB.prepare(
          'INSERT INTO group_students (groupId, fullName, email, phone, createdAt) VALUES (?, ?, ?, ?, ?)'
        )
          .bind(ngid, st.fullName, st.email ?? null, st.phone ?? null, new Date().toISOString())
          .run()
        oldToNewStudent[st.id] = stRun.meta.last_row_id as number
      }
    }

    for (const a of body.attendance) {
      const newStudentId = oldToNewStudent[a.studentId]
      const newScheduleId = oldToNewSchedule[a.scheduleId]
      if (newStudentId == null || newScheduleId == null) continue
      await env.DB.prepare(
        'INSERT OR IGNORE INTO attendance (studentId, scheduleId, status, createdAt) VALUES (?, ?, ?, ?)'
      )
        .bind(newStudentId, newScheduleId, a.status, new Date().toISOString())
        .run()
    }

    return new Response(
      JSON.stringify({
        success: true,
        teachersCreated: body.teachers.length,
        groupsCreated: body.groups.length,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (err: any) {
    console.error('Backup restore error:', err)
    if (err?.message?.includes('UNIQUE constraint')) {
      return new Response(
        JSON.stringify({
          error:
            'Імя карыстальніка або назва ўжо існуе (паспрабуйце іншую копію або дату)\n\nИмя пользователя или название уже существует (попробуйте другую копию или дату)',
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }
    return new Response(JSON.stringify({ error: 'Failed to restore backup' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
