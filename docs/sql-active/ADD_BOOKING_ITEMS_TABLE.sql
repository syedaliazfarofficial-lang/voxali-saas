-- =============================================
-- ADD BOOKING_ITEMS TABLE
-- Run this in Supabase SQL Editor
-- Required for create_booking workflow
-- =============================================
CREATE TABLE IF NOT EXISTS booking_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
    service_id UUID REFERENCES services(id) NOT NULL,
    name_snapshot TEXT,
    price_snapshot DECIMAL(10, 2),
    duration_min_snapshot INTEGER,
    cleanup_buffer_min_snapshot INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_booking_items_booking ON booking_items(booking_id);
-- Verify
SELECT '✅ booking_items table created!' as status;