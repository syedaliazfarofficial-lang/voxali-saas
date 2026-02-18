-- ============================================
-- VOICE AGENT INFRASTRUCTURE - DATABASE SCHEMA
-- ============================================

-- Add agent configuration to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS agent_config JSONB DEFAULT '{
    "agent_id": null,
    "agent_name": "Bella",
    "phone_number": null,
    "twilio_number": null,
    "voice_provider": "elevenlabs",
    "voice_id": "default",
    "language": "en-US",
    "greeting_message": "Thank you for calling. How can I help you today?"
}';

-- Add voice minutes tracking
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS voice_minutes_used INT DEFAULT 0;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS voice_minutes_limit INT DEFAULT 500;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS voice_overage_rate DECIMAL(10,2) DEFAULT 0.10;

-- Create tenant_agents table
CREATE TABLE IF NOT EXISTS tenant_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE UNIQUE NOT NULL,
    
    -- ElevenLabs Configuration
    elevenlabs_agent_id TEXT UNIQUE,
    elevenlabs_agent_name TEXT DEFAULT 'Bella',
    elevenlabs_voice_id TEXT DEFAULT 'default',
    
    -- Twilio Configuration
    twilio_phone_number TEXT UNIQUE,
    twilio_account_sid TEXT,
    twilio_friendly_name TEXT,
    
    -- n8n Webhook URLs (tenant-specific)
    webhook_base_url TEXT NOT NULL,
    webhook_create_booking TEXT GENERATED ALWAYS AS (webhook_base_url || '/create-booking') STORED,
    webhook_check_availability TEXT GENERATED ALWAYS AS (webhook_base_url || '/check-availability') STORED,
    webhook_cancel_booking TEXT GENERATED ALWAYS AS (webhook_base_url || '/cancel-booking') STORED,
    webhook_reschedule_booking TEXT GENERATED ALWAYS AS (webhook_base_url || '/reschedule-booking') STORED,
    webhook_add_to_waitlist TEXT GENERATED ALWAYS AS (webhook_base_url || '/add-to-waitlist') STORED,
    
    -- Agent Status
    is_active BOOLEAN DEFAULT true,
    is_provisioned BOOLEAN DEFAULT false,
    last_call_at TIMESTAMPTZ,
    total_calls INT DEFAULT 0,
    total_bookings_via_voice INT DEFAULT 0,
    
    -- Agent Customization
    greeting_message TEXT DEFAULT 'Thank you for calling. How can I help you today?',
    business_context TEXT, -- Custom prompt additions
    
    -- Timestamps
    provisioned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tenant_agents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant_agents
DROP POLICY IF EXISTS "Super admin can view all tenant agents" ON tenant_agents;
CREATE POLICY "Super admin can view all tenant agents" ON tenant_agents
    FOR SELECT USING (
        (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'super_admin'
    );

DROP POLICY IF EXISTS "Tenant admins can view own agent" ON tenant_agents;
CREATE POLICY "Tenant admins can view own agent" ON tenant_agents
    FOR SELECT USING (
        tenant_id = (SELECT tenant_id FROM profiles WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Super admin can manage all agents" ON tenant_agents;
CREATE POLICY "Super admin can manage all agents" ON tenant_agents
    FOR ALL USING (
        (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'super_admin'
    );

-- Create call_logs table for tracking voice interactions
CREATE TABLE IF NOT EXISTS call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    agent_id UUID REFERENCES tenant_agents(id) ON DELETE CASCADE,
    
    -- Call Details
    call_sid TEXT UNIQUE, -- Twilio Call SID
    from_number TEXT,
    to_number TEXT,
    call_status TEXT, -- completed, failed, busy, no-answer
    
    -- Duration & Timing
    call_duration INT, -- in seconds
    call_started_at TIMESTAMPTZ,
    call_ended_at TIMESTAMPTZ,
    
    -- AI Analysis
    conversation_summary TEXT,
    intent_detected TEXT, -- booking, cancellation, inquiry, etc.
    booking_created_id UUID REFERENCES bookings(id),
    
    -- Costs
    call_cost DECIMAL(10, 4),
    minutes_charged DECIMAL(10, 2),
    
    -- Recording
    recording_url TEXT,
    transcript TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on call_logs
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- Call logs RLS
DROP POLICY IF EXISTS "Users see only their tenant call logs" ON call_logs;
CREATE POLICY "Users see only their tenant call logs" ON call_logs
    FOR SELECT USING (
        (SELECT role FROM profiles WHERE user_id = auth.uid()) = 'super_admin'
        OR
        tenant_id = (SELECT tenant_id FROM profiles WHERE user_id = auth.uid())
    );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenant_agents_tenant ON tenant_agents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_agents_phone ON tenant_agents(twilio_phone_number);
CREATE INDEX IF NOT EXISTS idx_call_logs_tenant ON call_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_started ON call_logs(call_started_at DESC);

-- Function to update voice minutes usage
CREATE OR REPLACE FUNCTION update_tenant_voice_minutes()
RETURNS TRIGGER AS $$
BEGIN
    -- Update tenant's voice minutes when call completes
    UPDATE tenants 
    SET voice_minutes_used = voice_minutes_used + CEIL(NEW.call_duration / 60.0)
    WHERE id = NEW.tenant_id;
    
    -- Update agent's total calls
    UPDATE tenant_agents
    SET 
        total_calls = total_calls + 1,
        last_call_at = NEW.call_ended_at
    WHERE id = NEW.agent_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update minutes
DROP TRIGGER IF EXISTS on_call_completed ON call_logs;
CREATE TRIGGER on_call_completed
    AFTER INSERT ON call_logs
    FOR EACH ROW
    WHEN (NEW.call_status = 'completed')
    EXECUTE FUNCTION update_tenant_voice_minutes();

-- View for agent analytics
CREATE OR REPLACE VIEW agent_stats AS
SELECT 
    ta.tenant_id,
    t.business_name,
    ta.twilio_phone_number,
    ta.is_active,
    ta.total_calls,
    COUNT(cl.id) as calls_this_month,
    SUM(cl.call_duration) as total_duration_seconds,
    CEIL(SUM(cl.call_duration) / 60.0) as total_minutes,
    COUNT(cl.booking_created_id) as bookings_via_voice,
    t.voice_minutes_used,
    t.voice_minutes_limit,
    CASE 
        WHEN t.voice_minutes_used > t.voice_minutes_limit 
        THEN (t.voice_minutes_used - t.voice_minutes_limit) * t.voice_overage_rate 
        ELSE 0 
    END as overage_charges
FROM tenant_agents ta
LEFT JOIN tenants t ON ta.tenant_id = t.id
LEFT JOIN call_logs cl ON ta.id = cl.agent_id 
    AND cl.call_started_at >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY ta.id, t.id;

-- ============================================
-- SAMPLE DATA FOR TESTING
-- ============================================

-- Example: Insert test tenant agent configuration
/*
INSERT INTO tenant_agents (
    tenant_id,
    elevenlabs_agent_id,
    twilio_phone_number,
    webhook_base_url,
    is_active,
    is_provisioned,
    greeting_message
) VALUES (
    'YOUR_TENANT_ID_HERE'::uuid,
    'elevenlabs_agent_xyz',
    '+15551234567',
    'https://n8n.yourdomain.com/webhook/YOUR_TENANT_ID_HERE',
    true,
    true,
    'Thank you for calling Luxe Aurea Salon. How can I help you today?'
);
*/

-- Verify tenant_agents table
SELECT * FROM tenant_agents;

-- Check agent stats
SELECT * FROM agent_stats;

-- SUCCESS! Voice agent infrastructure ready
