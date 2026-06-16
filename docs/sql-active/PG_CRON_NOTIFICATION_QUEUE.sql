-- =============================================
-- VOXALI: pg_cron Queue Processing Setup
-- Run this in Supabase SQL Editor
-- =============================================
-- NOTE: pg_cron is available on Supabase Pro plan.
-- If on Free plan, skip this and call the Edge Function manually.
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
-- Enable pg_net extension (for HTTP calls from SQL)
CREATE EXTENSION IF NOT EXISTS pg_net;
-- Schedule: Process notification queue every 60 seconds
SELECT cron.schedule(
        'process-notification-queue',
        '* * * * *',
        -- Every minute (cron format)
        $$
        SELECT net.http_post(
                url := 'https://sjzxgjimbcoqsylrglkm.supabase.co/functions/v1/send-notification',
                headers := jsonb_build_object(
                    'Authorization',
                    'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0',
                    'Content-Type',
                    'application/json'
                ),
                body := '{"source": "cron"}'::jsonb
            );
$$
);
-- Verify scheduled jobs
SELECT *
FROM cron.job;
-- =============================================
-- TO REMOVE THE CRON JOB:
-- SELECT cron.unschedule('process-notification-queue');
-- =============================================