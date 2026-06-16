// Edge Function: get-booking-public
// Fetches booking details for the payment success page
// If session_id is provided, verifies Stripe payment and updates booking status

import { getSupabase, jsonResponse, errorResponse, handleCORS } from '../_shared/utils.ts';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return handleCORS();

    try {
        const url = new URL(req.url);
        const bookingId = url.searchParams.get('booking_id') || '';
        const sessionId = url.searchParams.get('session_id') || '';

        if (!bookingId) return errorResponse('booking_id is required', 400);

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(bookingId)) return errorResponse('Invalid booking_id', 400);

        const supabase = getSupabase(); // uses SERVICE_ROLE_KEY — bypasses RLS

        // === If session_id provided: verify Stripe payment and update booking ===
        if (sessionId && sessionId.startsWith('cs_')) {
            try {
                // Get Stripe key
                let STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY') || '';
                if (!STRIPE_KEY) {
                    const { data: cfg } = await supabase.from('platform_config').select('value').eq('key', 'stripe_secret_key').single();
                    if (cfg?.value) STRIPE_KEY = cfg.value;
                }

                if (STRIPE_KEY) {
                    // Verify Stripe session
                    const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
                        headers: { 'Authorization': `Bearer ${STRIPE_KEY}` }
                    });

                    if (stripeRes.ok) {
                        const session = await stripeRes.json();
                        const amountPaid = (session.amount_total || 0) / 100;

                        // Only update if payment actually succeeded
                        if (session.payment_status === 'paid') {
                            await Promise.all([
                                supabase.from('bookings').update({
                                    status: 'confirmed',
                                    deposit_paid_amount: amountPaid,
                                    deposit_paid_at: new Date().toISOString(),
                                }).eq('id', bookingId),

                                supabase.from('payments').update({
                                    status: 'completed',
                                    stripe_session_id: sessionId,
                                    paid_at: new Date().toISOString(),
                                }).eq('booking_id', bookingId).eq('status', 'pending'),
                            ]);
                            console.log(`[get-booking-public] Booking ${bookingId} confirmed via session ${sessionId}`);
                        }
                    }
                }
            } catch (stripeErr) {
                // Non-fatal — still return booking data
                console.error('[get-booking-public] Stripe verify error:', stripeErr);
            }
        }

        // === Fetch booking (simple query, avoid join failures) ===
        const { data: booking, error } = await supabase
            .from('bookings')
            .select('id, status, start_time, total_price, deposit_paid_amount, deposit_amount, client_id, service_id, stylist_id, tenant_id')
            .eq('id', bookingId)
            .single();

        if (error || !booking) {
            console.error('[get-booking-public] Booking not found:', bookingId, error?.message);
            return errorResponse('Booking not found', 404);
        }

        // Fetch related data separately to avoid join failures
        const [clientRes, serviceRes, staffRes, tenantRes] = await Promise.all([
            booking.client_id ? supabase.from('clients').select('name, email').eq('id', booking.client_id).single() : Promise.resolve({ data: null }),
            booking.service_id ? supabase.from('services').select('name').eq('id', booking.service_id).single() : Promise.resolve({ data: null }),
            booking.stylist_id ? supabase.from('staff').select('full_name').eq('id', booking.stylist_id).single() : Promise.resolve({ data: null }),
            booking.tenant_id ? supabase.from('tenants').select('salon_name, salon_tagline, timezone').eq('id', booking.tenant_id).single() : Promise.resolve({ data: null }),
        ]);

        return jsonResponse({
            ...booking,
            clients: clientRes.data || {},
            services: serviceRes.data || {},
            staff: staffRes.data || {},
            tenants: tenantRes.data || {},
        });

    } catch (e: any) {
        return errorResponse(`Server error: ${e.message}`, 500);
    }
});
