// Shared utilities for all Voxali Edge Functions
// Import this in each Edge Function

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// ===== CORS Headers =====
export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-TOOLS-KEY, Authorization, apikey',
    'Content-Type': 'application/json',
};

// ===== Auth Key =====
const TOOLS_KEY = 'LUXE-AUREA-SECRET-2026';

// ===== Initialize Supabase (singleton — reused across requests while function is warm) =====
let _sb: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient {
    if (!_sb) {
        _sb = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
    }
    return _sb;
}

// ===== In-Memory Cache (persists while Edge Function is warm ~5-10 min) =====
const _cache = new Map<string, { data: any; expires: number }>();

export function cacheGet(key: string): any | null {
    const entry = _cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) { _cache.delete(key); return null; }
    return entry.data;
}

export function cacheSet(key: string, data: any, ttlMs = 300_000): void {
    _cache.set(key, { data, expires: Date.now() + ttlMs });
}

// ===== DST-aware timezone offset helper =====
export function getTzOffset(tz: string, datePart: string): string {
    const dt = new Date(datePart + 'T12:00:00Z');
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' });
    const parts = fmt.formatToParts(dt);
    const tzP = parts.find(p => p.type === 'timeZoneName');
    if (tzP?.value) {
        const m = tzP.value.match(/GMT([+-]\d{2}:\d{2})/);
        if (m) return m[1];
    }
    return '-06:00';
}

// ===== Smart Phone Normalization =====
// Converts local phone numbers to E.164 format based on tenant's timezone/country
// e.g. "0331..." → "+92331..." for Pakistan, "(555)..." → "+1555..." for US
const TZ_COUNTRY_CODE: Record<string, string> = {
    // North America
    'America/Chicago': '+1', 'America/New_York': '+1', 'America/Los_Angeles': '+1',
    'America/Denver': '+1', 'America/Phoenix': '+1', 'America/Anchorage': '+1',
    'America/Toronto': '+1', 'America/Vancouver': '+1', 'America/Edmonton': '+1',
    // South Asia
    'Asia/Karachi': '+92', 'Asia/Kolkata': '+91', 'Asia/Dhaka': '+880',
    'Asia/Colombo': '+94',
    // Middle East
    'Asia/Dubai': '+971', 'Asia/Riyadh': '+966', 'Asia/Qatar': '+974',
    'Asia/Kuwait': '+965', 'Asia/Bahrain': '+973', 'Asia/Muscat': '+968',
    // Europe
    'Europe/London': '+44', 'Europe/Paris': '+33', 'Europe/Berlin': '+49',
    'Europe/Madrid': '+34', 'Europe/Rome': '+39', 'Europe/Amsterdam': '+31',
    'Europe/Istanbul': '+90',
    // Asia Pacific
    'Asia/Singapore': '+65', 'Asia/Hong_Kong': '+852', 'Asia/Tokyo': '+81',
    'Asia/Seoul': '+82', 'Asia/Shanghai': '+86', 'Asia/Manila': '+63',
    'Asia/Jakarta': '+62', 'Asia/Bangkok': '+66', 'Asia/Kuala_Lumpur': '+60',
    // Oceania
    'Australia/Sydney': '+61', 'Australia/Melbourne': '+61', 'Pacific/Auckland': '+64',
    // Africa
    'Africa/Lagos': '+234', 'Africa/Nairobi': '+254', 'Africa/Johannesburg': '+27',
    'Africa/Cairo': '+20',
};

export function normalizePhone(rawPhone: string, timezone?: string): string {
    if (!rawPhone) return '';
    // Strip all spaces, dashes, dots, parentheses
    let phone = rawPhone.replace(/[\s\-\.\(\)]/g, '');
    // Already in E.164 format
    if (phone.startsWith('+')) return phone;
    // Get country code from timezone
    const tz = timezone || 'America/Chicago';
    // Try exact match first, then prefix match (e.g., "America/" matches first America/ entry)
    let dialCode = TZ_COUNTRY_CODE[tz];
    if (!dialCode) {
        const region = tz.split('/')[0];
        const fallback = Object.entries(TZ_COUNTRY_CODE).find(([k]) => k.startsWith(region + '/'));
        dialCode = fallback ? fallback[1] : '+1';
    }
    // Remove leading 0 (common in most countries: 0331... → 331...)
    // But NOT for US/Canada numbers (they don't start with 0)
    if (phone.startsWith('0') && dialCode !== '+1') {
        phone = phone.substring(1);
    }
    // US numbers: strip leading 1 if 11 digits (1-555-123-4567 → 5551234567)
    if (dialCode === '+1' && phone.length === 11 && phone.startsWith('1')) {
        phone = phone.substring(1);
    }
    return dialCode + phone;
}

// ===== Validate Request (auth only, no tenant_id required) =====
export function validateAuth(req: Request): { valid: boolean; error?: string } {
    const authKey = req.headers.get('x-tools-key') || req.headers.get('X-TOOLS-KEY');
    if (authKey !== TOOLS_KEY) {
        return { valid: false, error: 'Unauthorized: Invalid tools key' };
    }
    return { valid: true };
}

// ===== Get tenant_id from URL query params OR body =====
export function getTenantId(req: Request, body?: any): string | null {
    // Try URL query params first
    const url = new URL(req.url);
    const fromUrl = url.searchParams.get('tenant_id');
    if (fromUrl) return fromUrl;

    // Try body
    if (body?.tenant_id) return body.tenant_id;

    return null;
}

// ===== Legacy validateRequest (backward compatible) =====
export function validateRequest(req: Request): { valid: boolean; error?: string; tenantId?: string } {
    const authKey = req.headers.get('x-tools-key') || req.headers.get('X-TOOLS-KEY');
    if (authKey !== TOOLS_KEY) {
        return { valid: false, error: 'Unauthorized: Invalid tools key' };
    }

    // Get tenant_id from URL query params (for backward compatibility)
    const url = new URL(req.url);
    const tenantId = url.searchParams.get('tenant_id');
    // Don't fail if missing - functions will check body too
    return { valid: true, tenantId: tenantId || undefined };
}

// ===== JSON Response Helper =====
export function jsonResponse(data: any, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: corsHeaders,
    });
}

// ===== Error Response Helper =====
export function errorResponse(message: string, status = 400): Response {
    return new Response(JSON.stringify({ error: message }), {
        status,
        headers: corsHeaders,
    });
}

// ===== CORS Preflight Handler =====
export function handleCORS(): Response {
    return new Response('ok', { headers: corsHeaders });
}
