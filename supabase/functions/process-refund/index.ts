// Edge Function: process-refund
// Processes refund based on salon's refund policy
// Called when a booking is cancelled after deposit was paid

import { getSupabase, validateAuth, jsonResponse, errorResponse, handleCORS } from '../_shared/utils.ts';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return handleCORS();

    try {
        const auth = validateAuth(req);
        if (!auth.valid) return errorResponse(auth.error!, 401);

        let body: any = {};
        try { body = await req.json(); } catch { }
        const tenantId = body.tenant_id;
        const bookingId = body.booking_id;
        const reason = body.reason || 'requested_by_customer'; // cancelled | no_show | manual

        if (!tenantId || !bookingId) return errorResponse('tenant_id and booking_id required');

        const supabase = getSupabase();
        const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY') || '';
        if (!STRIPE_KEY) return errorResponse('Stripe not configured', 500);

        // Get booking + tenant refund policy in parallel
        const [bookingRes, tenantRes] = await Promise.all([
            supabase.from('bookings')
                .select('id, status, start_time, deposit_paid_amount, total_price, tenant_id')
                .eq('id', bookingId).single(),
            supabase.from('tenants')
                .select('cancellation_window_hours, late_cancel_refund_percent, no_show_refund_percent, auto_refund_enabled, salon_name')
                .eq('id', tenantId).single(),
        ]);

        const booking = bookingRes.data;
        const tenant = tenantRes.data;
        if (!booking) return errorResponse('Booking not found', 404);
        if (!tenant) return errorResponse('Salon not found', 404);

        const depositPaid = booking.deposit_paid_amount || 0;
        if (depositPaid <= 0) {
            return jsonResponse({ success: true, message: 'No deposit to refund', refund_amount: 0 });
        }

        // Calculate refund based on policy
        const now = new Date();
        const startTime = new Date(booking.start_time);
        const hoursUntilAppointment = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        const cancellationWindow = tenant.cancellation_window_hours || 24;

        let refundPercent = 100;
        let refundReason = '';

        if (reason === 'no_show') {
            refundPercent = tenant.no_show_refund_percent || 0;
            refundReason = 'No-show policy';
        } else if (hoursUntilAppointment < 0) {
            // Past appointment
            refundPercent = 0;
            refundReason = 'Appointment already passed';
        } else if (hoursUntilAppointment < cancellationWindow) {
            // Late cancellation
            refundPercent = tenant.late_cancel_refund_percent || 50;
            refundReason = `Late cancellation (within ${cancellationWindow}hr window)`;
        } else {
            // Within window — full refund
            refundPercent = 100;
            refundReason = 'Cancelled within policy window';
        }

        const refundAmount = Math.round(depositPaid * (refundPercent / 100) * 100) / 100;

        if (refundAmount <= 0) {
            return jsonResponse({
                success: true, refund_amount: 0, refund_percent: refundPercent,
                message: `No refund per ${tenant.salon_name}'s policy: ${refundReason}`,
            });
        }

        // Check if auto-refund is enabled
        if (!tenant.auto_refund_enabled) {
            return jsonResponse({
                success: true, auto_refund: false, refund_amount: refundAmount,
                refund_percent: refundPercent,
                message: `Refund of $${refundAmount} pending manual approval. Policy: ${refundReason}`,
            });
        }

        // Get Stripe payment intent to refund
        const { data: payment } = await supabase.from('payments')
            .select('stripe_session_id')
            .eq('booking_id', bookingId).eq('status', 'completed')
            .order('created_at', { ascending: false }).limit(1).single();

        if (!payment?.stripe_session_id) {
            return jsonResponse({
                success: false,
                message: 'No completed payment found for this booking. Manual refund may be needed.',
            });
        }

        // Get payment intent from session
        const sessionRes = await fetch('https://api.stripe.com/v1/checkout/sessions/' + payment.stripe_session_id, {
            headers: { 'Authorization': 'Bearer ' + STRIPE_KEY },
        });
        if (!sessionRes.ok) return errorResponse('Failed to fetch Stripe session', 500);
        const session = await sessionRes.json();
        const paymentIntentId = session.payment_intent;

        if (!paymentIntentId) return errorResponse('No payment intent found for this session', 500);

        // Process Stripe refund
        const refundRes = await fetch('https://api.stripe.com/v1/refunds', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + STRIPE_KEY,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'payment_intent': paymentIntentId,
                'amount': String(Math.round(refundAmount * 100)),
                'reason': reason === 'no_show' ? 'fraudulent' : 'requested_by_customer',
                'metadata[booking_id]': bookingId,
                'metadata[tenant_id]': tenantId,
                'metadata[refund_percent]': String(refundPercent),
            }),
        });

        if (!refundRes.ok) {
            const err = await refundRes.json();
            return errorResponse('Stripe refund failed: ' + (err.error?.message || 'Unknown'), 500);
        }

        const refund = await refundRes.json();

        // Update payment record
        await supabase.from('payments').update({
            status: 'refunded', refund_amount: refundAmount,
            refunded_at: new Date().toISOString(),
        }).eq('booking_id', bookingId).eq('status', 'completed');

        return jsonResponse({
            success: true,
            refund_id: refund.id,
            refund_amount: refundAmount,
            refund_percent: refundPercent,
            reason: refundReason,
            message: `Refund of $${refundAmount} (${refundPercent}%) processed successfully.`,
        });
    } catch (e: any) {
        return errorResponse('Server error: ' + e.message, 500);
    }
});
