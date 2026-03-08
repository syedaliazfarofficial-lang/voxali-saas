-- ============================================================
-- FINAL FIX: Drop ALL overloaded versions, recreate, reload cache
-- Run this in Supabase SQL Editor
-- ============================================================
-- 1. Drop ALL versions of the function (any parameter count)
DO $$
DECLARE r RECORD;
BEGIN FOR r IN (
    SELECT oid::regprocedure::text as func_sig
    FROM pg_proc
    WHERE proname = 'rpc_update_branding'
) LOOP EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_sig || ' CASCADE';
RAISE NOTICE 'Dropped: %',
r.func_sig;
END LOOP;
END $$;
-- 2. Recreate the function cleanly
CREATE OR REPLACE FUNCTION rpc_update_branding(
        p_tenant_id UUID,
        p_salon_name TEXT DEFAULT NULL,
        p_salon_tagline TEXT DEFAULT NULL,
        p_logo_url TEXT DEFAULT NULL,
        p_owner_name TEXT DEFAULT NULL,
        p_timezone TEXT DEFAULT NULL
    ) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE rows_affected INTEGER;
BEGIN
UPDATE public.tenants
SET name = COALESCE(p_salon_name, name),
    salon_name = COALESCE(p_salon_name, salon_name),
    salon_tagline = COALESCE(p_salon_tagline, salon_tagline),
    logo_url = COALESCE(p_logo_url, logo_url),
    owner_name = COALESCE(p_owner_name, owner_name),
    timezone = COALESCE(p_timezone, timezone),
    updated_at = NOW()
WHERE id = p_tenant_id;
GET DIAGNOSTICS rows_affected = ROW_COUNT;
RETURN jsonb_build_object(
    'success',
    rows_affected > 0,
    'rows_updated',
    rows_affected
);
END;
$$;
-- 3. Grant access
GRANT EXECUTE ON FUNCTION rpc_update_branding TO authenticated,
    anon,
    service_role;
-- 4. FORCE PostgREST to reload schema (this is the key step!)
NOTIFY pgrst,
'reload schema';
-- 5. Verify the function exists and test it
SELECT proname,
    pronargs
FROM pg_proc
WHERE proname = 'rpc_update_branding';
SELECT '✅ Function created + Schema reloaded!' as status;