-- Add customer_name column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS wa_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_items JSONB DEFAULT '[]'::jsonb;

-- Allow anon role to insert/read orders & sessions (for the webhook)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on orders" ON orders;
CREATE POLICY "Allow anon all on orders" ON orders FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE customer_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on sessions" ON customer_sessions;
CREATE POLICY "Allow anon all on sessions" ON customer_sessions FOR ALL USING (true) WITH CHECK (true);
