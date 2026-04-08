-- This script creates a dummy table and drops it to force PostgREST to reload its schema cache.
-- Run this in your Supabase SQL Editor.

CREATE TABLE dummy_cache_buster (id int);
DROP TABLE dummy_cache_buster;

-- Alternatively, you can use the built-in function to reload:
NOTIFY pgrst, 'reload schema';
