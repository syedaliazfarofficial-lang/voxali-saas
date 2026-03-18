import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

/**
 * online-booking — Public Customer Booking Page
 * 
 * Serves a beautiful HTML booking form. No login required.
 * URL: /functions/v1/online-booking?tenant_id=xxx
 * 
 * Flow:
 * 1. GET → Shows salon info, services, and booking form
 * 2. POST → Creates booking via create-booking logic, shows confirmation
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
    const url = new URL(req.url);
    let tenantId = url.searchParams.get('tenant_id');
    const slug = url.searchParams.get('slug');

    if (!tenantId && !slug) {
        return new Response('Missing tenant_id or slug parameter', { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Fetch salon info by slug or tenantId
    let tenantRow;
    let tenantErr;

    if (slug) {
        const result = await supabase
            .from('tenants')
            .select('id, salon_name, salon_tagline, salon_email, salon_phone_owner, timezone, logo_url')
            .eq('slug', slug)
            .single();
        tenantRow = result.data;
        tenantErr = result.error;
        if (tenantRow) tenantId = tenantRow.id;
    } else {
        const result = await supabase
            .from('tenants')
            .select('id, salon_name, salon_tagline, salon_email, salon_phone_owner, timezone, logo_url')
            .eq('id', tenantId)
            .single();
        tenantRow = result.data;
        tenantErr = result.error;
    }

    if (!tenantRow || tenantErr) {
        return new Response('Salon not found', { status: 404 });
    }
    
    const tenant = tenantRow;

    // Fetch services
    const { data: services } = await supabase
        .from('services')
        .select('id, name, price, duration, category, deposit_amount, description')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('category')
        .order('name');

    // Fetch staff
    const { data: rawStaff } = await supabase
        .from('staff')
        .select('id, full_name, role, color, is_active, can_take_bookings')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);
    // Filter can_take_bookings in JS (column may be null = treat as true)
    const staff = (rawStaff || []).filter((s: any) => s.can_take_bookings !== false)
        .map((s: any) => ({ ...s, name: s.full_name, specialty: s.role || 'Stylist' }));

    // Handle POST (booking submission)
    if (req.method === 'POST') {
        try {
            const body = await req.json();
            const { service_id, service_ids, staff_id, date, time, client_name, client_email, client_phone } = body;
            // Support both single and multi-service
            const allServiceIds: string[] = service_ids && service_ids.length > 0 ? service_ids : (service_id ? [service_id] : []);

            if (allServiceIds.length === 0 || !date || !time || !client_name || !client_email) {
                return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                    status: 400,
                    headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                });
            }

            // Find or create client
            let clientId: string;
            const { data: existingClient } = await supabase
                .from('clients')
                .select('id')
                .eq('tenant_id', tenantId)
                .eq('email', client_email)
                .single();

            if (existingClient) {
                clientId = existingClient.id;
            } else {
                const { data: newClient, error: clientErr } = await supabase
                    .from('clients')
                    .insert({
                        tenant_id: tenantId,
                        name: client_name,
                        email: client_email,
                        phone: client_phone || null,
                    })
                    .select('id')
                    .single();
                if (clientErr || !newClient) {
                    return new Response(JSON.stringify({ error: 'Failed to create client' }), {
                        status: 500,
                        headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                    });
                }
                clientId = newClient.id;
            }

            // Get all selected services
            const selectedServices = allServiceIds.map((sid: string) =>
                (services || []).find((s: any) => s.id === sid)
            ).filter(Boolean);
            if (selectedServices.length === 0) {
                return new Response(JSON.stringify({ error: 'No valid services found' }), {
                    status: 400,
                    headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                });
            }

            // Combined duration, price, deposit
            const totalDuration = selectedServices.reduce((sum: number, s: any) => sum + (s.duration || 30), 0);
            const totalPrice = selectedServices.reduce((sum: number, s: any) => sum + (s.price || 0), 0);
            const totalDeposit = selectedServices.reduce((sum: number, s: any) => sum + (s.deposit_amount || 0), 0);
            const primaryService = selectedServices[0];

            // Build start_time (convert salon-local time to UTC)
            const tz = tenant.timezone || 'America/Chicago';

            // The user selected time in salon's timezone, convert to UTC
            const naiveUTC = new Date(`${date}T${time}:00.000Z`);
            const parts = new Intl.DateTimeFormat('en-US', {
                timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: false,
                year: 'numeric', month: '2-digit', day: '2-digit'
            }).formatToParts(naiveUTC);
            const getPart = (t: string) => parts.find(p => p.type === t)?.value || '0';
            const salonH = parseInt(getPart('hour'));
            const salonM = parseInt(getPart('minute'));
            const utcH = naiveUTC.getUTCHours();
            const utcM = naiveUTC.getUTCMinutes();
            let offsetMin = (salonH * 60 + salonM) - (utcH * 60 + utcM);
            if (offsetMin > 720) offsetMin -= 1440;
            if (offsetMin < -720) offsetMin += 1440;
            const startTimeUTC = new Date(naiveUTC.getTime() - offsetMin * 60 * 1000);
            const startTime = startTimeUTC.toISOString();
            const endTimeUTC = new Date(startTimeUTC.getTime() + totalDuration * 60000);

            // Assign staff (use selected or first available)
            const assignedStaffId = staff_id || (staff && staff.length > 0 ? staff[0].id : null);

            // Build booking items for all services
            const bookingItems = selectedServices.map((s: any) => ({
                service_id: s.id,
                name_snapshot: s.name,
                price_snapshot: s.price || 0,
                duration_min_snapshot: s.duration || 30,
            }));

            // Create booking using create_booking_safe (prevents double bookings)
            const { data: bookingResult, error: rpcErr } = await supabase.rpc('create_booking_safe', {
                p_tenant_id: tenantId,
                p_staff_id: assignedStaffId,
                p_client_id: clientId,
                p_service_id: allServiceIds[0],
                p_start_at: startTime,
                p_end_at: endTimeUTC.toISOString(),
                p_status: 'pending',
                p_notes: `Online booking by ${client_name} (${selectedServices.map((s: any) => s.name).join(', ')})`,
                p_payment_method: 'card',
                p_total_price: totalPrice,
                p_deposit_amount: totalDeposit,
                p_booking_items: bookingItems,
            });

            if (rpcErr) {
                return new Response(JSON.stringify({ error: 'Failed to create booking: ' + rpcErr.message }), {
                    status: 500,
                    headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                });
            }

            const result = typeof bookingResult === 'string' ? JSON.parse(bookingResult) : bookingResult;

            if (!result.ok) {
                // Time conflict detected
                return new Response(JSON.stringify({
                    error: result.error === 'TIME_CONFLICT'
                        ? 'This time slot is no longer available. Please choose another time.'
                        : (result.message || 'Booking could not be created'),
                    conflict: result.error === 'TIME_CONFLICT',
                }), {
                    status: 409,
                    headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                });
            }

            const booking = { id: result.booking_id };

            // Format date/time in salon timezone for notification
            const selectedStaff = (staff || []).find((s: any) => s.id === assignedStaffId);
            const formattedDate = startTimeUTC.toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: tz,
            });
            const formattedTime = startTimeUTC.toLocaleTimeString('en-US', {
                hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz,
            });

            // Delete trigger-created notification (trigger fires on INSERT with raw UTC time)
            // We'll replace it with our properly formatted one below
            await supabase
                .from('notification_queue')
                .delete()
                .eq('booking_id', booking.id)
                .eq('event_type', 'booking_created');

            await supabase.from('notification_queue').insert({
                tenant_id: tenantId,
                booking_id: booking.id,
                event_type: 'booking_created',
                client_name: client_name,
                client_email: client_email,
                client_phone: client_phone || null,
                status: 'pending',
                booking_details: {
                    date: formattedDate,
                    time: formattedTime,
                    service: selectedServices.map((s: any) => s.name).join(', '),
                    stylist: selectedStaff?.name || 'Staff',
                    price: totalPrice.toFixed(2),
                },
            });

            // Trigger send-notification
            try {
                await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
                });
            } catch { /* best effort */ }

            // Create payment link if deposit required
            let paymentUrl = '';
            let paymentError = '';
            if (totalDeposit > 0) {
                try {
                    const payRes = await fetch(`${SUPABASE_URL}/functions/v1/create-payment-link`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                            'X-TOOLS-KEY': 'LUXE-AUREA-SECRET-2026',
                        },
                        body: JSON.stringify({
                            tenant_id: tenantId,
                            booking_id: booking.id,
                            amount: totalDeposit,
                            client_email: client_email,
                            client_name: client_name,
                        }),
                    });
                    const payData = await payRes.json();
                    if (payRes.ok && payData.success) {
                        paymentUrl = payData.payment_link || payData.payment_url || payData.url || '';
                    } else {
                        paymentError = payData.error || payData.message || `Status: ${payRes.status}`;
                    }
                } catch (payErr: any) {
                    paymentError = payErr.message || 'Payment link fetch failed';
                }
            }

            return new Response(JSON.stringify({
                success: true,
                booking_id: booking.id,
                message: 'Booking created successfully!',
                payment_url: paymentUrl,
                payment_error: paymentError || undefined,
                details: {
                    service: selectedServices.map((s: any) => s.name).join(', '),
                    stylist: selectedStaff?.name || 'Staff',
                    date: formattedDate,
                    time: formattedTime,
                    price: totalPrice,
                    deposit: totalDeposit,
                },
            }), {
                headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
        } catch (e: any) {
            return new Response(JSON.stringify({ error: e.message }), {
                status: 500,
                headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
        }
    }

    // Handle OPTIONS (CORS)
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });
    }

    // GET with format=json → Return data as JSON (for book.html)
    const format = url.searchParams.get('format');
    if (req.method === 'GET' && format === 'json') {
        return new Response(JSON.stringify({
            tenant: {
                id: tenant.id,
                salon_name: tenant.salon_name,
                salon_tagline: tenant.salon_tagline,
                timezone: tenant.timezone,
            },
            services: (services || []).map((s: any) => ({
                id: s.id, name: s.name, price: s.price, duration: s.duration,
                category: s.category, deposit_amount: s.deposit_amount, description: s.description,
            })),
            staff: (staff || []).map((s: any) => ({
                id: s.id, name: s.name, specialty: s.specialty,
            })),
        }), {
            headers: {
                'content-type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    }

    // GET with format=slots → Return available time slots
    if (req.method === 'GET' && format === 'slots') {
        const slotDate = url.searchParams.get('date');
        const slotServiceId = url.searchParams.get('service_id');
        const slotServiceIds = url.searchParams.getAll('service_id');
        const slotStaffId = url.searchParams.get('staff_id') || null;

        const serviceIdsToUse = slotServiceIds.length > 0 ? slotServiceIds : (slotServiceId ? [slotServiceId] : []);

        if (!slotDate || serviceIdsToUse.length === 0) {
            return new Response(JSON.stringify({ error: 'date and service_id required' }), {
                status: 400,
                headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
        }

        const { data: slotsResult, error: slotsErr } = await supabase.rpc('get_available_slots', {
            p_tenant_id: tenantId,
            p_date: slotDate,
            p_service_ids: serviceIdsToUse,
            p_staff_id: slotStaffId,
            p_slot_interval: 30,
        });

        if (slotsErr) {
            return new Response(JSON.stringify({ error: slotsErr.message }), {
                status: 500,
                headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
        }

        const parsed = typeof slotsResult === 'string' ? JSON.parse(slotsResult) : slotsResult;

        // Add formatted display times to each slot
        // NOTE: start_at from RPC is already in salon LOCAL time (no Z suffix)
        // so we parse hours/minutes directly from the string — do NOT use new Date() + timeZone
        if (parsed.slots && Array.isArray(parsed.slots)) {
            parsed.slots = parsed.slots.map((s: any) => {
                if (s.start_at && !s.time) {
                    // Parse "2026-03-12T09:00:00" → extract 09:00 directly
                    const timePart = s.start_at.split('T')[1] || '';
                    const [hStr, mStr] = timePart.split(':');
                    const h = parseInt(hStr || '0');
                    const m = mStr || '00';
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
                    s.time = h12 + ':' + m + ' ' + ampm;
                    s.display_start = s.time;
                }
                return s;
            });
        }

        return new Response(JSON.stringify(parsed), {
            headers: { 'content-type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
    }

    // GET → Render HTML booking page
    const salonName = tenant.salon_name || 'Salon';
    const salonTagline = tenant.salon_tagline || 'Premium Salon & Spa';

    // Group services by category
    const grouped: Record<string, any[]> = {};
    for (const svc of (services || [])) {
        const cat = (svc as any).category || 'General';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(svc);
    }

    const servicesJSON = JSON.stringify(services || []);
    const staffJSON = JSON.stringify((staff || []).map((s: any) => ({ id: s.id, name: s.name, specialty: s.specialty })));

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Book an Appointment — ${salonName}</title>
    <meta name="description" content="Book your appointment at ${salonName}. ${salonTagline}">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: linear-gradient(135deg, #0a0a0a, #1a1a1a); color: #eaeaea; min-height: 100vh; }
        
        .header { background: linear-gradient(135deg, #1E1E1E, #2A2A2A); border-bottom: 2px solid #D4AF37; padding: 40px 20px; text-align: center; }
        .header h1 { font-size: 28px; font-weight: 800; color: #D4AF37; letter-spacing: 2px; text-transform: uppercase; }
        .header p { color: #A0A0A0; font-size: 14px; letter-spacing: 2px; text-transform: uppercase; margin-top: 8px; }
        
        .container { max-width: 700px; margin: 0 auto; padding: 30px 20px; }
        
        .step { display: none; animation: fadeIn 0.4s ease; }
        .step.active { display: block; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        
        .step-indicator { display: flex; justify-content: center; gap: 8px; margin-bottom: 30px; }
        .step-dot { width: 10px; height: 10px; border-radius: 50%; background: #333; transition: all 0.3s; }
        .step-dot.active { background: #D4AF37; box-shadow: 0 0 10px rgba(212,175,55,0.4); }
        .step-dot.done { background: #22C55E; }
        
        .step-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; color: #fff; }
        
        .service-card { background: #1E1E1E; border: 1px solid #333; border-radius: 12px; padding: 16px 20px; margin-bottom: 10px; cursor: pointer; transition: all 0.2s; display: flex; justify-content: space-between; align-items: center; }
        .service-card:hover { border-color: #D4AF37; transform: translateY(-1px); }
        .service-card.selected { border-color: #D4AF37; background: #D4AF3710; box-shadow: 0 0 15px rgba(212,175,55,0.1); }
        .service-name { font-weight: 600; font-size: 15px; }
        .service-meta { color: #A0A0A0; font-size: 12px; margin-top: 4px; }
        .service-price { font-size: 18px; font-weight: 700; color: #D4AF37; }
        .service-deposit { font-size: 11px; color: #22C55E; margin-top: 2px; }
        
        .category-label { font-size: 12px; font-weight: 700; color: #D4AF37; text-transform: uppercase; letter-spacing: 2px; margin: 20px 0 10px; }
        
        .staff-card { background: #1E1E1E; border: 1px solid #333; border-radius: 12px; padding: 16px; margin-bottom: 10px; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 14px; }
        .staff-card:hover { border-color: #D4AF37; }
        .staff-card.selected { border-color: #D4AF37; background: #D4AF3710; }
        .staff-avatar { width: 44px; height: 44px; border-radius: 50%; background: #D4AF3720; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #D4AF37; font-size: 16px; }
        .staff-name { font-weight: 600; font-size: 15px; }
        .staff-spec { color: #A0A0A0; font-size: 12px; }
        
        .form-group { margin-bottom: 16px; }
        .form-label { font-size: 13px; font-weight: 600; color: #A0A0A0; margin-bottom: 6px; display: block; }
        .form-input { width: 100%; background: #1E1E1E; border: 1px solid #333; border-radius: 10px; padding: 14px 16px; color: #eaeaea; font-size: 15px; outline: none; transition: border 0.2s; font-family: 'Inter', sans-serif; }
        .form-input:focus { border-color: #D4AF37; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        
        .btn { width: 100%; padding: 16px; border: none; border-radius: 12px; font-size: 16px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: 'Inter', sans-serif; }
        .btn-gold { background: linear-gradient(135deg, #D4AF37, #B8860B); color: #000; box-shadow: 0 4px 15px rgba(212,175,55,0.3); }
        .btn-gold:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(212,175,55,0.4); }
        .btn-gold:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .btn-outline { background: transparent; border: 1px solid #333; color: #A0A0A0; }
        .btn-outline:hover { border-color: #D4AF37; color: #D4AF37; }
        
        .btn-row { display: flex; gap: 12px; margin-top: 24px; }
        .btn-row .btn { flex: 1; }
        
        .summary-card { background: #1E1E1E; border: 1px solid #333; border-radius: 12px; padding: 20px; margin: 20px 0; }
        .summary-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #262626; }
        .summary-row:last-child { border-bottom: none; }
        .summary-label { color: #A0A0A0; font-size: 14px; }
        .summary-value { color: #eaeaea; font-size: 14px; font-weight: 600; }
        .summary-total { color: #D4AF37; font-size: 18px; font-weight: 700; }
        
        .success-container { text-align: center; padding: 40px 20px; }
        .success-icon { font-size: 60px; margin-bottom: 16px; }
        .success-title { font-size: 24px; font-weight: 700; color: #22C55E; margin-bottom: 8px; }
        .success-msg { color: #A0A0A0; font-size: 14px; line-height: 1.6; }
        
        .loading { display: inline-block; width: 20px; height: 20px; border: 2px solid transparent; border-top-color: #000; border-radius: 50%; animation: spin 0.6s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        
        .footer { text-align: center; padding: 30px; color: #666; font-size: 12px; border-top: 1px solid #1E1E1E; margin-top: 40px; }
        .footer a { color: #D4AF37; text-decoration: none; }

        @media (max-width: 500px) {
            .form-row { grid-template-columns: 1fr; }
            .header h1 { font-size: 22px; }
            .container { padding: 20px 14px; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${salonName}</h1>
        <p>${salonTagline}</p>
    </div>

    <div class="container">
        <div class="step-indicator">
            <div class="step-dot active" id="dot-0"></div>
            <div class="step-dot" id="dot-1"></div>
            <div class="step-dot" id="dot-2"></div>
            <div class="step-dot" id="dot-3"></div>
        </div>

        <!-- Step 1: Select Service -->
        <div class="step active" id="step-0">
            <div class="step-title">Choose a Service</div>
            <div id="services-list">
                ${Object.entries(grouped).map(([cat, svcs]) => `
                    <div class="category-label">${cat}</div>
                    ${(svcs as any[]).map((s: any) => `
                        <div class="service-card" data-id="${s.id}" onclick="selectService('${s.id}')">
                            <div>
                                <div class="service-name">${s.name}</div>
                                <div class="service-meta">${s.duration || 30} min${s.description ? ' · ' + s.description : ''}</div>
                            </div>
                            <div style="text-align:right">
                                <div class="service-price">$${(s.price || 0).toFixed(2)}</div>
                                ${s.deposit_amount ? `<div class="service-deposit">$${s.deposit_amount} deposit</div>` : ''}
                            </div>
                        </div>
                    `).join('')}
                `).join('')}
            </div>
        </div>

        <!-- Step 2: Select Staff + Date/Time -->
        <div class="step" id="step-1">
            <div class="step-title">Choose Staff & Time</div>
            <div class="form-group">
                <label class="form-label">PREFERRED STYLIST</label>
                <div id="staff-list">
                    <div class="staff-card selected" data-id="" onclick="selectStaff('')">
                        <div class="staff-avatar">?</div>
                        <div><div class="staff-name">Any Available</div><div class="staff-spec">First available stylist</div></div>
                    </div>
                    ${(staff || []).map((s: any) => `
                        <div class="staff-card" data-id="${s.id}" onclick="selectStaff('${s.id}')">
                            <div class="staff-avatar">${(s.name || 'S')[0]}</div>
                            <div><div class="staff-name">${s.name}</div><div class="staff-spec">${s.specialty || 'Stylist'}</div></div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="form-row" style="margin-top:20px">
                <div class="form-group">
                    <label class="form-label">DATE</label>
                    <input type="date" id="booking-date" class="form-input" min="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="form-group">
                    <label class="form-label">TIME</label>
                    <input type="time" id="booking-time" class="form-input" value="10:00">
                </div>
            </div>
            <div class="btn-row">
                <button class="btn btn-outline" onclick="goStep(0)">← Back</button>
                <button class="btn btn-gold" onclick="goStep(2)">Continue →</button>
            </div>
        </div>

        <!-- Step 3: Client Details -->
        <div class="step" id="step-2">
            <div class="step-title">Your Details</div>
            <div class="form-group">
                <label class="form-label">FULL NAME *</label>
                <input type="text" id="client-name" class="form-input" placeholder="e.g. Sarah Johnson" required>
            </div>
            <div class="form-group">
                <label class="form-label">EMAIL *</label>
                <input type="email" id="client-email" class="form-input" placeholder="e.g. sarah@email.com" required>
            </div>
            <div class="form-group">
                <label class="form-label">PHONE (Optional)</label>
                <input type="tel" id="client-phone" class="form-input" placeholder="e.g. +1 555-123-4567">
            </div>
            <div class="btn-row">
                <button class="btn btn-outline" onclick="goStep(1)">← Back</button>
                <button class="btn btn-gold" onclick="goStep(3)">Review Booking →</button>
            </div>
        </div>

        <!-- Step 4: Review & Confirm -->
        <div class="step" id="step-3">
            <div class="step-title">Review & Confirm</div>
            <div class="summary-card" id="booking-summary"></div>
            <div class="btn-row">
                <button class="btn btn-outline" onclick="goStep(2)">← Back</button>
                <button class="btn btn-gold" id="confirm-btn" onclick="submitBooking()">✓ Confirm Booking</button>
            </div>
        </div>

        <!-- Success -->
        <div class="step" id="step-4">
            <div class="success-container">
                <div class="success-icon">✅</div>
                <div class="success-title">Booking Confirmed!</div>
                <div class="success-msg" id="success-msg">Your appointment has been booked. Check your email for details.</div>
                <div id="pay-btn-wrapper" style="margin-top:24px"></div>
            </div>
        </div>
    </div>

    <div class="footer">
        © ${new Date().getFullYear()} ${salonName} · Powered by <a href="#">Voxali</a>
    </div>

    <script>
    const SERVICES = ${servicesJSON};
    const STAFF = ${staffJSON};
    const TENANT_ID = '${tenantId}';
    const API_URL = '${SUPABASE_URL}/functions/v1/online-booking?tenant_id=${tenantId}';

    let currentStep = 0;
    let selectedServiceId = null;
    let selectedStaffId = '';

    function selectService(id) {
        selectedServiceId = id;
        document.querySelectorAll('.service-card').forEach(c => c.classList.remove('selected'));
        document.querySelector('.service-card[data-id="'+id+'"]')?.classList.add('selected');
        setTimeout(() => goStep(1), 200);
    }

    function selectStaff(id) {
        selectedStaffId = id;
        document.querySelectorAll('.staff-card').forEach(c => c.classList.remove('selected'));
        document.querySelector('.staff-card[data-id="'+id+'"]')?.classList.add('selected');
    }

    function goStep(n) {
        // Validation
        if (n === 1 && !selectedServiceId) { alert('Please select a service'); return; }
        if (n === 2) {
            if (!document.getElementById('booking-date').value) { alert('Please select a date'); return; }
            if (!document.getElementById('booking-time').value) { alert('Please select a time'); return; }
        }
        if (n === 3) {
            if (!document.getElementById('client-name').value.trim()) { alert('Please enter your name'); return; }
            if (!document.getElementById('client-email').value.trim()) { alert('Please enter your email'); return; }
            buildSummary();
        }

        document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
        document.getElementById('step-' + n).classList.add('active');
        document.querySelectorAll('.step-dot').forEach((d, i) => {
            d.classList.remove('active', 'done');
            if (i < n) d.classList.add('done');
            if (i === n) d.classList.add('active');
        });
        currentStep = n;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function buildSummary() {
        const svc = SERVICES.find(s => s.id === selectedServiceId);
        const stf = STAFF.find(s => s.id === selectedStaffId);
        const date = document.getElementById('booking-date').value;
        const time = document.getElementById('booking-time').value;
        const name = document.getElementById('client-name').value;

        const dateObj = new Date(date + 'T' + time);
        const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const formattedTime = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

        document.getElementById('booking-summary').innerHTML = 
            '<div class="summary-row"><span class="summary-label">👤 Client</span><span class="summary-value">' + name + '</span></div>' +
            '<div class="summary-row"><span class="summary-label">💇 Service</span><span class="summary-value">' + (svc?.name || '') + '</span></div>' +
            '<div class="summary-row"><span class="summary-label">👨‍💼 Stylist</span><span class="summary-value">' + (stf?.name || 'Any Available') + '</span></div>' +
            '<div class="summary-row"><span class="summary-label">📅 Date</span><span class="summary-value">' + formattedDate + '</span></div>' +
            '<div class="summary-row"><span class="summary-label">🕐 Time</span><span class="summary-value">' + formattedTime + '</span></div>' +
            '<div class="summary-row"><span class="summary-label">⏱ Duration</span><span class="summary-value">' + (svc?.duration || 30) + ' min</span></div>' +
            '<div class="summary-row"><span class="summary-label">💰 Total</span><span class="summary-total">$' + (svc?.price || 0).toFixed(2) + '</span></div>' +
            (svc?.deposit_amount ? '<div class="summary-row"><span class="summary-label" style="color:#22C55E">💳 Deposit Required</span><span class="summary-value" style="color:#22C55E">$' + svc.deposit_amount.toFixed(2) + '</span></div>' : '');
    }

    async function submitBooking() {
        const btn = document.getElementById('confirm-btn');
        btn.disabled = true;
        btn.innerHTML = '<span class="loading"></span> Booking...';

        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service_id: selectedServiceId,
                    staff_id: selectedStaffId || undefined,
                    date: document.getElementById('booking-date').value,
                    time: document.getElementById('booking-time').value,
                    client_name: document.getElementById('client-name').value.trim(),
                    client_email: document.getElementById('client-email').value.trim(),
                    client_phone: document.getElementById('client-phone').value.trim() || undefined,
                }),
            });

            const data = await res.json();

            if (data.success) {
                let msg = 'Your appointment for <strong>' + (data.details?.service || '') + '</strong> on <strong>' + (data.details?.date || '') + '</strong> at <strong>' + (data.details?.time || '') + '</strong> has been confirmed.';
                msg += '<br><br>A confirmation email has been sent to <strong>' + document.getElementById('client-email').value + '</strong>.';
                
                document.getElementById('success-msg').innerHTML = msg;

                if (data.payment_url) {
                    document.getElementById('pay-btn-wrapper').innerHTML = '<a href="' + data.payment_url + '" class="btn btn-gold" style="display:inline-block;text-decoration:none;padding:16px 40px;max-width:300px;">💳 Pay $' + (data.details?.deposit || 0) + ' Deposit</a><div style="color:#666;font-size:12px;margin-top:8px">Secure payment via Stripe</div>';
                }

                goStep(4);
            } else {
                alert(data.error || 'Failed to create booking. Please try again.');
                btn.disabled = false;
                btn.innerHTML = '✓ Confirm Booking';
            }
        } catch (e) {
            alert('Network error. Please try again.');
            btn.disabled = false;
            btn.innerHTML = '✓ Confirm Booking';
        }
    }

    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('booking-date').value = tomorrow.toISOString().split('T')[0];
    </script>
</body>
</html>`;

    return new Response(html, {
        headers: { 'content-type': 'text/html; charset=utf-8' },
    });
});
