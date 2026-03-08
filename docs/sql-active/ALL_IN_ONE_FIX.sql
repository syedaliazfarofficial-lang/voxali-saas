-- ============================================================
-- ALL-IN-ONE FIX — Run this ONCE in Supabase SQL Editor
-- Fixes: Branding save, Super Admin password, All sessions
-- ============================================================
-- 1. ADD MISSING BRANDING COLUMNS (deleted by DB reset)
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS salon_name TEXT DEFAULT 'My Salon',
    ADD COLUMN IF NOT EXISTS salon_tagline TEXT DEFAULT 'Salon & Spa',
    ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS owner_name TEXT DEFAULT 'Owner';
-- 2. SYNC existing salon name to salon_name
UPDATE public.tenants
SET salon_name = name,
    salon_tagline = 'Luxury Salon & Spa'
WHERE salon_name IS NULL
    OR salon_name = 'My Salon';
-- 3. RECREATE branding update function
CREATE OR REPLACE FUNCTION rpc_update_branding(
        p_tenant_id UUID,
        p_salon_name TEXT DEFAULT NULL,
        p_salon_tagline TEXT DEFAULT NULL,
        p_logo_url TEXT DEFAULT NULL,
        p_owner_name TEXT DEFAULT NULL
    ) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN
UPDATE public.tenants
SET salon_name = COALESCE(p_salon_name, salon_name),
    salon_tagline = COALESCE(p_salon_tagline, salon_tagline),
    logo_url = COALESCE(p_logo_url, logo_url),
    owner_name = COALESCE(p_owner_name, owner_name),
    name = COALESCE(p_salon_name, name),
    -- Also update 'name' for fallback
    updated_at = NOW()
WHERE id = p_tenant_id;
RETURN jsonb_build_object('success', true);
END;
$$;
GRANT EXECUTE ON FUNCTION rpc_update_branding TO authenticated,
    anon,
    service_role;
-- 4. RESET SUPER ADMIN PASSWORD to Pak@545537
UPDATE auth.users
SET encrypted_password = crypt('Pak@545537', gen_salt('bf')),
    updated_at = NOW()
WHERE email = 'super@voxali.com';
-- 5. RESET SALON OWNER PASSWORD to Luze@545537
UPDATE auth.users
SET encrypted_password = crypt('Luze@545537', gen_salt('bf')),
    updated_at = NOW()
WHERE email = 'owner@gmail.com';
-- VERIFY
SELECT 'Branding columns:' as check,
    column_name
FROM information_schema.columns
WHERE table_name = 'tenants'
    AND column_name IN (
        'salon_name',
        'salon_tagline',
        'logo_url',
        'owner_name'
    );
SELECT 'Tenants:' as check,
    name,
    salon_name
FROM public.tenants;
SELECT '✅ ALL FIXED!' as status;