import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

/**
 * send-reminders — 24hr Appointment Reminder Cron Job
 * 
 * This function is called by pg_cron every hour.
 * It finds bookings starting in 23-25 hours and inserts
 * reminder notifications into the notification_queue table.
 * The existing send-notification function then processes them.
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (_req) => {
    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        // Calculate the 24-hour window (23-25 hours from now)
        const now = new Date();
        const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000); // 23 hours from now
        const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);   // 25 hours from now

        // Find upcoming bookings in the 24hr window
        // Only confirmed/pending bookings, not cancelled/completed/no_show
        const { data: bookings, error: bookingsErr } = await supabase
            .from('bookings')
            .select(`
                id,
                tenant_id,
                client_id,
                stylist_id,
                service_id,
                start_time,
                total_price,
                status,
                clients!inner(name, email, phone),
                services!inner(name, duration),
                staff!inner(name)
            `)
            .in('status', ['confirmed', 'pending', 'deposit_paid'])
            .gte('start_time', windowStart.toISOString())
            .lte('start_time', windowEnd.toISOString());

        if (bookingsErr) throw bookingsErr;

        if (!bookings || bookings.length === 0) {
            return new Response(JSON.stringify({
                message: 'No upcoming bookings in 24hr window',
                processed: 0,
                window: { start: windowStart.toISOString(), end: windowEnd.toISOString() }
            }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        let queued = 0;
        let skipped = 0;

        for (const booking of bookings) {
            const client = (booking as any).clients;
            const service = (booking as any).services;
            const stylist = (booking as any).staff;

            if (!client?.email && !client?.phone) {
                skipped++;
                continue;
            }

            // Check if a reminder was already sent for this booking
            const { data: existing } = await supabase
                .from('notification_queue')
                .select('id')
                .eq('booking_id', booking.id)
                .eq('event_type', 'appointment_reminder')
                .limit(1);

            if (existing && existing.length > 0) {
                skipped++;
                continue; // Already sent reminder
            }

            // Get tenant timezone for date formatting
            const { data: tenant } = await supabase
                .from('tenants')
                .select('timezone, salon_name')
                .eq('id', booking.tenant_id)
                .single();

            const tz = tenant?.timezone || 'America/Chicago';

            // Format date and time in salon's timezone
            const startDate = new Date(booking.start_time);
            const formattedDate = startDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: tz,
            });
            const formattedTime = startDate.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
                timeZone: tz,
            });

            // Insert into notification_queue
            const { error: insertErr } = await supabase
                .from('notification_queue')
                .insert({
                    tenant_id: booking.tenant_id,
                    booking_id: booking.id,
                    event_type: 'appointment_reminder',
                    client_name: client.name || 'Valued Client',
                    client_email: client.email || null,
                    client_phone: client.phone || null,
                    status: 'pending',
                    booking_details: {
                        date: formattedDate,
                        time: formattedTime,
                        service: service?.name || 'Service',
                        stylist: stylist?.name || 'Staff',
                        price: (booking.total_price || 0).toFixed(2),
                        duration: service?.duration || 30,
                    },
                });

            if (insertErr) {
                console.error(`Failed to queue reminder for booking ${booking.id}:`, insertErr);
                skipped++;
            } else {
                queued++;
            }
        }

        // Now trigger send-notification to process the queue
        if (queued > 0) {
            try {
                await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                        'Content-Type': 'application/json',
                    },
                });
            } catch (e) {
                console.error('Failed to trigger send-notification:', e);
            }
        }

        return new Response(JSON.stringify({
            message: `Processed ${bookings.length} bookings`,
            queued,
            skipped,
            window: { start: windowStart.toISOString(), end: windowEnd.toISOString() },
        }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (e: any) {
        console.error('send-reminders error:', e);
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
});
