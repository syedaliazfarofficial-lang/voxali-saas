-- Allow anyone to upload and view photos in 'menu-items' bucket
-- This fixes the 'new row violates row-level security policy' error

BEGIN;
  -- Enable RLS just in case, though it usually is on
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

  -- Create policies
  DROP POLICY IF EXISTS "Allow Public Upload" ON storage.objects;
  CREATE POLICY "Allow Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'menu-items');

  DROP POLICY IF EXISTS "Allow Public View" ON storage.objects;
  CREATE POLICY "Allow Public View" ON storage.objects FOR SELECT USING (bucket_id = 'menu-items');

  DROP POLICY IF EXISTS "Allow Public Update" ON storage.objects;
  CREATE POLICY "Allow Public Update" ON storage.objects FOR UPDATE USING (bucket_id = 'menu-items');

  DROP POLICY IF EXISTS "Allow Public Delete" ON storage.objects;
  CREATE POLICY "Allow Public Delete" ON storage.objects FOR DELETE USING (bucket_id = 'menu-items');
COMMIT;
