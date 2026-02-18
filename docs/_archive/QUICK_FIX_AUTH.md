# Quick Fix Steps for Authentication Issues

## 🚨 Three Issues to Fix

1. ❌ Signup: "Error sending confirmation email"
2. ❌ Profile: Not loading user data  
3. ❌ Dashboard: No bookings showing

---

## ✅ FIX #1: Disable Email Confirmation (2 minutes)

**Supabase nhi recommend karta emails bhejne ke liye bina proper SMTP. Let's disable it temporarily:**

### Steps:
1. Open Supabase Dashboard → https://supabase.com/dashboard
2. Select your project: **Luxe Aurea**
3. Go to: **Authentication** (left sidebar)
4. Scroll down to **"Email Auth"** section
5. **UNCHECK** ☐ "Enable email confirmations"
6. Click **"Save"**

**Result**: Signup will work immediately! ✅

---

## ✅ FIX #2: Create Profiles Table (3 minutes)

### Steps:
1. Supabase Dashboard → **SQL Editor**
2. Click **"New query"**
3. Copy-paste this entire SQL:

```sql
-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'owner',
    full_name TEXT,
    staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'owner'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- For existing users, create profiles
INSERT INTO profiles (user_id, email, full_name, role)
SELECT 
    id, email,
    COALESCE(raw_user_meta_data->>'full_name', email),
    'owner'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM profiles)
ON CONFLICT (user_id) DO NOTHING;
```

4. Click **"Run"** (or press F5)
5. Check result: Should say "Success"

**Result**: Profiles will auto-create for new signups! ✅

---

## ✅ FIX #3: Dashboard Already Fixed! 

I've already updated `Dashboard.jsx` to use `AuthContext` instead of props.

**No action needed** - it will work after you apply Fix #1 and #2! ✅

---

## 🧪 Test Everything (5 minutes)

### Step 1: Logout
- Click **Logout** button in dashboard

### Step 2: Signup New Account
1. Go to `/signup`
2. Fill form:
   - Name: `Test User`  
   - Email: `test@example.com`
   - Password: `Test1234`
3. Click **Sign Up**

**Expected**: ✅ Success! Auto-login to dashboard

### Step 3: Check Dashboard
- Should show your name in header ("Test User")
- Profile should load
- Bookings may be empty (that's OK)

### Step 4: Check Profile
- Click on "User" dropdown (top-right)
- Click "My Profile"
- Should NOT show "Profile page coming soon!"
- Should show your data

---

## ⏱️ Total Time: ~10 minutes

1. Disable email confirmation (2 min) ✅
2. Run SQL for profiles (3 min) ✅
3. Test signup + login (5 min) ✅

---

## 🚨 If Still Issues

**Issue**: Email confirmation still required
- **Fix**: Make sure you clicked "Save" after unchecking email confirmation

**Issue**: Profile still not loading
- **Fix**: Check SQL ran successfully. View `profiles` table in Supabase Table Editor

**Issue**: Dashboard still showing "User authenticated"  
- **Fix**: Logout and login again. Profile should load fresh

---

**Chalo fix karte hain! 🚀**
