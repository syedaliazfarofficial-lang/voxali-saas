// Edge Function: booking-summary
// Returns booking details as JSON for the payment success page
// Uses service role key so it bypasses RLS
// Pre-formats date/time server-side using salon timezone (fixes wrong time on client)

import { getSupabase, jsonResponse, errorResponse, corsHeaders } from '../_shared/utils.ts';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    const url = new URL(req.url);
    const bookingId = url.searchParams.get('booking_id');

    if (!bookingId) return errorResponse('Missing booking_id', 400);

    try {
        const supabase = getSupabase();

        const { data: booking, error } = await supabase.from('bookings')
            .select('id, status, start_time, total_price, deposit_paid_amount, clients(name, email), services(name), staff(full_name), tenants(salon_name, salon_tagline, timezone)')
            .eq('id', bookingId).single();

        if (error || !booking) return errorResponse('Booking not found', 404);

        const client = (booking as any).clients || {};
        const service = (booking as any).services || {};
        const staff = (booking as any).staff || {};
        const tenant = (booking as any).tenants || {};

        // Format date/time server-side using salon timezone (avoids browser timezone issues)
        const tz = tenant.timezone || 'America/Chicago';
        const startDate = new Date(booking.start_time);
        const formattedDate = startDate.toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: tz
        });
        const formattedTime = startDate.toLocaleTimeString('en-US', {
            hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz
        });

        return jsonResponse({
            id: booking.id,
            status: booking.status,
            start_time: booking.start_time,
            formatted_date: formattedDate,
            formatted_time: formattedTime,
            total_price: booking.total_price,
            deposit_paid_amount: booking.deposit_paid_amount,
            client_name: client.name || null,
            service_name: service.name || null,
            stylist_name: staff.full_name || null,
            salon_name: tenant.salon_name || null,
            salon_tagline: tenant.salon_tagline || null,
        });
    } catch (e: any) {
        return errorResponse('Server error: ' + e.message, 500);
    }
});
