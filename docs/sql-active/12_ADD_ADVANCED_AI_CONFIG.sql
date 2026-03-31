-- ==========================================
-- ADD ADVANCED AI CONFIGURATION COLUMNS
-- ==========================================

ALTER TABLE ai_agent_config 
ADD COLUMN IF NOT EXISTS first_message TEXT DEFAULT 'Hi, how can I help you today?',
ADD COLUMN IF NOT EXISTS voice_id TEXT DEFAULT 'jBpfuIE2acCO8z3wKNLl',
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en-US',
ADD COLUMN IF NOT EXISTS custom_knowledge TEXT DEFAULT '';
