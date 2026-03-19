-- Add recurring appointment fields to bookings
ALTER TABLE bookings
ADD COLUMN is_recurring BOOLEAN DEFAULT false,
ADD COLUMN parent_booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE;
