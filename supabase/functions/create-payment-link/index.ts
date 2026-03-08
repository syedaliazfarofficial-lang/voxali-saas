// Edge Function: create-payment-link
// Creates a Stripe payment link for an existing booking

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
        const bookingId = body.booking_id || '';
        const amount = body.amount || 0;

        if (!bookingId) {
            return errorResponse('booking_id is required');
        }

        const supabase = getSupabase();
        const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY') || '';

        if (!STRIPE_KEY) {
            return errorResponse('Stripe not configured', 500);
        }

        // Get booking + service info
        const { data: booking } = await supabase
            .from('bookings')
            .select('id, tenant_id, service_id, deposit_amount, total_price, services(name)')
            .eq('id', bookingId)
            .single();

        if (!booking) {
            return errorResponse('Booking not found', 404);
        }

        const depositAmount = amount || booking.deposit_amount || 15;
        const serviceName = (booking as any).services?.name || 'Salon Service';

        // Get salon name
        const { data: tenant } = await supabase
            .from('tenants')
            .select('salon_name')
            .eq('id', tenantId)
            .single();

        // Create Stripe payment link
        const stripeRes = await fetch('https://api.stripe.com/v1/payment_links', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${STRIPE_KEY}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'line_items[0][price_data][currency]': 'usd',
                'line_items[0][price_data][product_data][name]': `Deposit: ${serviceName} at ${tenant?.salon_name || 'Salon'}`,
                'line_items[0][price_data][unit_amount]': String(Math.round(depositAmount * 100)),
                'line_items[0][quantity]': '1',
                'metadata[booking_id]': bookingId,
                'metadata[tenant_id]': tenantId!,
                'after_completion[type]': 'redirect',
                'after_completion[redirect][url]': `https://voluble-sprinkles-8ee4f2.netlify.app/?booking_id=${bookingId}`,
            }),
        });

        if (!stripeRes.ok) {
            const err = await stripeRes.json();
            return errorResponse(`Stripe error: ${err.error?.message || 'Unknown'}`, 500);
        }

        const stripeData = await stripeRes.json();

        // Save payment record
        await supabase.from('payments').insert({
            tenant_id: tenantId,
            booking_id: bookingId,
            amount: depositAmount,
            payment_link: stripeData.url,
            stripe_payment_link_id: stripeData.id,
            status: 'pending',
        });

        return jsonResponse({
            success: true,
            payment_link: stripeData.url,
            amount: depositAmount,
            message: `Payment link created for $${depositAmount} deposit.`,
        });
    } catch (e: any) {
        return errorResponse(`Server error: ${e.message}`, 500);
    }
});
