// Edge Function: list-services (OPTIMIZED)
// Returns all active services — cached for 5 minutes

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
        const cacheKey = `services_${tenantId}`;
        const cached = cacheGet(cacheKey);
        if (cached) return jsonResponse(cached);

        const supabase = getSupabase();
        const { data: services, error } = await supabase
            .from('services')
            .select('id, name, price, duration, category, deposit_amount, description')
            .eq('tenant_id', tenantId).eq('is_active', true)
            .order('category').order('name');

        if (error) return errorResponse(`Failed to fetch services: ${error.message}`, 500);

        const grouped: Record<string, any[]> = {};
        for (const svc of (services || [])) {
            const cat = svc.category || 'General';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push({ id: svc.id, name: svc.name, price: svc.price, duration_minutes: svc.duration, deposit_amount: svc.deposit_amount, description: svc.description });
        }

        const result = {
            total_services: (services || []).length,
            categories: Object.keys(grouped),
            services_by_category: grouped,
            services: (services || []).map(s => ({ id: s.id, name: s.name, price: s.price, duration_minutes: s.duration, deposit_amount: s.deposit_amount })),
        };

        cacheSet(cacheKey, result);
        return jsonResponse(result);
    } catch (e: any) {
        return errorResponse(`Server error: ${e.message}`, 500);
    }
});
