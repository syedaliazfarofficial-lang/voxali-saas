-- Insert Super Admin if not exists
DO $$
DECLARE v_user_id UUID := gen_random_uuid();
BEGIN IF NOT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE email = 'super@voxali.com'
) THEN
INSERT INTO auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
    )
VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'super@voxali.com',
        crypt('voxaliadmin', gen_salt('bf')),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"full_name": "Super Admin"}',
        NOW(),
        NOW()
    );
-- Link identity
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
        jsonb_build_object(
            'sub',
            v_user_id::TEXT,
            'email',
            'super@voxali.com'
        ),
        'email',
        v_user_id::TEXT,
        NOW(),
        NOW(),
        NOW()
    );
-- Create super admin profile
INSERT INTO public.profiles (id, user_id, tenant_id, full_name, email, role)
VALUES (
        v_user_id,
        v_user_id,
        (
            SELECT id
            FROM tenants
            LIMIT 1
        ), 'Super Admin', 'super@voxali.com', 'super_admin'
    );
END IF;
END $$;