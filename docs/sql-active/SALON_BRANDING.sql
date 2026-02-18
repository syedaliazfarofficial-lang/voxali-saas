-- =============================================
-- SALON BRANDING — Owner-Editable Name + Logo
-- Run this in Supabase SQL Editor
-- =============================================
-- 1) Add branding columns to the tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS salon_name TEXT DEFAULT 'My Salon',
    ADD COLUMN IF NOT EXISTS salon_tagline TEXT DEFAULT 'Salon & Spa',
    ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS owner_name TEXT DEFAULT 'Owner';
-- 2) Update existing tenant with current branding
UPDATE tenants
SET salon_name = name,
    salon_tagline = 'Salon & Spa',
    owner_name = 'Sarah'
WHERE salon_name = 'My Salon'
    OR salon_name IS NULL;
-- 3) Create a storage bucket for logos (run separately if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true)
-- ON CONFLICT DO NOTHING;
-- 4) RPC: Update branding
CREATE OR REPLACE FUNCTION rpc_update_branding(
        p_tenant_id UUID,
        p_salon_name TEXT DEFAULT NULL,
        p_salon_tagline TEXT DEFAULT NULL,
        p_logo_url TEXT DEFAULT NULL,
        p_owner_name TEXT DEFAULT NULL
    ) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN
UPDATE tenants
SET salon_name = COALESCE(p_salon_name, salon_name),
    salon_tagline = COALESCE(p_salon_tagline, salon_tagline),
    logo_url = COALESCE(p_logo_url, logo_url),
    owner_name = COALESCE(p_owner_name, owner_name),
    updated_at = NOW()
WHERE id = p_tenant_id;
RETURN jsonb_build_object('success', true);
END;
$$;
-- 5) Grant permissions
GRANT EXECUTE ON FUNCTION rpc_update_branding TO anon,
    authenticated,
    service_role;
-- 6) RLS: Allow reading tenants for anon (dashboard reads branding)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenants_select_all" ON tenants;
CREATE POLICY "tenants_select_all" ON tenants FOR
SELECT USING (true);
DROP POLICY IF EXISTS "tenants_update_own" ON tenants;
CREATE POLICY "tenants_update_own" ON tenants FOR
UPDATE USING (true);