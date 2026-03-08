// Edge Function: reschedule-booking
// Finds active booking, checks new slot availability, updates times

import { getSupabase, validateRequest, jsonResponse, errorResponse, handleCORS, normalizePhone } from '../_shared/utils.ts';

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
        const clientName = body.name || body.client_name || '';
        const clientPhone = body.phone || body.client_phone || '';
        const newDate = body.new_date || body.date || '';
        const newTime = body.new_time || body.time || '';

        if (!clientName && !clientPhone) {
            return errorResponse('Client name or phone is required');
        }
        if (!newDate || !newTime) {
            return errorResponse('new_date (YYYY-MM-DD) and new_time (HH:MM) are required');
        }

        const supabase = getSupabase();

        // Get tenant timezone first (for phone normalization)
        const { data: tenant } = await supabase.from('tenants').select('timezone').eq('id', tenantId).single();
        const tz = tenant?.timezone || 'America/Chicago';
        const normalizedPhone = normalizePhone(clientPhone, tz);

        // Find active booking (using normalized phone)
        const { data: bookings } = await supabase.rpc('get_active_booking', {
            p_tenant_id: tenantId,
            p_client_name: clientName,
            p_client_phone: normalizedPhone,
        });

        const booking = bookings?.[0];
        if (!booking) {
            return jsonResponse({
                success: false,
                message: `No active booking found for ${clientName || clientPhone}.`,
            });
        }

        // Get service duration
        let durationMinutes = 30; // default
        if (booking.service_id) {
            const { data: svc } = await supabase
                .from('services')
                .select('duration')
                .eq('id', booking.service_id)
                .single();
            if (svc?.duration) durationMinutes = svc.duration;
        }

        // Build timezone offset using Intl API (DST-aware)
        function getTzOffset(timezone: string, datePart: string): string {
            const dt = new Date(datePart + 'T12:00:00Z');
            const fmt = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'longOffset' });
            const parts = fmt.formatToParts(dt);
            const tzP = parts.find(p => p.type === 'timeZoneName');
            if (tzP?.value) {
                const m = tzP.value.match(/GMT([+-]\d{2}:\d{2})/);
                if (m) return m[1];
            }
            return '-06:00';
        }
        const tzOffset = getTzOffset(tz, newDate);

        // Calculate new start and end times
        const newStartTime = `${newDate}T${newTime}:00${tzOffset}`;
        const startDate = new Date(newStartTime);
        const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
        const newEndTime = endDate.toISOString();

        console.log('[RESCHEDULE] booking found:', JSON.stringify({ id: booking.booking_id || booking.id, stylist_id: booking.stylist_id, service_id: booking.service_id }));
        console.log('[RESCHEDULE] tz:', tz, 'tzOffset:', tzOffset, 'newStartTime:', newStartTime);

        // Check if new slot is available
        const { data: slots, error: slotErr } = await supabase.rpc('get_available_slots', {
            p_tenant_id: tenantId,
            p_date: newDate,
            p_staff_id: booking.stylist_id,
            p_service_ids: booking.service_id ? [booking.service_id] : null,
        });

        console.log('[RESCHEDULE] slotErr:', slotErr);
        console.log('[RESCHEDULE] slots type:', typeof slots, 'isArray:', Array.isArray(slots));
        console.log('[RESCHEDULE] slots raw:', JSON.stringify(slots)?.substring(0, 500));

        // Verify requested time is in available slots
        const requestedHHMM = newTime.substring(0, 5);
        const allSlots = Array.isArray(slots) ? slots : (slots?.slots || []);
        console.log('[RESCHEDULE] allSlots count:', allSlots.length, 'requestedHHMM:', requestedHHMM);
        if (allSlots.length > 0) {
            console.log('[RESCHEDULE] first slot:', JSON.stringify(allSlots[0]));
            const firstRaw = allSlots[0].start_at || allSlots[0].slot_time || '';
            console.log('[RESCHEDULE] first slot raw:', firstRaw, 'extracted:', firstRaw.substring(11, 16));
        }
        const slotAvailable = allSlots.some((s: any) => {
            const raw = s.start_at || s.slot_time || '';
            const slotTime = raw.substring(11, 16);
            return slotTime === requestedHHMM;
        });

        if (!slotAvailable) {
            // Return available slots as suggestions
            const availableTimes = allSlots.slice(0, 5).map((s: any) => (s.start_at || s.slot_time || '').substring(11, 16));
            return jsonResponse({
                success: false,
                message: `The requested time ${newTime} on ${newDate} is not available.`,
                available_times: availableTimes,
                suggestion: availableTimes.length > 0
                    ? `Available times on ${newDate}: ${availableTimes.join(', ')}`
                    : `No available slots on ${newDate}. Please try a different date.`,
            });
        }

        // Update booking times
        const bid = booking.booking_id || booking.id;
        const { error: updateErr } = await supabase
            .from('bookings')
            .update({
                start_time: newStartTime,
                end_time: newEndTime,
            })
            .eq('id', bid);

        if (updateErr) {
            return errorResponse(`Failed to reschedule: ${updateErr.message}`, 500);
        }

        const friendlyDate = startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: tz });
        const friendlyTime = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz });

        // Get client + service + stylist details for notification (parallel)
        const [clientRes, serviceRes, stylistRes] = await Promise.all([
            booking.client_id ? supabase.from('clients').select('name, phone, email').eq('id', booking.client_id).single() : Promise.resolve({ data: null }),
            booking.service_id ? supabase.from('services').select('name, price').eq('id', booking.service_id).single() : Promise.resolve({ data: null }),
            booking.stylist_id ? supabase.from('staff').select('full_name').eq('id', booking.stylist_id).single() : Promise.resolve({ data: null }),
        ]);

        // Queue notification (MUST await — fire-and-forget gets killed by Deno runtime)
        await supabase.from('notification_queue').insert({
            tenant_id: tenantId,
            event_type: 'booking_rescheduled',
            booking_id: bid,
            client_name: clientRes.data?.name || clientName || '',
            client_phone: clientRes.data?.phone || clientPhone || '',
            client_email: clientRes.data?.email || '',
            booking_details: {
                date: friendlyDate, time: friendlyTime,
                service: serviceRes.data?.name || '', stylist: stylistRes.data?.full_name || '',
                price: serviceRes.data?.price || 0,
            },
            status: 'pending',
        });

        return jsonResponse({
            success: true,
            message: `Booking has been rescheduled to ${friendlyDate} at ${friendlyTime}.`,
            booking_id: bid,
            new_date: newDate,
            new_time: newTime,
        });
    } catch (e: any) {
        return errorResponse(`Server error: ${e.message}`, 500);
    }
});
