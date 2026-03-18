// Edge Function: stripe-payment-webhook (FIXED + Connect + Refund support)
// Handles: checkout.session.completed, charge.refunded, account.updated

import { getSupabase, jsonResponse, errorResponse, corsHeaders } from '../_shared/utils.ts';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        // Parse body FIRST (was missing — caused crash)
        const rawBody = await req.text();
        let body: any;
        try { body = JSON.parse(rawBody); } catch {
            return errorResponse('Invalid JSON payload', 400);
        }

        const eventType = body.type;
        const obj = body.data?.object;
        if (!obj) return errorResponse('Invalid webhook payload');

        const supabase = getSupabase();

        // ===== CHECKOUT COMPLETED — Coin Topup =====
        if (eventType === 'checkout.session.completed' && obj.mode === 'payment' && obj.metadata?.payment_type === 'coin_topup') {
            const tenantId = obj.metadata.tenant_id;
            const amountCoins = parseInt(obj.metadata.amount_coins || '0', 10);

            if (!tenantId || !amountCoins) {
                return errorResponse('Missing tenant_id or amount_coins in metadata', 400);
            }

            console.log(`Processing coin topup: ${amountCoins} coins for tenant ${tenantId}`);

            // Fetch current balance
            const { data: tenant, error: fetchErr } = await supabase
                .from('tenants')
                .select('coin_balance')
                .eq('id', tenantId)
                .single();

            if (fetchErr || !tenant) {
                return errorResponse('Tenant not found', 404);
            }

            const newBalance = (tenant.coin_balance || 0) + amountCoins;

            // Update balance
            const { error: updateErr } = await supabase
                .from('tenants')
                .update({ coin_balance: newBalance })
                .eq('id', tenantId);

            if (updateErr) {
                console.error("Failed to update coin balance:", updateErr);
                return errorResponse('Failed to update balance', 500);
            }

            // Log transaction
            await supabase.from('coin_transactions').insert({
                tenant_id: tenantId,
                amount: amountCoins,
                transaction_type: 'topup',
                description: `Purchased ${amountCoins} coins via Stripe`
            });

            console.log(`Successfully credited ${amountCoins} coins. New balance: ${newBalance}`);
            return jsonResponse({ received: true, message: `Credited ${amountCoins} coins to tenant ${tenantId}` });
        }

        // ===== CHECKOUT COMPLETED — Deposit Paid =====
        if (eventType === 'checkout.session.completed') {
            const bookingId = obj.metadata?.booking_id;
            const tenantId = obj.metadata?.tenant_id;
            const amountPaid = (obj.amount_total || 0) / 100;

            if (!bookingId) return jsonResponse({ received: true, message: 'No booking_id in metadata' });

            // Parallel: update payment + booking
            await Promise.all([
                supabase.from('payments').update({
                    status: 'completed', stripe_session_id: obj.id,
                    paid_at: new Date().toISOString(),
                }).eq('booking_id', bookingId).eq('status', 'pending'),

                supabase.from('bookings').update({
                    status: 'confirmed', deposit_paid_amount: amountPaid,
                    deposit_paid_at: new Date().toISOString(),
                }).eq('id', bookingId),
            ]);

            // Queue deposit_received notification
            const { data: booking } = await supabase.from('bookings')
                .select('client_id, start_time, total_price, tenant_id, clients(name, phone, email), services(name), staff(full_name)')
                .eq('id', bookingId).single();

            if (booking) {
                const client = (booking as any).clients;
                const tz = 'America/Chicago'; // default
                const startTime = new Date(booking.start_time);
                await supabase.from('notification_queue').insert({
                    tenant_id: tenantId || booking.tenant_id, booking_id: bookingId,
                    client_name: client?.name || '', client_phone: client?.phone || '',
                    client_email: client?.email || '', event_type: 'deposit_received',
                    booking_details: {
                        date: startTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: tz }),
                        time: startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz }),
                        service: (booking as any).services?.name || '',
                        stylist: (booking as any).staff?.full_name || '',
                        price: booking.total_price,
                        deposit_amount: amountPaid,
                        remaining_balance: (booking.total_price || 0) - amountPaid,
                    },
                    status: 'pending',
                });
            }

            return jsonResponse({ received: true, booking_id: bookingId, status: 'confirmed' });
        }

        // ===== CHARGE REFUNDED =====
        if (eventType === 'charge.refunded') {
            const paymentIntentId = obj.payment_intent;
            const refundAmount = (obj.amount_refunded || 0) / 100;

            // Find payment by stripe intent
            const { data: payment } = await supabase.from('payments')
                .select('id, booking_id, tenant_id')
                .eq('stripe_session_id', paymentIntentId)
                .single();

            if (payment) {
                await Promise.all([
                    supabase.from('payments').update({
                        status: 'refunded', refund_amount: refundAmount,
                        refunded_at: new Date().toISOString(),
                    }).eq('id', payment.id),

                    supabase.from('bookings').update({
                        status: 'refunded',
                    }).eq('id', payment.booking_id),
                ]);
            }

            return jsonResponse({ received: true, refund_amount: refundAmount });
        }

        // ===== ACCOUNT UPDATED (Connect status) =====
        if (eventType === 'account.updated') {
            const accountId = obj.id; // acct_xxx
            const chargesEnabled = obj.charges_enabled;
            const payoutsEnabled = obj.payouts_enabled;

            if (accountId) {
                await supabase.from('tenants').update({
                    stripe_onboarding_complete: chargesEnabled && payoutsEnabled,
                }).eq('stripe_account_id', accountId);
            }

            return jsonResponse({ received: true, account: accountId, charges_enabled: chargesEnabled });
        }

        // ===== PAYMENT INTENT SUCCEEDED =====
        if (eventType === 'payment_intent.succeeded') {
            return jsonResponse({ received: true, message: 'payment_intent.succeeded noted' });
        }

        return jsonResponse({ received: true, message: 'Unhandled event: ' + eventType });
    } catch (e: any) {
        return errorResponse('Webhook error: ' + e.message, 500);
    }
});
