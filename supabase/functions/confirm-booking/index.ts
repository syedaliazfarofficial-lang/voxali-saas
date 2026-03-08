// Edge Function: confirm-booking
// Manually confirms a booking (e.g., for walk-ins or manual confirmation)

import { getSupabase, validateRequest, jsonResponse, errorResponse, handleCORS } from '../_shared/utils.ts';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return handleCORS();

    try {
        const auth = validateRequest(req);
        if (!auth.valid) return errorResponse(auth.error!, 401);

        // Parse body  get tenant_id from body (ElevenLabs) or URL
        let body: any = {};
        try { body = await req.json(); } catch {}
        const tenantId = auth.tenantId || body.tenant_id;
        if (!tenantId) return errorResponse('Missing tenant_id');
        const bookingId = body.booking_id || '';

        if (!bookingId) {
            return errorResponse('booking_id is required');
        }

        const supabase = getSupabase();

        // Get booking
        const { data: booking } = await supabase
            .from('bookings')
            .select('id, status, client_id')
            .eq('id', bookingId)
            .eq('tenant_id', tenantId)
            .single();

        if (!booking) {
            return errorResponse('Booking not found', 404);
        }

        if (booking.status === 'confirmed') {
            return jsonResponse({ success: true, message: 'Booking is already confirmed.' });
        }

        // Update to confirmed
        const { error } = await supabase
            .from('bookings')
            .update({ status: 'confirmed' })
            .eq('id', bookingId);

        if (error) {
            return errorResponse(`Failed to confirm: ${error.message}`, 500);
        }

        return jsonResponse({
            success: true,
            message: 'Booking has been confirmed.',
            booking_id: bookingId,
        });
    } catch (e: any) {
        return errorResponse(`Server error: ${e.message}`, 500);
    }
});
