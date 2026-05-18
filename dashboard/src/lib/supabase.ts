import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// WARNING: VITE_SUPABASE_SERVICE_KEY is exposed in the browser bundle.
// This bypasses all RLS policies. Migrate admin operations to Edge Functions
// and remove this key from the frontend as soon as possible.
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY || ''
if (supabaseServiceKey && typeof window !== 'undefined') {
    console.warn(
        '⚠️ SECURITY: VITE_SUPABASE_SERVICE_KEY is set in the frontend. ' +
        'This key bypasses Row Level Security and is visible to anyone inspecting the browser bundle. ' +
        'Move admin operations to Supabase Edge Functions and remove this key from the frontend.'
    )
}

let supabase: SupabaseClient
let supabaseAdmin: SupabaseClient

if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey === 'YOUR_ANON_KEY_HERE') {
    console.warn(
        '⚠️ Supabase env vars not set. Dashboard will show empty data. ' +
        'Fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and VITE_TENANT_ID in dashboard/.env, then restart the dev server.'
    )
    supabase = createClient('https://placeholder.supabase.co', 'placeholder-key')
    supabaseAdmin = supabase
} else {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
        }
    })
    // Admin client bypasses RLS — used ONLY for initial profile fetch in AuthContext.
    // TODO: Migrate all supabaseAdmin usage to Edge Functions to eliminate
    // the need for the service key in the frontend.
    supabaseAdmin = supabaseServiceKey
        ? createClient(supabaseUrl, supabaseServiceKey, {
            auth: { persistSession: false, autoRefreshToken: false }
        })
        : supabase
}

export { supabase, supabaseAdmin }

