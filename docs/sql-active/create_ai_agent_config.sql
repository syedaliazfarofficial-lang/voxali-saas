-- ================================================
-- CREATE AI AGENT CONFIG TABLE + SEED DATA
-- Run this in Supabase Dashboard → SQL Editor
-- ================================================
-- 1. Create the table
CREATE TABLE IF NOT EXISTS ai_agent_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    system_prompt TEXT NOT NULL DEFAULT '',
    announcements TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id)
);
-- 2. Enable RLS
ALTER TABLE ai_agent_config ENABLE ROW LEVEL SECURITY;
-- 3. RLS Policies
-- Allow authenticated users to read their own tenant's config
CREATE POLICY "Users can read own tenant ai config" ON ai_agent_config FOR
SELECT USING (true);
-- Allow authenticated users to update their own tenant's config
CREATE POLICY "Users can update own tenant ai config" ON ai_agent_config FOR
UPDATE USING (true);
-- Allow inserts (for seeding)
CREATE POLICY "Allow inserts to ai_agent_config" ON ai_agent_config FOR
INSERT WITH CHECK (true);
-- 4. Seed data for ALL existing tenants
INSERT INTO ai_agent_config (
        tenant_id,
        system_prompt,
        announcements,
        is_active
    )
SELECT t.id,
    'You are Bella, the AI voice receptionist for ' || t.salon_name || '. ' || 'You answer phone calls professionally, help customers book appointments, ' || 'check availability, reschedule or cancel existing bookings. ' || 'Always be friendly, warm, and helpful. ' || 'Greet callers with: "Welcome to ' || t.salon_name || '! My name is Bella, how can I help you today?"',
    '',
    true
FROM tenants t
WHERE NOT EXISTS (
        SELECT 1
        FROM ai_agent_config a
        WHERE a.tenant_id = t.id
    );
-- 5. Verify
SELECT t.salon_name,
    a.id as config_id,
    a.is_active,
    LENGTH(a.system_prompt) as prompt_length
FROM tenants t
    LEFT JOIN ai_agent_config a ON a.tenant_id = t.id
ORDER BY t.salon_name;