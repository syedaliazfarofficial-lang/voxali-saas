// Edge Function: get-booking-public
// Fetches booking details for the payment success page
// Uses service role key to bypass RLS — only returns safe fields

import { getSupabase, jsonResponse, errorResponse, handleCORS } from '../_shared/utils.ts';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return handleCORS();

    try {
        const url = new URL(req.url);
        const bookingId = url.searchParams.get('booking_id') || '';

        if (!bookingId) return errorResponse('booking_id is required', 400);

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(bookingId)) return errorResponse('Invalid booking_id', 400);

        const supabase = getSupabase(); // uses SERVICE_ROLE_KEY — bypasses RLS

        const { data: booking, error } = await supabase
            .from('bookings')
            .select(`
                id, status, start_time, total_price, deposit_paid_amount, deposit_amount,
                clients(name, email),
                services(name),
                staff(full_name),
                tenants(salon_name, salon_tagline, timezone)
            `)
            .eq('id', bookingId)
            .single();

        if (error || !booking) {
            return errorResponse('Booking not found', 404);
        }

        return jsonResponse(booking);
    } catch (e: any) {
        return errorResponse(`Server error: ${e.message}`, 500);
    }
});
