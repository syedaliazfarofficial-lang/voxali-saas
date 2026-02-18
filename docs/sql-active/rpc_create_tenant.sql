-- ============================================================
-- SAAS SUPER ADMIN MIGRATION
-- Run this script in Supabase SQL Editor
-- ============================================================
-- 1. Update profiles role check constraint to include 'super_admin'
ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check CHECK (
        role IN (
            'owner',
            'admin',
            'staff',
            'stylist',
            'receptionist',
            'super_admin'
        )
    );
-- 2. Create RLS policies for Super Admin on 'tenants' table
-- Allow Super Admin to do everything on tenants
CREATE POLICY "Super Admin can do everything on tenants" ON public.tenants FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'super_admin'
    )
);
-- 3. Create RLS policies for Super Admin on 'profiles' table
-- Allow Super Admin to view all profiles
CREATE POLICY "Super Admin can view all profiles" ON public.profiles FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE profiles.user_id = auth.uid()
                AND profiles.role = 'super_admin'
        )
    );
-- 4. Create RLS policies for Super Admin on 'staff' table
-- Allow Super Admin to view all staff
CREATE POLICY "Super Admin can view all staff" ON public.staff FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE profiles.user_id = auth.uid()
                AND profiles.role = 'super_admin'
        )
    );
-- 5. RPC to create a new Tenant and Owner (Transactional)
CREATE OR REPLACE FUNCTION public.rpc_create_tenant_and_owner(
        p_salon_name TEXT,
        p_owner_name TEXT,
        p_owner_email TEXT,
        p_owner_password TEXT
    ) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_tenant_id UUID;
v_user_id UUID;
BEGIN -- Check if executor is super_admin
IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
        AND role = 'super_admin'
) THEN RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
END IF;
-- 1. Create Tenant
INSERT INTO public.tenants (name)
VALUES (p_salon_name)
RETURNING id INTO v_tenant_id;
-- 2. Create Auth User
v_user_id := gen_random_uuid();
INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        aud,
        role
    )
VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        p_owner_email,
        crypt(p_owner_password, gen_salt('bf')),
        NOW(),
        NOW(),
        NOW(),
        jsonb_build_object('provider', 'email', 'providers', ARRAY ['email']),
        jsonb_build_object('full_name', p_owner_name),
        'authenticated',
        'authenticated'
    );
INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    )
VALUES (
        v_user_id,
        v_user_id,
        jsonb_build_object('sub', v_user_id::TEXT, 'email', p_owner_email),
        'email',
        v_user_id::TEXT,
        NOW(),
        NOW(),
        NOW()
    );
-- 3. Create Owner Profile
INSERT INTO public.profiles (
        id,
        user_id,
        tenant_id,
        full_name,
        email,
        role
    )
VALUES (
        v_user_id,
        v_user_id,
        v_tenant_id,
        p_owner_name,
        p_owner_email,
        'owner'
    );
RETURN jsonb_build_object(
    'success',
    true,
    'tenant_id',
    v_tenant_id,
    'user_id',
    v_user_id
);
EXCEPTION
WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;