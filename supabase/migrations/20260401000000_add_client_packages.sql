-- Add client_package_templates table
CREATE TABLE IF NOT EXISTS client_package_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    total_uses INTEGER NOT NULL,
    validity_days INTEGER,
    service_ids UUID[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add client_active_packages table
CREATE TABLE IF NOT EXISTS client_active_packages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL, -- Reference to clients table handled at application level or add explicit constraint if clients table exists
    template_id UUID REFERENCES client_package_templates(id) ON DELETE CASCADE,
    remaining_uses INTEGER NOT NULL,
    expiry_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE client_package_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_active_packages ENABLE ROW LEVEL SECURITY;

-- Policies for client_package_templates
DO $$ BEGIN
  CREATE POLICY "Tenants can manage their package templates" ON client_package_templates FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid() LIMIT 1));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Policies for client_active_packages
DO $$ BEGIN
  CREATE POLICY "Tenants can manage their active packages" ON client_active_packages FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid() LIMIT 1));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
