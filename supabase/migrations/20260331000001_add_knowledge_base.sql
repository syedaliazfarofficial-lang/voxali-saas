-- Add knowledge_base column to ai_agent_config
ALTER TABLE ai_agent_config ADD COLUMN IF NOT EXISTS knowledge_base TEXT DEFAULT NULL;
