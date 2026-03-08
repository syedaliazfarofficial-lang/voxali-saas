-- =============================================
-- VOXALI: Centralized Notification System + Performance Indexes
-- Run this in Supabase SQL Editor
-- =============================================
-- =============================================
-- PART 1: Add Twilio/notification columns to tenants
-- =============================================
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS twilio_account_sid TEXT;
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS twilio_auth_token TEXT;
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS twilio_phone_number TEXT;
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS notification_email_from TEXT;
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT FALSE;
-- =============================================
-- PART 2: Create notification_queue table
-- =============================================
CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    event_type TEXT NOT NULL,
    booking_id UUID REFERENCES bookings(id),
    client_phone TEXT,
    client_email TEXT,
    client_name TEXT,
    booking_details JSONB,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);
-- =============================================
-- PART 3: Database Trigger on bookings table
-- =============================================
CREATE OR REPLACE FUNCTION fn_queue_booking_notification() RETURNS TRIGGER AS $$
DECLARE v_client RECORD;
v_service RECORD;
v_stylist RECORD;
v_event TEXT;
v_tenant RECORD;
BEGIN -- Check if notifications are enabled for this tenant
SELECT notifications_enabled INTO v_tenant
FROM tenants
WHERE id = NEW.tenant_id;
IF NOT COALESCE(v_tenant.notifications_enabled, FALSE) THEN RETURN NEW;
END IF;
-- Determine event type
IF TG_OP = 'INSERT' THEN v_event := 'booking_created';
ELSIF OLD.status IS DISTINCT
FROM NEW.status THEN v_event := 'booking_' || NEW.status;
ELSE RETURN NEW;
-- No relevant change, skip
END IF;
-- Get related data
SELECT name,
    phone,
    email INTO v_client
FROM clients
WHERE id = NEW.client_id;
SELECT name INTO v_service
FROM services
WHERE id = NEW.service_id;
SELECT full_name INTO v_stylist
FROM staff
WHERE id = NEW.stylist_id;
-- Queue the notification
INSERT INTO notification_queue (
        tenant_id,
        event_type,
        booking_id,
        client_phone,
        client_email,
        client_name,
        booking_details
    )
VALUES (
        NEW.tenant_id,
        v_event,
        NEW.id,
        v_client.phone,
        v_client.email,
        v_client.name,
        jsonb_build_object(
            'service',
            v_service.name,
            'stylist',
            v_stylist.full_name,
            'date',
            to_char(NEW.start_time AT TIME ZONE 'UTC', 'YYYY-MM-DD'),
            'time',
            to_char(NEW.start_time AT TIME ZONE 'UTC', 'HH24:MI'),
            'price',
            NEW.total_price,
            'status',
            NEW.status
        )
    );
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_booking_notification ON bookings;
-- Create the trigger
CREATE TRIGGER trg_booking_notification
AFTER
INSERT
    OR
UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION fn_queue_booking_notification();
-- =============================================
-- PART 4: Performance Indexes for 100+ Tenants
-- =============================================
-- Bookings
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_id ON bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_status ON bookings(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_start ON bookings(tenant_id, start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_stylist_start ON bookings(stylist_id, start_time);
-- Clients
CREATE INDEX IF NOT EXISTS idx_clients_tenant_id ON clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_phone ON clients(tenant_id, phone);
-- Services
CREATE INDEX IF NOT EXISTS idx_services_tenant_id ON services(tenant_id);
-- Staff
CREATE INDEX IF NOT EXISTS idx_staff_tenant_id ON staff(tenant_id);
-- Call Logs
CREATE INDEX IF NOT EXISTS idx_call_logs_tenant_id ON call_logs(tenant_id);
-- Business Hours
CREATE INDEX IF NOT EXISTS idx_business_hours_tenant ON business_hours(tenant_id, day_of_week);
-- Notification Queue
CREATE INDEX IF NOT EXISTS idx_notification_queue_pending ON notification_queue(status, created_at)
WHERE status = 'pending';
-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
-- Payments
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
-- Staff Working Hours
CREATE INDEX IF NOT EXISTS idx_staff_working_hours_tenant ON staff_working_hours(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_working_hours_staff ON staff_working_hours(staff_id, day_of_week);
-- Marketing Campaigns
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_tenant ON marketing_campaigns(tenant_id);
-- =============================================
-- PART 5: Disable RLS on notification_queue (for Edge Functions)
-- =============================================
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on notification_queue" ON notification_queue FOR ALL USING (true) WITH CHECK (true);
-- =============================================
-- DONE! Verify with:
-- SELECT COUNT(*) FROM notification_queue;
-- SELECT indexname FROM pg_indexes WHERE tablename = 'bookings';
-- =============================================