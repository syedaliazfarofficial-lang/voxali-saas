import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY || ''

let supabase: SupabaseClient
let supabaseAdmin: SupabaseClient

if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey === 'YOUR_ANON_KEY_HERE') {
    console.warn(
        '⚠️ Supabase env vars not set. Dashboard will show empty data. ' +
        'Fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and VITE_TENANT_ID in dashboard/.env, then restart the dev server.'
    )
    // Create a dummy client pointing to a placeholder — all queries will fail gracefully
    supabase = createClient('https://placeholder.supabase.co', 'placeholder-key')
    supabaseAdmin = supabase
} else {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,       // Keep session in localStorage for instant reload
            autoRefreshToken: true,      // Keep token fresh (AuthContext handles this silently)
            detectSessionInUrl: false,   // Don't parse URL for session (prevents double init)
        }
    })
    // Admin client bypasses RLS — used ONLY for initial profile fetch in AuthContext
    supabaseAdmin = supabaseServiceKey
        ? createClient(supabaseUrl, supabaseServiceKey, {
            auth: { persistSession: false, autoRefreshToken: false }
        })
        : supabase
}

export { supabase, supabaseAdmin }

