import type { D1Database, PagesFunction } from '@cloudflare/workers-types'
import { requireAuth } from '../middleware/auth'

interface Env {
  DB: D1Database
  JWT_SECRET?: string
}

interface Group {
  id?: number
  name: string
  teacherId: number | null
  subject: string
  customSubject?: string
  level: string
  createdAt?: string
  schedules?: GroupSchedule[]
  students?: GroupStudent[]
}

interface GroupSchedule {
  id?: number
  groupId?: number
  date: string
  startTime: string
  endTime: string
  isTrialLesson?: boolean
  comment?: string
  createdAt?: string
}

type DbBoolean = number | string | boolean | null

type GroupScheduleDbRow = Omit<GroupSchedule, 'isTrialLesson'> & { isTrialLesson: DbBoolean }

const parseDbBoolean = (value: DbBoolean): boolean => {
  if (value === null) return false
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  return value === '1'
}

const mapScheduleDbRowToApi = (row: GroupScheduleDbRow): GroupSchedule => ({
  ...row,
  isTrialLesson: parseDbBoolean(row.isTrialLesson),
})

interface GroupStudent {
  id?: number
  groupId?: number
  fullName: string
  email?: string
  phone?: string
  createdAt?: string
}

// @ts-expect-error requireAuth wraps handler types for PagesFunction
export const onRequestGet: PagesFunction<Env> = requireAuth(async (context) => {
  const { env } = context
  const user = (context as any).user as { id: number; username: string; role?: string }

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

    // Для преподавателя — только его группы
    const isTeacher = user?.role === 'teacher'
    const groupsResult = isTeacher
      ? await env.DB.prepare(
          'SELECT id, name, teacherId, subject, customSubject, level, createdAt FROM groups WHERE teacherId = ? ORDER BY id'
        )
        .bind(user.id)
        .all()
      : await env.DB.prepare(
          'SELECT id, name, teacherId, subject, customSubject, level, createdAt FROM groups ORDER BY id'
        )
        .all()

    const groups = (groupsResult.results || []) as Group[]

    // Load schedules and students for each group
    for (const group of groups) {
      const schedulesResult = await env.DB.prepare(
        'SELECT id, groupId, date, startTime, endTime, isTrialLesson, comment, createdAt FROM group_schedules WHERE groupId = ? ORDER BY date, startTime'
      )
        .bind(group.id)
        .all()

      group.schedules = ((schedulesResult.results || []) as GroupScheduleDbRow[]).map(
        mapScheduleDbRowToApi
      )

      const studentsResult = await env.DB.prepare(
        'SELECT id, groupId, fullName, email, phone, createdAt FROM group_students WHERE groupId = ? ORDER BY id'
      )
        .bind(group.id)
        .all()

      group.students = (studentsResult.results || []) as GroupStudent[]
    }

    return new Response(JSON.stringify(groups), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error fetching groups:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch groups' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})

// @ts-expect-error requireAuth wraps handler types for PagesFunction
export const onRequestPost: PagesFunction<Env> = requireAuth(async (context) => {
  const { env, request } = context
  const user = (context as any).user as { id: number; username: string; role?: string }

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
      name: string
      teacherId?: number | null
      subject: string
      customSubject?: string
      level: string
      schedules?: GroupSchedule[]
      students?: GroupStudent[]
    }

    // Преподаватель может создавать группы только за себя
    if (user?.role === 'teacher') {
      body.teacherId = user.id
    }

    if (!body.name || !body.subject || !body.level) {
      return new Response(
        JSON.stringify({ error: 'Name, subject and level are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Insert group (teacherId опционально — группа может быть без преподавателя)
    const groupResult = await env.DB.prepare(
      'INSERT INTO groups (name, teacherId, subject, customSubject, level, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
    )
      .bind(
        body.name,
        body.teacherId ?? null,
        body.subject,
        body.customSubject || null,
        body.level,
        new Date().toISOString()
      )
      .run()

    const groupId = groupResult.meta.last_row_id

    // Insert schedules
    if (body.schedules && body.schedules.length > 0) {
      for (const schedule of body.schedules) {
        await env.DB.prepare(
          'INSERT INTO group_schedules (groupId, date, startTime, endTime, isTrialLesson, comment, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )
          .bind(
            groupId,
            schedule.date,
            schedule.startTime,
            schedule.endTime,
            schedule.isTrialLesson ? 1 : 0,
            schedule.comment || null,
            new Date().toISOString()
          )
          .run()
      }
    }

    // Insert students
    if (body.students && body.students.length > 0) {
      for (const student of body.students) {
        await env.DB.prepare(
          'INSERT INTO group_students (groupId, fullName, email, phone, createdAt) VALUES (?, ?, ?, ?, ?)'
        )
          .bind(
            groupId,
            student.fullName,
            student.email || null,
            student.phone || null,
            new Date().toISOString()
          )
          .run()
      }
    }

    // Fetch created group with all relations
    const group = await env.DB.prepare(
      'SELECT id, name, teacherId, subject, customSubject, level, createdAt FROM groups WHERE id = ?'
    )
      .bind(groupId)
      .first() as Group

    const schedulesResult = await env.DB.prepare(
      'SELECT id, groupId, date, startTime, endTime, isTrialLesson, comment, createdAt FROM group_schedules WHERE groupId = ? ORDER BY date, startTime'
    )
      .bind(groupId)
      .all()

    group.schedules = ((schedulesResult.results || []) as GroupScheduleDbRow[]).map(
      mapScheduleDbRowToApi
    )

    const studentsResult = await env.DB.prepare(
      'SELECT id, groupId, fullName, email, phone, createdAt FROM group_students WHERE groupId = ? ORDER BY id'
    )
      .bind(groupId)
      .all()

    group.students = (studentsResult.results || []) as GroupStudent[]

    return new Response(JSON.stringify(group), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error creating group:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to create group' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})

// @ts-expect-error requireAuth wraps handler types for PagesFunction
export const onRequestPut: PagesFunction<Env> = requireAuth(async (context) => {
  const { env, request } = context
  const user = (context as any).user as { id: number; username: string; role?: string }

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
      name?: string
      teacherId?: number | null
      subject?: string
      customSubject?: string
      level?: string
      schedules?: GroupSchedule[]
      students?: GroupStudent[]
    }

    if (!body.id) {
      return new Response(
        JSON.stringify({ error: 'Group ID is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Преподаватель может редактировать только свои группы
    if (user?.role === 'teacher') {
      const existing = await env.DB.prepare('SELECT teacherId FROM groups WHERE id = ?')
        .bind(body.id)
        .first<{ teacherId: number | null }>()
      if (!existing || existing.teacherId !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Forbidden' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      }
      body.teacherId = user.id
    }

    const updates: string[] = []
    const values: Array<string | number | null> = []

    if (body.name) {
      updates.push('name = ?')
      values.push(body.name)
    }
    if (body.teacherId !== undefined) {
      updates.push('teacherId = ?')
      values.push(body.teacherId)
    }
    if (body.subject) {
      updates.push('subject = ?')
      values.push(body.subject)
    }
    if (body.customSubject !== undefined) {
      updates.push('customSubject = ?')
      values.push(body.customSubject || null)
    }
    if (body.level) {
      updates.push('level = ?')
      values.push(body.level)
    }

    if (updates.length > 0) {
      values.push(body.id)
      const result = await env.DB.prepare(
        `UPDATE groups SET ${updates.join(', ')} WHERE id = ?`
      )
        .bind(...values)
        .run()

      if (result.meta.changes === 0) {
        return new Response(
          JSON.stringify({ error: 'Group not found' }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // Update schedules if provided
    if (body.schedules !== undefined) {
      // Delete existing schedules
      await env.DB.prepare('DELETE FROM group_schedules WHERE groupId = ?')
        .bind(body.id)
        .run()

      // Insert new schedules
      if (body.schedules.length > 0) {
        for (const schedule of body.schedules) {
          await env.DB.prepare(
            'INSERT INTO group_schedules (groupId, date, startTime, endTime, isTrialLesson, comment, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
          )
            .bind(
              body.id,
              schedule.date,
              schedule.startTime,
              schedule.endTime,
              schedule.isTrialLesson ? 1 : 0,
              schedule.comment || null,
              new Date().toISOString()
            )
            .run()
        }
      }
    }

    // Update students if provided
    if (body.students !== undefined) {
      // Delete existing students (and their attendance)
      await env.DB.prepare('DELETE FROM group_students WHERE groupId = ?')
        .bind(body.id)
        .run()

      // Insert new students
      if (body.students.length > 0) {
        for (const student of body.students) {
          await env.DB.prepare(
            'INSERT INTO group_students (groupId, fullName, email, phone, createdAt) VALUES (?, ?, ?, ?, ?)'
          )
            .bind(
              body.id,
              student.fullName,
              student.email || null,
              student.phone || null,
              new Date().toISOString()
            )
            .run()
        }
      }
    }

    // Fetch updated group
    const group = await env.DB.prepare(
      'SELECT id, name, teacherId, subject, customSubject, level, createdAt FROM groups WHERE id = ?'
    )
      .bind(body.id)
      .first() as Group

    const schedulesResult = await env.DB.prepare(
      'SELECT id, groupId, date, startTime, endTime, isTrialLesson, comment, createdAt FROM group_schedules WHERE groupId = ? ORDER BY date, startTime'
    )
      .bind(body.id)
      .all()

    group.schedules = ((schedulesResult.results || []) as GroupScheduleDbRow[]).map(
      mapScheduleDbRowToApi
    )

    const studentsResult = await env.DB.prepare(
      'SELECT id, groupId, fullName, email, phone, createdAt FROM group_students WHERE groupId = ? ORDER BY id'
    )
      .bind(body.id)
      .all()

    group.students = (studentsResult.results || []) as GroupStudent[]

    return new Response(JSON.stringify(group), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error updating group:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to update group' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})

// @ts-expect-error requireAuth wraps handler types for PagesFunction
export const onRequestDelete: PagesFunction<Env> = requireAuth(async (context) => {
  const { env, request } = context
  const user = (context as any).user as { id: number; username: string; role?: string }

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
        JSON.stringify({ error: 'Group ID is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const groupId = parseInt(id)

    // Преподаватель может удалять только свои группы
    if (user?.role === 'teacher') {
      const existing = await env.DB.prepare('SELECT teacherId FROM groups WHERE id = ?')
        .bind(groupId)
        .first<{ teacherId: number | null }>()
      if (!existing || existing.teacherId !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Forbidden' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    const result = await env.DB.prepare('DELETE FROM groups WHERE id = ?')
      .bind(groupId)
      .run()

    if (result.meta.changes === 0) {
      return new Response(
        JSON.stringify({ error: 'Group not found' }),
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
    console.error('Error deleting group:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to delete group' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
