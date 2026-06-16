-- Upgrade schema for Interactive ordering
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;

-- Track user state (What are they doing right now?)
CREATE TABLE IF NOT EXISTS customer_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wa_id TEXT UNIQUE NOT NULL,
  state TEXT DEFAULT 'IDLE', -- IDLE, SELECTING_SIZE, ASKING_NAME, ASKING_ADDRESS
  current_order JSONB DEFAULT '{}'::jsonb, -- Store temporary order details
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sample Data Update: Add a variation to the existing Pizza
UPDATE menu_items 
SET variants = '[
  {"id": "s", "name": "Small", "price": 800},
  {"id": "m", "name": "Medium", "price": 1200},
  {"id": "l", "name": "Large", "price": 1600}
]'::jsonb
WHERE name ILIKE '%Pizza%';
