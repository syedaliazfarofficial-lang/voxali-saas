// Edge Function: get-salon-info (OPTIMIZED)
// Returns salon info + hours — cached for 5 minutes

import { getSupabase, validateRequest, jsonResponse, errorResponse, handleCORS, cacheGet, cacheSet } from '../_shared/utils.ts';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return handleCORS();

    try {
        const auth = validateRequest(req);
        if (!auth.valid) return errorResponse(auth.error!, 401);

        let body: any = {};
        try { body = await req.json(); } catch { }
        const tenantId = auth.tenantId || body.tenant_id;
        if (!tenantId) return errorResponse('Missing tenant_id');

        // Check cache first
        const cacheKey = `salon_info_${tenantId}`;
        const cached = cacheGet(cacheKey);

        let tenant: any, hours: any[];

        if (cached) {
            tenant = cached.tenant;
            hours = cached.hours;
        } else {
            const supabase = getSupabase();

            // Parallel DB calls — saves ~150ms
            const [tenantRes, hoursRes] = await Promise.all([
                supabase.from('tenants')
                    .select('id, salon_name, salon_tagline, salon_email, salon_phone_owner, salon_website, timezone, google_review_url')
                    .eq('id', tenantId).single(),
                supabase.from('tenant_hours')
                    .select('day_of_week, open_time, close_time, is_open')
                    .eq('tenant_id', tenantId).order('day_of_week'),
            ]);

            if (tenantRes.error || !tenantRes.data) return errorResponse('Salon not found', 404);
            tenant = tenantRes.data;
            hours = hoursRes.data || [];

            // Cache for 5 minutes
            cacheSet(cacheKey, { tenant, hours });
        }

        // Calculate current date/time in salon's timezone
        const tz = tenant.timezone || 'America/Chicago';
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, weekday: 'long',
        });
        const parts = formatter.formatToParts(now);
        const g = (type: string) => parts.find(p => p.type === type)?.value || '';

        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const formattedHours = hours.map((h: any) => ({
            day: dayNames[h.day_of_week] || `Day ${h.day_of_week}`,
            open: h.is_open === false ? 'CLOSED' : h.open_time,
            close: h.is_open === false ? 'CLOSED' : h.close_time,
            is_closed: h.is_open === false,
        }));

        return jsonResponse({
            salon_name: tenant.salon_name, salon_tagline: tenant.salon_tagline,
            salon_email: tenant.salon_email, salon_phone: tenant.salon_phone_owner,
            salon_website: tenant.salon_website, timezone: tz,
            current_date: `${g('month')}/${g('day')}/${g('year')}`,
            current_time: `${g('hour')}:${g('minute')} ${g('dayPeriod')}`,
            current_day: g('weekday'), current_year: g('year'),
            business_hours: formattedHours, google_review_url: tenant.google_review_url,
        });
    } catch (e: any) {
        return errorResponse(`Server error: ${e.message}`, 500);
    }
});
