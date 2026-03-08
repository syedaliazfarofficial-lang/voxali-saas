// Edge Function: mark-manual-payment
// Marks a booking as paid manually (cash, card at counter, etc.)

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
        const amount = body.amount || 0;
        const paymentMethod = body.payment_method || 'cash';

        if (!bookingId) {
            return errorResponse('booking_id is required');
        }

        const supabase = getSupabase();

        // Get booking
        const { data: booking } = await supabase
            .from('bookings')
            .select('id, total_price, deposit_amount, deposit_paid_amount, status')
            .eq('id', bookingId)
            .eq('tenant_id', tenantId)
            .single();

        if (!booking) {
            return errorResponse('Booking not found', 404);
        }

        const paidAmount = amount || booking.deposit_amount || booking.total_price || 0;

        // Record payment
        await supabase.from('payments').insert({
            tenant_id: tenantId,
            booking_id: bookingId,
            amount: paidAmount,
            payment_method: paymentMethod,
            status: 'completed',
            paid_at: new Date().toISOString(),
        });

        // Update booking
        const newDepositPaid = (booking.deposit_paid_amount || 0) + paidAmount;
        await supabase
            .from('bookings')
            .update({
                deposit_paid_amount: newDepositPaid,
                deposit_paid_at: new Date().toISOString(),
                status: booking.status === 'pending_deposit' ? 'confirmed' : booking.status,
            })
            .eq('id', bookingId);

        return jsonResponse({
            success: true,
            message: `Manual payment of $${paidAmount} recorded via ${paymentMethod}.`,
            booking_id: bookingId,
            amount_paid: paidAmount,
            payment_method: paymentMethod,
        });
    } catch (e: any) {
        return errorResponse(`Server error: ${e.message}`, 500);
    }
});
