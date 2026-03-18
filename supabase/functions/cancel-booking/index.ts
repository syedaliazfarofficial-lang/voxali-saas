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
        console.log('[CANCEL] Raw Body:', JSON.stringify(body));

        const clientName = body.name || body.client_name || body.clientName || '';
        const clientPhone = body.phone || body.client_phone || body.clientPhone || '';
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

        // Queue notification (MUST await — fire-and-forget gets killed by Deno runtime)
        await supabase.from('notification_queue').insert({
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

        // Trigger notification worker synchronously to prevent Deno from dropping the process
        try {
            const edgeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`;
            await fetch(edgeUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (e) {
            console.error('Trigger error', e);
        }

        // ============================================================
        // WAITLIST CHECK — notify waiting clients for same date+service
        // ============================================================
        const cancelledDateISO = startTime ? startTime.toLocaleDateString('en-CA', { timeZone: tz }) : null;
        if (cancelledDateISO) {
            const { data: waitlistEntries } = await supabase
                .from('waitlist')
                .select('id, client_name, client_phone, client_email, notes')
                .eq('tenant_id', tenantId)
                .eq('preferred_date', cancelledDateISO)
                .eq('status', 'waiting')
                .limit(5);

            if (waitlistEntries && waitlistEntries.length > 0) {
                console.log(`[CANCEL] Found ${waitlistEntries.length} waitlist entries for ${cancelledDateISO}, notifying...`);

                // Get salon info for booking link
                const { data: salonInfo } = await supabase
                    .from('tenants')
                    .select('salon_name, salon_website')
                    .eq('id', tenantId).single();

                for (const entry of waitlistEntries) {
                    // Lookup client email by phone
                    const { data: waitlistClient } = await supabase
                        .from('clients')
                        .select('email')
                        .eq('tenant_id', tenantId)
                        .eq('phone', entry.client_phone)
                        .limit(1).single();

                    // Queue waitlist notification
                    await supabase.from('notification_queue').insert({
                        tenant_id: tenantId,
                        event_type: 'waitlist_slot_available',
                        booking_id: null,
                        client_name: entry.client_name || '',
                        client_phone: entry.client_phone || '',
                        client_email: waitlistClient?.email || entry.client_email || '',
                        booking_details: {
                            date: dateStr,
                            time: timeStr,
                            service: serviceData?.name || '',
                            stylist: stylistData?.full_name || '',
                            price: serviceData?.price || 0,
                            salon_name: salonInfo?.salon_name || tenant?.salon_name || '',
                            waitlist_message: `Great news! A slot has opened up for ${serviceData?.name || 'your requested service'} on ${dateStr} at ${timeStr}. Please call us to secure your appointment.`,
                        },
                        status: 'pending',
                    });

                    // Mark waitlist entry as notified
                    await supabase.from('waitlist')
                        .update({ status: 'notified' })
                        .eq('id', entry.id);
                }

                // Trigger notification worker
                try {
                    const edgeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`;
                    await fetch(edgeUrl, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                            'Content-Type': 'application/json'
                        }
                    });
                } catch (e) {
                    console.error('[CANCEL] Waitlist notification trigger error', e);
                }
            }
        }

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
