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

        // ── DATE GUARD: auto-correct past years (VAPI hallucination protection) ──
        let checkedDate = date;
        const currentYear = new Date().getFullYear();
        const dateYear = parseInt(checkedDate.substring(0, 4));
        if (dateYear < currentYear) {
            checkedDate = `${currentYear}${checkedDate.substring(4)}`;
            console.log(`[CHECK-AVAIL] Date year corrected from ${date} to ${checkedDate}`);
        }

        let debugOutput: any = {};
        
        // Debug Phase 1: check tenant
        const { data: tenant } = await supabase.from('tenants').select('*').eq('id', tenantId).single();
        const dow = new Date(checkedDate).getUTCDay(); // Not exactly Postgres DOW but close enough
        
        // Debug Phase 2: check tenant_hours
        const { data: th } = await supabase.from('tenant_hours').select('*').eq('tenant_id', tenantId).eq('day_of_week', 2).single();
        debugOutput.tenant = tenant;
        debugOutput.tenantHours = th;
        
        // Debug Phase 3: check staff_working_hours
        const { data: swh } = await supabase.from('staff_working_hours').select('*').eq('tenant_id', tenantId).eq('day_of_week', 2);
        debugOutput.staffWorkingHours = swh;

        const { data: procs } = await supabase.rpc('get_available_slots', { p_tenant_id: tenantId, p_date: checkedDate });
        // wait I cant query pg_proc using frontend supabase-js. I need a backend way.
        // Let's just create an RPC in DDL that queries pg_proc? No, no permissions.
        // It's much simpler! I'll just change the edge function to call the function with explicit named parameters to force PostgREST to use my 5-param signature!
        const rpcParams: any = {
            p_tenant_id: tenantId,
            p_date: checkedDate,
            p_service_ids: null,
            p_staff_id: null,
            p_slot_interval: 30
        };

        const { data, error } = await supabase
            .rpc('get_available_slots', rpcParams);

        if (checkedDate === '2026-03-24') {
            return jsonResponse({ debug: "Calling with 5 params", rpcData: data, error });
        }


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
            date: checkedDate,
            ...(checkedDate !== date ? { date_note: `⚠️ Date corrected from ${date} to ${checkedDate}. The current year is ${currentYear}.` } : {}),
            total_available_slots: totalSlots,
            available: totalSlots > 0,
            message: totalSlots > 0
                ? `${totalSlots} time slots available on ${checkedDate}`
                : `No available slots on ${checkedDate}. Please try another date.`,
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
