-- Fix: Suppress booking_confirmed notification when transitioning from pending_deposit to confirmed
-- (The webhook already queues deposit_received which has full receipt info)
CREATE OR REPLACE FUNCTION fn_queue_booking_notification() RETURNS TRIGGER AS $$
DECLARE v_client RECORD;
v_service RECORD;
v_stylist RECORD;
v_event TEXT;
v_tenant RECORD;
BEGIN
SELECT notifications_enabled INTO v_tenant
FROM tenants
WHERE id = NEW.tenant_id;
IF NOT COALESCE(v_tenant.notifications_enabled, FALSE) THEN RETURN NEW;
END IF;
IF TG_OP = 'INSERT' THEN -- Skip pending_deposit bookings (create-booking handles those with payment link)
IF NEW.status = 'pending_deposit' THEN RETURN NEW;
END IF;
v_event := 'booking_created';
ELSIF OLD.status IS DISTINCT
FROM NEW.status THEN -- Skip booking_confirmed when coming from pending_deposit
    -- (webhook already queues deposit_received with full receipt info)
    IF OLD.status = 'pending_deposit'
    AND NEW.status = 'confirmed' THEN RETURN NEW;
END IF;
v_event := 'booking_' || NEW.status;
ELSE RETURN NEW;
END IF;
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