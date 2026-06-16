-- STEP 1: Make tenant_id optional (for testing without auth)
ALTER TABLE menu_categories ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE menu_items ALTER COLUMN tenant_id DROP NOT NULL;

-- STEP 2: Disable RLS so inserts work without login (dev mode only)
ALTER TABLE menu_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_logs DISABLE ROW LEVEL SECURITY;

-- STEP 3: Add some test categories to verify it works
INSERT INTO menu_categories (name, priority) VALUES 
  ('🍕 Pizzas', 1),
  ('🍔 Burgers', 2),
  ('🥤 Cold Drinks', 3),
  ('🍟 Sides', 4);
