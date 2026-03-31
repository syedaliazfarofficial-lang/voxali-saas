-- Migration: Add AI Receptionist configuration columns to ai_agent_config
-- Date: 2026-03-31

ALTER TABLE ai_agent_config ADD COLUMN IF NOT EXISTS ai_name TEXT DEFAULT 'Aria';
ALTER TABLE ai_agent_config ADD COLUMN IF NOT EXISTS language_override TEXT DEFAULT NULL;
ALTER TABLE ai_agent_config ADD COLUMN IF NOT EXISTS transfer_phone TEXT DEFAULT NULL;
ALTER TABLE ai_agent_config ADD COLUMN IF NOT EXISTS privacy_policy_text TEXT DEFAULT NULL;
ALTER TABLE ai_agent_config ADD COLUMN IF NOT EXISTS escalation_phone TEXT DEFAULT NULL;
ALTER TABLE ai_agent_config ADD COLUMN IF NOT EXISTS first_message TEXT DEFAULT NULL;
ALTER TABLE ai_agent_config ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT NULL;
