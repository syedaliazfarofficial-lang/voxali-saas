-- ================================================
-- SETUP AUTO REMINDERS — pg_cron Job
-- Run this in Supabase Dashboard → SQL Editor
-- ================================================
-- NOTE: pg_cron and pg_net extensions must be enabled first
-- Go to Supabase Dashboard → Database → Extensions → Enable "pg_cron" and "pg_net"
-- 1. Enable extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
-- 2. Schedule the send-reminders function to run every hour
-- It finds bookings 23-25 hours away and queues reminder emails
SELECT cron.schedule(
        'send-appointment-reminders',
        -- job name
        '0 * * * *',
        -- every hour at minute 0
        $$
        SELECT net.http_post(
                url := 'https://sjzxgjimbcoqsylrglkm.supabase.co/functions/v1/send-reminders',
                headers := jsonb_build_object(
                    'Content-Type',
                    'application/json',
                    'Authorization',
                    'Bearer ' || current_setting('supabase.service_role_key', true)
                ),
                body := '{}'::jsonb
            );
$$
);
-- 3. Verify the job was created
SELECT jobid,
    schedule,
    command,
    jobname
FROM cron.job
WHERE jobname = 'send-appointment-reminders';
-- 4. Also schedule send-notification to process the queue every 5 minutes
-- (in case it's not already scheduled)
SELECT cron.schedule(
        'process-notification-queue',
        '*/5 * * * *',
        -- every 5 minutes
        $$
        SELECT net.http_post(
                url := 'https://sjzxgjimbcoqsylrglkm.supabase.co/functions/v1/send-notification',
                headers := jsonb_build_object(
                    'Content-Type',
                    'application/json',
                    'Authorization',
                    'Bearer ' || current_setting('supabase.service_role_key', true)
                ),
                body := '{}'::jsonb
            );
$$
);
-- To remove a job later: SELECT cron.unschedule('send-appointment-reminders');