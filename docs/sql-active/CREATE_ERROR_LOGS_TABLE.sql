-- Phase 8: Error Handling & Monitoring
-- Run this SQL in Supabase Dashboard → SQL Editor
CREATE TABLE IF NOT EXISTS error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    workflow_name TEXT NOT NULL,
    node_name TEXT,
    error_message TEXT NOT NULL,
    error_type TEXT DEFAULT 'workflow_error',
    input_data JSONB,
    severity TEXT DEFAULT 'error' CHECK (severity IN ('warning', 'error', 'critical')),
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_tenant ON error_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
-- RLS Policy (optional - allow service role full access)
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on error_logs" ON error_logs FOR ALL USING (true) WITH CHECK (true);
COMMENT ON TABLE error_logs IS 'Stores workflow execution errors for monitoring and debugging';