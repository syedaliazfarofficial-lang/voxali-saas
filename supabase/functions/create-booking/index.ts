// Edge Function: create-booking (OPTIMIZED)
// Parallel DB calls + shared getTzOffset — saves ~400ms

import { getSupabase, validateRequest, jsonResponse, errorResponse, handleCORS, getTzOffset, normalizePhone } from '../_shared/utils.ts';

const isUUID = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return handleCORS();

    try {
        const auth = validateRequest(req);
        if (!auth.valid) return errorResponse(auth.error!, 401);

        let body: any = {};
        try { body = await req.json(); } catch { }
        const tenantId = auth.tenantId || body.tenant_id;
        if (!tenantId) return errorResponse('Missing tenant_id');

        const client = {
            name: body.client_name || body.name || (body.client?.name) || '',
            phone: body.client_phone || body.phone || (body.client?.phone) || '',
            email: body.client_email || body.email || (body.client?.email) || '',
        };
        if (!client.name && !client.phone) return errorResponse('Client name or phone is required');

        let serviceId = body.service_id || body.service_ids || '';
        const serviceName = body.service_name || body.service_ids || '';
        let stylistId = body.stylist_id || body.staff_id || '';
        const stylistName = body.stylist_name || body.staff_name || '';
        const notes = body.notes || '';
        const startAt = body.start_at || '';
        const date = body.date || '';
        const time = body.time || '';

        const supabase = getSupabase();

        // === PARALLEL Phase 1: Tenant + Service + Stylist lookup simultaneously ===
        const parallelQueries: Promise<any>[] = [
            // Always get tenant
            supabase.from('tenants').select('timezone, salon_name, stripe_account_id, stripe_onboarding_complete, platform_fee_percent').eq('id', tenantId).single(),
        ];

        // Service lookup
        if (serviceId && isUUID(serviceId)) {
            parallelQueries.push(
                supabase.from('services')
                    .select('id, name, price, duration, deposit_required, deposit_amount')
                    .eq('id', serviceId).single()
            );
        } else if (serviceName) {
            const cleanName = serviceName.toLowerCase().replace(/_/g, ' ');
            parallelQueries.push(
                supabase.from('services')
                    .select('id, name, price, duration, deposit_required, deposit_amount')
                    .eq('tenant_id', tenantId).eq('is_active', true)
                    .ilike('name', `%${cleanName}%`).limit(1)
            );
        } else {
            parallelQueries.push(Promise.resolve({ data: null }));
        }

        // Stylist lookup
        if (stylistId && isUUID(stylistId)) {
            parallelQueries.push(
                supabase.from('staff').select('id, full_name').eq('id', stylistId).limit(1)
            );
        } else if (stylistName) {
            parallelQueries.push(
                supabase.from('staff')
                    .select('id, full_name').eq('tenant_id', tenantId)
                    .eq('is_active', true).ilike('full_name', `%${stylistName}%`).limit(1)
            );
        } else {
            parallelQueries.push(
                supabase.from('staff')
                    .select('id').eq('tenant_id', tenantId).eq('is_active', true).limit(1)
            );
        }

        // Execute lookups in parallel (~200ms instead of ~800ms)
        const [tenantRes, serviceRes, staffRes] = await Promise.all(parallelQueries);

        const tenant = tenantRes.data;
        if (!tenant) return errorResponse('Salon not found', 404);
        const tz = tenant.timezone || 'America/Chicago';

        // Normalize phone AFTER we know the salon's timezone/country
        client.phone = normalizePhone(client.phone, tz);

        // Client lookup (after phone normalization)
        const clientRes = client.phone
            ? await supabase.from('clients').select('id').eq('tenant_id', tenantId).eq('phone', client.phone).limit(1).single()
            : { data: null };

        // Resolve service
        let service = serviceRes.data;
        if (Array.isArray(service)) service = service[0] || null;
        if (!service) return errorResponse('Service not found. Please provide a valid service_id or service_name.');
        serviceId = service.id;

        // Resolve stylist
        const staffData = staffRes.data;
        stylistId = Array.isArray(staffData) ? staffData[0]?.id : staffData?.id;
        if (!stylistId) return errorResponse('No available staff found.');

        // === Calculate Start/End Times ===
        const rawStart = startAt || (date && time ? (date + 'T' + (time.length === 5 ? time + ':00' : time)) : '');
        if (!rawStart) return errorResponse('start_at or date+time is required');
        const datePart = rawStart.substring(0, 10);
        let startTime: string;
        if (rawStart.includes('+') || rawStart.includes('Z') || /[+-]\d{2}:\d{2}$/.test(rawStart)) {
            startTime = rawStart;
        } else {
            startTime = rawStart + getTzOffset(tz, datePart);
        }

        let startDate = new Date(startTime);
        const currentYear = new Date().getFullYear();
        const bookingYear = startDate.getFullYear();
        // Clamp wrong years: past years OR future years more than 1 year ahead (VAPI hallucination guard)
        if (bookingYear < currentYear || bookingYear > currentYear + 1) {
            startDate.setFullYear(currentYear);
            startTime = startDate.toISOString();
        }

        const endDate = new Date(startDate.getTime() + (service.duration || 30) * 60000);
        const endTime = endDate.toISOString();

        // === Resolve Client ===
        let clientId: string;
        if (clientRes.data?.id) {
            clientId = clientRes.data.id;
        } else {
            const { data: newClient, error: clientErr } = await supabase
                .from('clients')
                .insert({ tenant_id: tenantId, name: client.name, phone: client.phone, email: client.email })
                .select('id').single();
            if (clientErr || !newClient) return errorResponse(`Failed to create client: ${clientErr?.message || 'Unknown error'}`);
            clientId = newClient.id;
        }

        // === Create Booking ===
        const { data: booking, error: bookingErr } = await supabase
            .from('bookings')
            .insert({
                tenant_id: tenantId, client_id: clientId, service_id: serviceId,
                stylist_id: stylistId, start_time: startTime, end_time: endTime,
                total_price: service.price || 0, deposit_amount: service.deposit_amount || 0,
                status: service.deposit_required ? 'pending_deposit' : 'confirmed', notes,
            })
            .select('id, status').single();

        if (bookingErr) return errorResponse(`Failed to create booking: ${bookingErr.message}`, 500);

        // === Payment Link (if deposit required) ===
        let paymentLink = '';
        if (service.deposit_required && service.deposit_amount > 0) {
            let STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY') || '';
            // Fallback: read from platform_config if env var empty
            if (!STRIPE_KEY) {
                const { data: cfg } = await supabase.from('platform_config').select('value').eq('key', 'stripe_secret_key').single();
                if (cfg?.value) STRIPE_KEY = cfg.value;
            }
            if (STRIPE_KEY) {
                try {
                    const depositCents = Math.round(service.deposit_amount * 100);
                    const feePercent = tenant.platform_fee_percent || 3;
                    const appFeeCents = Math.round(depositCents * (feePercent / 100));

                    // Build Checkout Session params
                    const params: Record<string, string> = {
                        'mode': 'payment',
                        'line_items[0][price_data][currency]': 'usd',
                        'line_items[0][price_data][product_data][name]': `Deposit: ${service.name} at ${tenant.salon_name || 'Salon'}`,
                        'line_items[0][price_data][unit_amount]': String(depositCents),
                        'line_items[0][quantity]': '1',
                        'metadata[booking_id]': booking.id,
                        'metadata[tenant_id]': tenantId!,
                        'success_url': `https://voxali-payment.pages.dev/?booking_id=${booking.id}`,
                        'cancel_url': `https://voxali-payment.pages.dev/?booking_id=${booking.id}&cancelled=true`,
                    };

                    // If salon has connected AND onboarded Stripe account, use Connect transfer
                    if (tenant.stripe_account_id && tenant.stripe_onboarding_complete) {
                        params['payment_intent_data[application_fee_amount]'] = String(appFeeCents);
                        params['payment_intent_data[transfer_data][destination]'] = tenant.stripe_account_id;
                    }

                    let stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${STRIPE_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams(params),
                    });

                    // If Connect transfer failed, retry WITHOUT transfer_data (platform-only)
                    if (!stripeRes.ok && tenant.stripe_account_id) {
                        const errBody = await stripeRes.json();
                        console.error('Stripe Connect error:', errBody.error?.message, '— retrying without transfer');
                        delete params['payment_intent_data[application_fee_amount]'];
                        delete params['payment_intent_data[transfer_data][destination]'];
                        stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${STRIPE_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: new URLSearchParams(params),
                        });
                    }

                    if (stripeRes.ok) {
                        const stripeData = await stripeRes.json();
                        paymentLink = stripeData.url;
                        // Save payment record (MUST await — fire-and-forget gets killed by Deno)
                        const { error: payErr } = await supabase.from('payments').insert({
                            tenant_id: tenantId, booking_id: booking.id,
                            amount: service.deposit_amount, payment_link: paymentLink,
                            stripe_payment_link_id: stripeData.id, status: 'pending',
                        });
                        if (payErr) console.error('Payment insert error:', payErr.message, payErr.code);
                    } else {
                        const errBody = await stripeRes.json().catch(() => ({}));
                        console.error('Stripe Checkout failed:', stripeRes.status, errBody.error?.message);
                    }
                } catch (stripeErr: any) {
                    console.error('Stripe error:', stripeErr.message);
                }
            }
        }

        // === Always Queue Notification (regardless of deposit) ===
        // Fetch client email if not provided (existing clients)
        let clientEmail = client.email;
        if (!clientEmail && clientRes.data?.id) {
            const { data: existingClient } = await supabase
                .from('clients')
                .select('email')
                .eq('id', clientRes.data.id)
                .single();
            clientEmail = existingClient?.email || '';
        }

        await supabase.from('notification_queue').insert({
            tenant_id: tenantId,
            event_type: 'booking_created',
            booking_id: booking.id,
            client_phone: client.phone,
            client_email: clientEmail,
            client_name: client.name,
            booking_details: {
                source: 'edge_function',
                time: startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz }),
                stylist: (Array.isArray(staffData) ? staffData[0]?.full_name : staffData?.full_name) || 'Any Available',
                service: service.name,
                date: startDate.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: tz }),
                price: service.price,
                status: booking.status,
                payment_link: paymentLink,
                deposit_amount: service.deposit_amount,
            },
        });
        console.log('Notification queued for:', clientEmail || client.phone);

        // === Response ===
        const formattedDate = startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: tz });
        const formattedTime = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz });

        // Trigger notification worker synchronously to prevent Deno from dropping the process
        try {
            const edgeUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`;
            console.log("Triggering email worker...");
            await fetch(edgeUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log("Worker triggered successfully.");
        } catch (e) {
            console.error('Trigger error', e);
        }

        return jsonResponse({
            success: true,
            message: `Booking confirmed for ${client.name} on ${formattedDate} at ${formattedTime}.` +
                (paymentLink ? ` A deposit of $${service.deposit_amount} is required. A secure payment link has been sent to the client via SMS and email.` : ''),
            booking_id: booking.id, client_name: client.name, service: service.name,
            date: formattedDate, time: formattedTime,
            total_price: service.price, deposit_amount: service.deposit_amount || 0,
            deposit_required: service.deposit_required || false,
            payment_sent: paymentLink ? true : false,
            status: booking.status,
        });
    } catch (e: any) {
        return errorResponse(`Server error: ${e.message}`, 500);
    }
});
