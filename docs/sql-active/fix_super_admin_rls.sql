-- Fix Super Admin visibility: Allow super_admin to see ALL tenants
-- The existing "Tenant access" policy restricts to single tenant, this override allows super admins full access.
-- First, add Super Admin unrestricted policy on tenants (IF NOT EXISTS)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE tablename = 'tenants'
        AND policyname = 'Super Admin full tenants access'
) THEN EXECUTE $policy$ CREATE POLICY "Super Admin full tenants access" ON public.tenants FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.user_id = auth.uid()
            AND profiles.role = 'super_admin'
    )
);
$policy$;
END IF;
END $$;
-- Also allow super_admin to see ALL profiles (for owner email in tenant list)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE tablename = 'profiles'
        AND policyname = 'Super Admin view all profiles'
) THEN EXECUTE $policy$ CREATE POLICY "Super Admin view all profiles" ON public.profiles FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.profiles sa_profile
            WHERE sa_profile.user_id = auth.uid()
                AND sa_profile.role = 'super_admin'
        )
    );
$policy$;
END IF;
END $$;
SELECT 'Super Admin RLS policies applied!' as status;