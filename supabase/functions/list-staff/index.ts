// Edge Function: list-staff (OPTIMIZED)
// Returns all active bookable staff — cached for 5 minutes

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

        // Check cache
        const cacheKey = `staff_${tenantId}`;
        const cached = cacheGet(cacheKey);
        if (cached) return jsonResponse(cached);

        const supabase = getSupabase();
        const { data: staff, error } = await supabase
            .from('staff')
            .select('id, full_name, role, is_active, can_take_bookings')
            .eq('tenant_id', tenantId).eq('is_active', true)
            .order('full_name');

        if (error) return errorResponse(`Failed to fetch staff: ${error.message}`, 500);

        const result = {
            total_staff: (staff || []).length,
            staff: (staff || []).map(s => ({
                id: s.id, name: s.full_name, role: s.role,
                can_take_bookings: s.can_take_bookings,
            })),
        };

        cacheSet(cacheKey, result);
        return jsonResponse(result);
    } catch (e: any) {
        return errorResponse(`Server error: ${e.message}`, 500);
    }
});
