-- Add client feedback fields (idempotent)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rating SMALLINT CHECK (rating >= 1 AND rating <= 5);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS review_text TEXT;
