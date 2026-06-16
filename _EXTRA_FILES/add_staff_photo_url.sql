-- Add photo_url column to staff table
ALTER TABLE staff ADD COLUMN IF NOT EXISTS photo_url TEXT DEFAULT NULL;

-- Create Supabase Storage bucket for staff photos (run via Supabase dashboard SQL editor)
-- The bucket will be created via the Supabase Storage API
