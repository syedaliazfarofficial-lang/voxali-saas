-- WhatsApp AI SaaS - Restaurant Menu & Bot Schema

-- 1. TENANTS (Restaurants/Businesses)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name TEXT NOT NULL,
  whatsapp_number TEXT UNIQUE, 
  wa_access_token TEXT,        
  wa_phone_number_id TEXT,     
  wa_verify_token TEXT,        
  ai_prompt TEXT DEFAULT 'You are a helpful restaurant assistant. Provide the menu and take orders politely.',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. MENU CATEGORIES (Pizza, Burgers, etc.)
CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  priority INTEGER DEFAULT 0 
);

-- 3. MENU ITEMS
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES menu_categories(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CUSTOMERS (WhatsApp Users)
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  wa_id TEXT NOT NULL, 
  name TEXT,           
  last_chat TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, wa_id)
);

-- 5. ORDERS (Captured by AI)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  items_summary TEXT, 
  total_price DECIMAL(10,2),
  delivery_address TEXT,
  order_status TEXT DEFAULT 'pending', 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. CHAT LOGS (History)
CREATE TABLE IF NOT EXISTS chat_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  sender TEXT, 
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
