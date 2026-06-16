ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_notification_email text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_phone text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS low_balance_alert_sent boolean DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ai_paused_alert_sent boolean DEFAULT false;
