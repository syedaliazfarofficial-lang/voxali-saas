// Edge Function: cancel-booking
// Finds active booking by client name/phone and cancels it

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
        let bookingId = body.booking_id || body.bookingId || '';

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (bookingId && !uuidRegex.test(bookingId)) bookingId = '';

        if (!bookingId && !clientName && !clientPhone) {
            return errorResponse('booking_id or client name/phone is required');
        }

        const supabase = getSupabase();

        // Get tenant timezone for phone normalization
        const { data: tenantData } = await supabase.from('tenants').select('timezone').eq('id', tenantId).single();
        const tenantTz = tenantData?.timezone || 'America/Chicago';
        const normalizedPhone = normalizePhone(clientPhone, tenantTz);

        // Find active booking
        let booking: any = null;

        if (bookingId) {
            // Direct lookup by booking ID
            const { data } = await supabase
                .from('bookings')
                .select('id, status, start_time, end_time, client_id, service_id, stylist_id, total_price')
                .eq('id', bookingId)
                .eq('tenant_id', tenantId)
                .not('status', 'in', '("cancelled","completed","no_show")')
                .single();
            booking = data;
        } else {
            // Lookup via RPC
            const { data } = await supabase.rpc('get_active_booking', {
                p_tenant_id: tenantId,
                p_client_name: clientName,
                p_client_phone: normalizedPhone,
            });
            booking = data?.[0] || null;
        }

        if (!booking) {
            return jsonResponse({
                success: false,
                message: `No active booking found for ${clientName || clientPhone}. The client may not have a current booking, or it may have already been cancelled.`,
            });
        }

        // Cancel the booking
        const bid = booking.booking_id || booking.id;
        const { error: updateErr } = await supabase
            .from('bookings')
            .update({ status: 'cancelled' })
            .eq('id', bid);

        if (updateErr) {
            return errorResponse(`Failed to cancel booking: ${updateErr.message}`, 500);
        }

        // Get tenant timezone + salon name for notification
        const { data: tenant } = await supabase
            .from('tenants').select('timezone, salon_name')
            .eq('id', tenantId).single();
        const tz = tenant?.timezone || 'America/Chicago';

        // Format time for response in salon's local timezone
        const startTime = booking.start_time ? new Date(booking.start_time) : null;
        const dateStr = startTime ? startTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: tz }) : 'N/A';
        const timeStr = startTime ? startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz }) : 'N/A';

        // Get client + service + stylist details for notification (parallel)
        const clientId = booking.client_id;
        const [clientRes, serviceRes, stylistRes] = await Promise.all([
            clientId ? supabase.from('clients').select('name, phone, email').eq('id', clientId).single() : Promise.resolve({ data: null }),
            booking.service_id ? supabase.from('services').select('name, price').eq('id', booking.service_id).single() : Promise.resolve({ data: null }),
            (booking.stylist_id || booking.staff_id) ? supabase.from('staff').select('full_name').eq('id', booking.stylist_id || booking.staff_id).single() : Promise.resolve({ data: null }),
        ]);

        const clientData = clientRes.data;
        const serviceData = serviceRes.data;
        const stylistData = stylistRes.data;

        // Queue notification (fire-and-forget for speed)
        supabase.from('notification_queue').insert({
            tenant_id: tenantId,
            event_type: 'booking_cancelled',
            booking_id: bid,
            client_name: clientData?.name || clientName || '',
            client_phone: clientData?.phone || clientPhone || '',
            client_email: clientData?.email || '',
            booking_details: {
                date: dateStr, time: timeStr,
                service: serviceData?.name || '', stylist: stylistData?.full_name || '',
                price: serviceData?.price || 0,
            },
            status: 'pending',
        });

        return jsonResponse({
            success: true,
            message: `The booking on ${dateStr} at ${timeStr} has been successfully cancelled.`,
            booking_id: bid,
            cancelled_date: dateStr,
            cancelled_time: timeStr,
        });
    } catch (e: any) {
        return errorResponse(`Server error: ${e.message}`, 500);
    }
});
