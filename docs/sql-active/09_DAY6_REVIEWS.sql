-- ==============================================================================
-- Migration: Add salon_reviews table for Automated Review Management (Day 6)
-- ==============================================================================

-- 1. Create the salon_reviews table
CREATE TABLE IF NOT EXISTS salon_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) NOT NULL,
    booking_id UUID REFERENCES bookings(id), -- Optional: If feedback is tied to a specific booking
    client_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_public BOOLEAN DEFAULT false, -- Whether the owner approved it to show on public profile
    replied_text TEXT, -- Optional: Salon owner reply
    replied_at TIMESTAMPTZ
);

-- 2. Enable Row Level Security
ALTER TABLE salon_reviews ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Policy: Super Admin full access
CREATE POLICY "Super Admin full access on salon_reviews" ON salon_reviews
FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'super_admin')
) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'super_admin')
);

-- Policy: Tenants can view and manage their own reviews
CREATE POLICY "Tenants full access to own reviews" ON salon_reviews
FOR ALL USING (
    tenant_id = get_my_tenant_id()
) WITH CHECK (
    tenant_id = get_my_tenant_id()
);

-- Policy: Anonymous users can insert reviews (Public Feedback Form)
CREATE POLICY "anon_reviews_insert" ON salon_reviews
FOR INSERT WITH CHECK (true);

-- Policy: Anonymous users can read public reviews (for public profile pages later)
CREATE POLICY "anon_reviews_read_public" ON salon_reviews
FOR SELECT USING (is_public = true);
