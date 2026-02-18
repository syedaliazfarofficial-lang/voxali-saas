-- ============================================
-- UPDATED RLS POLICIES FOR RBAC (FIXED)
-- ============================================
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view bookings" ON bookings;
DROP POLICY IF EXISTS "Users can insert bookings" ON bookings;
DROP POLICY IF EXISTS "Users can update bookings" ON bookings;
DROP POLICY IF EXISTS "Users can delete bookings" ON bookings;
DROP POLICY IF EXISTS "Role-based bookings view" ON bookings;
DROP POLICY IF EXISTS "Owner and Manager can create bookings" ON bookings;
DROP POLICY IF EXISTS "Owner and Manager can update bookings" ON bookings;
DROP POLICY IF EXISTS "Only Owner can delete bookings" ON bookings;
DROP POLICY IF EXISTS "Users can view staff" ON staff;
DROP POLICY IF EXISTS "Users can insert staff" ON staff;
DROP POLICY IF EXISTS "Users can update staff" ON staff;
DROP POLICY IF EXISTS "Users can delete staff" ON staff;
DROP POLICY IF EXISTS "Role-based staff view" ON staff;
DROP POLICY IF EXISTS "Only Owner can add staff" ON staff;
DROP POLICY IF EXISTS "Only Owner can update staff" ON staff;
DROP POLICY IF EXISTS "Only Owner can delete staff" ON staff;
-- ============================================
-- BOOKINGS POLICIES (Role-Based) - FIXED
-- ============================================
-- SELECT: Owner & Manager see ALL, Stylist sees ONLY THEIR bookings
CREATE POLICY "Role-based bookings view" ON bookings FOR
SELECT USING (
        -- Owner sees all
        auth.uid() IN (
            SELECT user_id
            FROM profiles
            WHERE role = 'owner'
        )
        OR -- Manager sees all
        auth.uid() IN (
            SELECT user_id
            FROM profiles
            WHERE role = 'manager'
        )
        OR -- Stylist sees only their bookings (using staff_id, NOT stylist_id)
        (
            auth.uid() IN (
                SELECT user_id
                FROM profiles
                WHERE role = 'stylist'
            )
            AND staff_id = (
                SELECT staff_id
                FROM profiles
                WHERE user_id = auth.uid()
            )
        )
    );
-- INSERT: Owner & Manager can create bookings
CREATE POLICY "Owner and Manager can create bookings" ON bookings FOR
INSERT WITH CHECK (
        auth.uid() IN (
            SELECT user_id
            FROM profiles
            WHERE role IN ('owner', 'manager')
        )
    );
-- UPDATE: Owner & Manager can update bookings
CREATE POLICY "Owner and Manager can update bookings" ON bookings FOR
UPDATE USING (
        auth.uid() IN (
            SELECT user_id
            FROM profiles
            WHERE role IN ('owner', 'manager')
        )
    );
-- DELETE: Only Owner can delete bookings
CREATE POLICY "Only Owner can delete bookings" ON bookings FOR DELETE USING (
    auth.uid() IN (
        SELECT user_id
        FROM profiles
        WHERE role = 'owner'
    )
);
-- ============================================
-- STAFF POLICIES (Role-Based)
-- ============================================
-- SELECT: Owner sees all, Manager sees all (read-only), Stylist sees nothing
CREATE POLICY "Role-based staff view" ON staff FOR
SELECT USING (
        auth.uid() IN (
            SELECT user_id
            FROM profiles
            WHERE role IN ('owner', 'manager')
        )
    );
-- INSERT: Only Owner can add staff
CREATE POLICY "Only Owner can add staff" ON staff FOR
INSERT WITH CHECK (
        auth.uid() IN (
            SELECT user_id
            FROM profiles
            WHERE role = 'owner'
        )
    );
-- UPDATE: Only Owner can update staff
CREATE POLICY "Only Owner can update staff" ON staff FOR
UPDATE USING (
        auth.uid() IN (
            SELECT user_id
            FROM profiles
            WHERE role = 'owner'
        )
    );
-- DELETE: Only Owner can delete staff
CREATE POLICY "Only Owner can delete staff" ON staff FOR DELETE USING (
    auth.uid() IN (
        SELECT user_id
        FROM profiles
        WHERE role = 'owner'
    )
);
-- ============================================
-- CLIENTS POLICIES (Role-Based)
-- ============================================
DROP POLICY IF EXISTS "Users can view clients" ON clients;
DROP POLICY IF EXISTS "Users can insert clients" ON clients;
DROP POLICY IF EXISTS "Users can update clients" ON clients;
DROP POLICY IF EXISTS "Users can delete clients" ON clients;
DROP POLICY IF EXISTS "Owner and Manager can view clients" ON clients;
DROP POLICY IF EXISTS "Owner and Manager can add clients" ON clients;
DROP POLICY IF EXISTS "Owner and Manager can update clients" ON clients;
DROP POLICY IF EXISTS "Only Owner can delete clients" ON clients;
-- SELECT: Owner & Manager can view clients
CREATE POLICY "Owner and Manager can view clients" ON clients FOR
SELECT USING (
        auth.uid() IN (
            SELECT user_id
            FROM profiles
            WHERE role IN ('owner', 'manager')
        )
    );
-- INSERT: Owner & Manager can add clients
CREATE POLICY "Owner and Manager can add clients" ON clients FOR
INSERT WITH CHECK (
        auth.uid() IN (
            SELECT user_id
            FROM profiles
            WHERE role IN ('owner', 'manager')
        )
    );
-- UPDATE: Owner & Manager can update clients
CREATE POLICY "Owner and Manager can update clients" ON clients FOR
UPDATE USING (
        auth.uid() IN (
            SELECT user_id
            FROM profiles
            WHERE role IN ('owner', 'manager')
        )
    );
-- DELETE: Only Owner can delete clients
CREATE POLICY "Only Owner can delete clients" ON clients FOR DELETE USING (
    auth.uid() IN (
        SELECT user_id
        FROM profiles
        WHERE role = 'owner'
    )
);
-- ============================================
-- SERVICES POLICIES (All can view, Owner manages)
-- ============================================
DROP POLICY IF EXISTS "Users can view services" ON services;
DROP POLICY IF EXISTS "Users can insert services" ON services;
DROP POLICY IF EXISTS "Users can update services" ON services;
DROP POLICY IF EXISTS "Users can delete services" ON services;
DROP POLICY IF EXISTS "All users can view services" ON services;
DROP POLICY IF EXISTS "Only Owner can manage services" ON services;
-- SELECT: All roles can view services
CREATE POLICY "All users can view services" ON services FOR
SELECT USING (
        auth.uid() IN (
            SELECT user_id
            FROM profiles
        )
    );
-- INSERT/UPDATE/DELETE: Only Owner
CREATE POLICY "Only Owner can manage services" ON services FOR ALL USING (
    auth.uid() IN (
        SELECT user_id
        FROM profiles
        WHERE role = 'owner'
    )
) WITH CHECK (
    auth.uid() IN (
        SELECT user_id
        FROM profiles
        WHERE role = 'owner'
    )
);
-- ============================================
-- PAYMENTS POLICIES (Owner & Manager view)
-- ============================================
DROP POLICY IF EXISTS "Users can view payments" ON payments;
DROP POLICY IF EXISTS "Users can insert payments" ON payments;
DROP POLICY IF EXISTS "Users can update payments" ON payments;
DROP POLICY IF EXISTS "Users can delete payments" ON payments;
DROP POLICY IF EXISTS "Owner and Manager can view payments" ON payments;
DROP POLICY IF EXISTS "Only Owner can manage payments" ON payments;
-- SELECT: Owner & Manager can view
CREATE POLICY "Owner and Manager can view payments" ON payments FOR
SELECT USING (
        auth.uid() IN (
            SELECT user_id
            FROM profiles
            WHERE role IN ('owner', 'manager')
        )
    );
-- INSERT/UPDATE/DELETE: Only Owner
CREATE POLICY "Only Owner can manage payments" ON payments FOR ALL USING (
    auth.uid() IN (
        SELECT user_id
        FROM profiles
        WHERE role = 'owner'
    )
) WITH CHECK (
    auth.uid() IN (
        SELECT user_id
        FROM profiles
        WHERE role = 'owner'
    )
);
-- ============================================
-- BUSINESS SETTINGS (Owner Only)
-- ============================================
DROP POLICY IF EXISTS "Users can view settings" ON business_settings;
DROP POLICY IF EXISTS "Users can update settings" ON business_settings;
DROP POLICY IF EXISTS "Only Owner can view settings" ON business_settings;
DROP POLICY IF EXISTS "Only Owner can update settings" ON business_settings;
CREATE POLICY "Only Owner can view settings" ON business_settings FOR
SELECT USING (
        auth.uid() IN (
            SELECT user_id
            FROM profiles
            WHERE role = 'owner'
        )
    );
CREATE POLICY "Only Owner can update settings" ON business_settings FOR
UPDATE USING (
        auth.uid() IN (
            SELECT user_id
            FROM profiles
            WHERE role = 'owner'
        )
    ) WITH CHECK (
        auth.uid() IN (
            SELECT user_id
            FROM profiles
            WHERE role = 'owner'
        )
    );
-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- List all policies
SELECT schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename,
    policyname;