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
            const primaryBookingId = obj.metadata?.booking_id;
            const bookingIdsRaw = obj.metadata?.booking_ids || primaryBookingId;
            const tenantId = obj.metadata?.tenant_id;
            const amountPaid = (obj.amount_total || 0) / 100;

            if (!bookingIdsRaw) return jsonResponse({ received: true, message: 'No booking_id(s) in metadata' });

            const bookingIds = bookingIdsRaw.split(',').filter(Boolean);
            const amountPerBooking = amountPaid / bookingIds.length;

            // Parallel: update payment + bookings
            await Promise.all([
                supabase.from('payments').update({
                    status: 'completed', stripe_session_id: obj.id,
                    paid_at: new Date().toISOString(),
                }).in('booking_id', bookingIds).eq('status', 'pending'),

                supabase.from('bookings').update({
                    status: 'confirmed', deposit_paid_amount: amountPerBooking,
                    deposit_paid_at: new Date().toISOString(),
                }).in('id', bookingIds),
            ]);

            // Queue deposit_received notification
            const { data: bookingsList } = await supabase.from('bookings')
                .select('id, client_id, start_time, total_price, deposit_amount, tenant_id, clients(name, phone, email), services(name), staff(full_name)')
                .in('id', bookingIds)
                .order('start_time', { ascending: true });

            if (bookingsList && bookingsList.length > 0) {
                const first = bookingsList[0];
                const client = (first as any).clients;
                let tz = 'America/Chicago';
                try {
                    const { data: tenantData } = await supabase.from('tenants').select('timezone').eq('id', tenantId || first.tenant_id).single();
                    if (tenantData && tenantData.timezone) tz = tenantData.timezone;
                } catch { /* fallback to default */ }
                
                let totalSvcPrice = 0;
                let totalSvcDeposit = 0;
                const groupedBookings: any[] = [];
                const serviceNames: string[] = [];

                for (const b of bookingsList) {
                    const st = new Date(b.start_time);
                    totalSvcPrice += (b.total_price || 0);
                    totalSvcDeposit += (b.deposit_amount || 0);
                    serviceNames.push((b as any).services?.name || '');
                    groupedBookings.push({
                        service: (b as any).services?.name || '',
                        time: st.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz }),
                        stylist: (b as any).staff?.full_name || '',
                        price: (b.total_price || 0).toFixed(2),
                        deposit: (b.deposit_amount || 0).toFixed(2)
                    });
                }

                const startTime = new Date(first.start_time);
                await supabase.from('notification_queue').insert({
                    tenant_id: tenantId || first.tenant_id, booking_id: first.id,
                    client_name: client?.name || '', client_phone: client?.phone || '',
                    client_email: client?.email || '', event_type: 'deposit_received',
                    booking_details: {
                        date: startTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: tz }),
                        time: startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz }),
                        service: serviceNames.join(' + '),
                        stylist: 'Multiple',
                        price: totalSvcPrice,
                        deposit_amount: amountPaid,
                        remaining_balance: totalSvcPrice - amountPaid,
                        bookings_list: groupedBookings
                    },
                    status: 'pending',
                });
            }

            return jsonResponse({ received: true, booking_id: primaryBookingId, status: 'confirmed' });
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
