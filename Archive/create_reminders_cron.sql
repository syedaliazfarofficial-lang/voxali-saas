-- 1. Create the function (Fixed Column Names and missing fields)
CREATE OR REPLACE FUNCTION queue_tomorrow_reminders()
RETURNS void AS $$
DECLARE
    booking RECORD;
BEGIN
    FOR booking IN
        SELECT
            b.id as booking_id,
            c.name as client_name,
            c.phone as client_phone,
            c.email as client_email,
            to_char(b.start_time AT TIME ZONE COALESCE(t.timezone, 'America/New_York'), 'Day, FMmonth DD, YYYY') as date_str,
            to_char(b.start_time AT TIME ZONE COALESCE(t.timezone, 'America/New_York'), 'HH12:MI AM') as time_str,
            s.name as service_name,
            st.full_name as stylist_name,
            t.name as salon_name,
            t.id as tenant_id
        FROM bookings b
        JOIN clients c ON b.client_id = c.id
        JOIN services s ON b.service_id = s.id
        LEFT JOIN staff st ON b.stylist_id = st.id    
        JOIN tenants t ON b.tenant_id = t.id
        WHERE b.status = 'confirmed'
          AND b.start_time::date = CURRENT_DATE + INTERVAL '1 day'
    LOOP
        INSERT INTO notification_queue (
            tenant_id,
            event_type,
            booking_id,
            client_name,
            client_phone,
            client_email,
            booking_details,
            status
        ) VALUES (
            booking.tenant_id,
            'appointment_reminder',
            booking.booking_id,
            booking.client_name,
            booking.client_phone,
            booking.client_email,
            jsonb_build_object(
                'client_name', booking.client_name,
                'salon_name', booking.salon_name,
                'service', booking.service_name,
                'stylist', COALESCE(booking.stylist_name, 'a professional'),
                'date', trim(booking.date_str),
                'time', trim(booking.time_str)
            ),
            'pending'
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 2. Safely schedule the job without unscheduling errors
CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$
BEGIN
    PERFORM cron.unschedule('daily_appointment_reminders');
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

SELECT cron.schedule('daily_appointment_reminders', '0 8 * * *', 'SELECT queue_tomorrow_reminders()');

-- 3. IMMEDIATELY test it!
SELECT queue_tomorrow_reminders();
