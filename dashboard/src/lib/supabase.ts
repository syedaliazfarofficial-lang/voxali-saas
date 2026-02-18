import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

let supabase: SupabaseClient

if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey === 'YOUR_ANON_KEY_HERE') {
    console.warn(
        '⚠️ Supabase env vars not set. Dashboard will show empty data. ' +
        'Fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and VITE_TENANT_ID in dashboard/.env, then restart the dev server.'
    )
    // Create a dummy client pointing to a placeholder — all queries will fail gracefully
    supabase = createClient('https://placeholder.supabase.co', 'placeholder-key')
} else {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
}

export { supabase }
