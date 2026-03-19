import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req: Request) => {
    try {
        const url = new URL(req.url);
        const tenantId = url.searchParams.get('tenant');

        if (!tenantId) {
            return new Response('Missing tenant parameter', { status: 400 });
        }

        // Fetch bookings for the next 30 days and past 7 days to keep feed light
        const now = new Date();
        const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const { data: bookings, error } = await supabase
            .from('bookings')
            .select(`
                id, start_time, end_time, status, total_price,
                client:clients (name, phone),
                service:services (name, duration)
            `)
            .eq('tenant_id', tenantId)
            .in('status', ['confirmed', 'completed', 'checked_in', 'checked-in'])
            .gte('start_time', past.toISOString())
            .lte('start_time', future.toISOString());

        if (error) throw error;

        // Generate ICS format
        let ics = 'BEGIN:VCALENDAR\r\n';
        ics += 'VERSION:2.0\r\n';
        ics += 'PRODID:-//Voxali//Calendar Sync//EN\r\n';
        ics += 'CALSCALE:GREGORIAN\r\n';
        ics += 'METHOD:PUBLISH\r\n';
        ics += 'X-WR-CALNAME:Voxali Bookings\r\n';
        ics += 'X-WR-TIMEZONE:UTC\r\n';

        if (bookings && bookings.length > 0) {
            for (const b of bookings) {
                if (!b.start_time || !b.service) continue;

                const startDate = new Date(b.start_time);
                // Get end time directly from DB
                const endDate = new Date(b.end_time);

                const formatDate = (date: Date) => {
                    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
                };

                const dtStart = formatDate(startDate);
                const dtEnd = formatDate(endDate);
                const dtStamp = formatDate(new Date());

                const clientName = b.client?.name || 'Walk-in';
                const clientPhone = b.client?.phone || '';
                const svcName = b.service.name || 'Service';

                ics += 'BEGIN:VEVENT\r\n';
                ics += `UID:voxali-booking-${b.id}@voxali.net\r\n`;
                ics += `DTSTAMP:${dtStamp}\r\n`;
                ics += `DTSTART:${dtStart}\r\n`;
                ics += `DTEND:${dtEnd}\r\n`;
                ics += `SUMMARY:${clientName} - ${svcName}\r\n`;
                ics += `DESCRIPTION:Client: ${clientName}\\nPhone: ${clientPhone}\\nService: ${svcName}\\nPrice: $${b.total_price}\\nStatus: ${b.status}\r\n`;
                ics += 'END:VEVENT\r\n';
            }
        }

        ics += 'END:VCALENDAR\r\n';

        return new Response(ics, {
            headers: {
                'Content-Type': 'text/calendar; charset=utf-8',
                'Content-Disposition': 'attachment; filename="voxali_bookings.ics"',
                'Access-Control-Allow-Origin': '*'
            }
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
});
