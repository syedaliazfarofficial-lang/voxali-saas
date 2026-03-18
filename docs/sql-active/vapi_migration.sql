-- Run this in your Supabase SQL Editor to migrate from ElevenLabs to Vapi
-- 1. Rename the ElevenLabs Agent ID column to Vapi Assistant ID
ALTER TABLE public.tenants
    RENAME COLUMN elevenlabs_agent_id TO vapi_assistant_id;
-- 2. Add an optional column to store the Vapi Phone Number ID for easier tracking
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS vapi_phone_number_id TEXT;