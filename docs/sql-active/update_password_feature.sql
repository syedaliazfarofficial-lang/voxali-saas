-- ============================================================
-- FEATURE ADDITION: Owner Password Change
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================
-- Function to allow owner/admin to change staff password
CREATE OR REPLACE FUNCTION rpc_change_staff_password(
        p_staff_email TEXT,
        p_new_password TEXT
    ) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN -- Update the user's password in auth.users
UPDATE auth.users
SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
    updated_at = NOW()
WHERE email = p_staff_email;
RETURN jsonb_build_object('success', true);
EXCEPTION
WHEN others THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;