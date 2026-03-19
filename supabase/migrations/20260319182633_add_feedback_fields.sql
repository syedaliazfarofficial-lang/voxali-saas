-- Add client feedback fields
ALTER TABLE bookings
ADD COLUMN rating SMALLINT CHECK (rating >= 1 AND rating <= 5),
ADD COLUMN review_text TEXT;
