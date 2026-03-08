// Edge Function: check-availability
// Returns available time slots for a given date + optional stylist
// Uses the get_available_slots SQL RPC function

import { getSupabase, validateRequest, jsonResponse, errorResponse, handleCORS } from '../_shared/utils.ts';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return handleCORS();

    try {
        const auth = validateRequest(req);
        if (!auth.valid) return errorResponse(auth.error!, 401);

        // Parse body  get tenant_id from body (ElevenLabs) or URL
        let body: any = {};
        try { body = await req.json(); } catch { }
        const tenantId = auth.tenantId || body.tenant_id;
        if (!tenantId) return errorResponse('Missing tenant_id');
        const { date, stylist_id, service_id } = body;

        if (!date) {
            return errorResponse('Missing required field: date (YYYY-MM-DD format)');
        }

        const supabase = getSupabase();

        // Build RPC params
        const rpcParams: any = {
            p_tenant_id: tenantId,
            p_date: date,
        };

        // Call get_available_slots RPC
        const { data, error } = await supabase
            .rpc('get_available_slots', rpcParams);



        if (error) {
            return errorResponse(`Failed to check availability: ${error.message}`, 500);
        }

        // Ensure slots is an array
        let slots = [];
        if (Array.isArray(data)) {
            slots = data;
        } else if (data && typeof data === 'object' && Array.isArray(data.slots)) {
            slots = data.slots;
        }

        // Format slots for AI — group by stylist
        const slotsByStaff: Record<string, any[]> = {};
        for (let i = 0; i < slots.length; i++) {
            const slot = slots[i];
            const staffName = slot.staff_name || 'Any Stylist';
            if (!slotsByStaff[staffName]) slotsByStaff[staffName] = [];
            slotsByStaff[staffName].push({
                time: slot.start_at || slot.time || slot.display_start,
                time_end: slot.end_at || slot.time_end || slot.display_end,
                staff_id: slot.staff_id,
                staff_name: staffName,
            });
        }

        const totalSlots = slots.length;

        return jsonResponse({
            date,
            total_available_slots: totalSlots,
            available: totalSlots > 0,
            message: totalSlots > 0
                ? `${totalSlots} time slots available on ${date}`
                : `No available slots on ${date}. Please try another date.`,
            slots_by_stylist: slotsByStaff,
            all_slots: slots.map((s: any) => ({
                time: s.start_at || s.time || s.display_start,
                time_end: s.end_at || s.time_end || s.display_end,
                staff_id: s.staff_id,
                staff_name: s.staff_name,
            })),
        });
    } catch (e: any) {
        return errorResponse(`Server error: ${e.message}`, 500);
    }
});
