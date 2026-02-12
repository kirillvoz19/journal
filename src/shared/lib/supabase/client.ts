import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL ?? ''
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

if (!url || !anonKey) {
  console.warn(
    'Supabase env missing: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Supabase API will not work until then.'
  )
}

/** Supabase client. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for real API access. */
export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder')
