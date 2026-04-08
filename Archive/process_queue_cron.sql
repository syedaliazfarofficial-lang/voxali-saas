-- Enable pg_net to make HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
    PERFORM cron.unschedule('process_notification_queue');
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- Get the supabase URL and KEY dynamically, or pass them in
-- Since pg_cron can't read env vars, we read from platform_config or hardcode for this specific project
SELECT cron.schedule('process_notification_queue', '* * * * *', $$
    SELECT net.http_post(
        url := 'https://sjzxgjimbcoqsylrglkm.supabase.co/functions/v1/send-notification',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0"}'::jsonb,
        body := '{}'::jsonb
    );
$$);
