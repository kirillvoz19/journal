import { getSupabaseAdmin } from '../_shared/db.ts'
import { requireAuth } from '../_shared/requireAuth.ts'
import { decryptTeacherPassword } from '../_shared/teacherEncryption.ts'
import { corsResponse, jsonResponse } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()

  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth
  const { user } = auth

  if (user.role !== 'admin') {
    return jsonResponse({ error: 'Forbidden' }, 403)
  }

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return jsonResponse({ error: 'Teacher ID required' }, 400)

  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('teachers')
      .select('passwordEncrypted')
      .eq('id', parseInt(id, 10))
      .maybeSingle()
    if (error) throw error
    if (!data) return jsonResponse({ error: 'Teacher not found' }, 404)
    const password = await decryptTeacherPassword(data.passwordEncrypted)
    return jsonResponse({ password: password ?? '' })
  } catch (err) {
    console.error('Teacher password error:', err)
    return jsonResponse({ error: 'Failed to get password' }, 500)
  }
})
