-- ============================================================
-- NUCLEAR FIX: RESET TRIGGERS AND RLS
-- Run this to clear "Database error querying schema" ONCE AND FOR ALL
-- ============================================================
-- 1. DROP ALL TRIGGERS on auth.users (to stop rogue execution on login)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;
-- 2. Clean up the function
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$ BEGIN
INSERT INTO public.profiles (id, user_id, email, full_name, role)
VALUES (
        NEW.id,
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'owner'
    ) ON CONFLICT (id) DO
UPDATE
SET user_id = NEW.id,
    email = NEW.email;
RETURN NEW;
END;
$$;
-- 3. Re-create Trigger ONLY for INSERT (NOT UPDATE / LOGIN)
CREATE TRIGGER on_auth_user_created
AFTER
INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
-- 4. NUCLEAR RLS RESET: Allow everything for authenticated users
-- This removes complexity to ensure login works.
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_view_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_authenticated_all" ON profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- 5. Reload Schema
NOTIFY pgrst,
'reload schema';