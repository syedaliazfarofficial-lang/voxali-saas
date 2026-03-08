-- ================================================
-- Add call recording columns to call_logs table
-- Run this in Supabase SQL Editor
-- ================================================
-- Add new columns for ElevenLabs webhook data
ALTER TABLE call_logs
ADD COLUMN IF NOT EXISTS conversation_id TEXT;
ALTER TABLE call_logs
ADD COLUMN IF NOT EXISTS agent_id TEXT;
ALTER TABLE call_logs
ADD COLUMN IF NOT EXISTS recording_url TEXT;
ALTER TABLE call_logs
ADD COLUMN IF NOT EXISTS transcript_summary TEXT;
ALTER TABLE call_logs
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';
ALTER TABLE call_logs
ADD COLUMN IF NOT EXISTS call_ended_at TIMESTAMPTZ;
-- Index for fast lookup by tenant
CREATE INDEX IF NOT EXISTS idx_call_logs_tenant ON call_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_conversation ON call_logs(conversation_id);
-- Notify PostgREST to reload schema
NOTIFY pgrst,
'reload schema';