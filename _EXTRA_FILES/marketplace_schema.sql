-- ============================================================
-- VOXALI MARKETPLACE SCHEMA
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. SUBSCRIPTIONS TABLE
-- Tracks which salons have active paid subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('starter', 'pro', 'elite')),
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'cancelled', 'past_due')),
  amount_usd NUMERIC(10,2) NOT NULL,
  country TEXT NOT NULL DEFAULT 'US' CHECK (country IN ('US', 'CA')),
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- 2. SALON_LISTINGS TABLE
-- Public marketplace data for each salon
CREATE TABLE IF NOT EXISTS salon_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,           -- URL slug e.g. "glamaura-beauty-new-york"
  is_public BOOLEAN DEFAULT false,     -- true only when subscription is active
  
  -- Location
  address TEXT,
  city TEXT,
  state TEXT,                          -- e.g. "NY", "CA", "ON", "BC"
  country TEXT DEFAULT 'US' CHECK (country IN ('US', 'CA')),
  zip_code TEXT,
  latitude FLOAT,
  longitude FLOAT,
  google_maps_url TEXT,
  
  -- Business Info
  categories TEXT[] DEFAULT '{}',      -- ['hair', 'nails', 'spa', 'barber']
  phone TEXT,
  website TEXT,
  business_hours JSONB,                -- { "mon": "9:00-18:00", ... }
  
  -- Media
  cover_image_url TEXT,
  gallery_images TEXT[] DEFAULT '{}',
  
  -- Stats (auto-updated)
  avg_rating NUMERIC(3,2) DEFAULT 0,
  total_reviews INT DEFAULT 0,
  total_bookings INT DEFAULT 0,
  
  -- Visibility
  is_featured BOOLEAN DEFAULT false,   -- Admin can feature certain salons
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_salon_listings_tenant ON salon_listings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_salon_listings_public ON salon_listings(is_public);
CREATE INDEX IF NOT EXISTS idx_salon_listings_country ON salon_listings(country);
CREATE INDEX IF NOT EXISTS idx_salon_listings_city ON salon_listings(city);
CREATE INDEX IF NOT EXISTS idx_salon_listings_slug ON salon_listings(slug);

-- 3. CUSTOMER_ACCOUNTS TABLE
-- B2C users who book appointments through marketplace
CREATE TABLE IF NOT EXISTS customer_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  city TEXT,
  state TEXT,
  country TEXT CHECK (country IN ('US', 'CA')),
  avatar_url TEXT,
  auth_user_id UUID UNIQUE,            -- Link to Supabase Auth user
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_accounts_email ON customer_accounts(email);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_auth ON customer_accounts(auth_user_id);

-- 4. SALON_REVIEWS TABLE
-- Customer reviews for salons
CREATE TABLE IF NOT EXISTS salon_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_listing_id UUID NOT NULL REFERENCES salon_listings(id) ON DELETE CASCADE,
  customer_account_id UUID REFERENCES customer_accounts(id),
  booking_id UUID,                     -- Link to bookings table
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  staff_name TEXT,                     -- Which staff they saw
  is_verified BOOLEAN DEFAULT false,   -- Verified booking review
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_salon_reviews_listing ON salon_reviews(salon_listing_id);
CREATE INDEX IF NOT EXISTS idx_salon_reviews_customer ON salon_reviews(customer_account_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE salon_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE salon_reviews ENABLE ROW LEVEL SECURITY;

-- Salon listings: anyone can read public ones
CREATE POLICY "Public can view public listings"
  ON salon_listings FOR SELECT
  USING (is_public = true);

-- Salon owners can see their own listing
CREATE POLICY "Owners can manage their listing"
  ON salon_listings FOR ALL
  USING (tenant_id IN (
    SELECT id FROM tenants WHERE owner_user_id = auth.uid()
  ));

-- Reviews: public can read published reviews
CREATE POLICY "Public can read reviews"
  ON salon_reviews FOR SELECT
  USING (is_published = true);

-- Subscriptions: owners can see their own
CREATE POLICY "Owners can see own subscription"
  ON subscriptions FOR SELECT
  USING (tenant_id IN (
    SELECT id FROM tenants WHERE owner_user_id = auth.uid()
  ));

-- ============================================================
-- HELPER FUNCTION: Auto-update listing visibility
-- When subscription expires, hide from public
-- ============================================================

CREATE OR REPLACE FUNCTION sync_listing_visibility()
RETURNS TRIGGER AS $$
BEGIN
  -- When subscription status changes, update salon_listing.is_public
  UPDATE salon_listings
  SET 
    is_public = (NEW.status = 'active'),
    updated_at = NOW()
  WHERE tenant_id = NEW.tenant_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_sync_listing_visibility
  AFTER INSERT OR UPDATE OF status ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION sync_listing_visibility();

-- ============================================================
-- HELPER FUNCTION: Auto-update avg_rating
-- When new review added, recalculate salon rating
-- ============================================================

CREATE OR REPLACE FUNCTION update_salon_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE salon_listings
  SET 
    avg_rating = (
      SELECT ROUND(AVG(rating)::numeric, 2) 
      FROM salon_reviews 
      WHERE salon_listing_id = NEW.salon_listing_id 
        AND is_published = true
    ),
    total_reviews = (
      SELECT COUNT(*) 
      FROM salon_reviews 
      WHERE salon_listing_id = NEW.salon_listing_id 
        AND is_published = true
    ),
    updated_at = NOW()
  WHERE id = NEW.salon_listing_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_salon_rating
  AFTER INSERT OR UPDATE OF is_published ON salon_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_salon_rating();

-- ============================================================
-- VIEW: Public salon directory (for marketplace API)
-- ============================================================

CREATE OR REPLACE VIEW public_salon_directory AS
SELECT 
  sl.id,
  sl.slug,
  sl.city,
  sl.state,
  sl.country,
  sl.address,
  sl.latitude,
  sl.longitude,
  sl.categories,
  sl.cover_image_url,
  sl.avg_rating,
  sl.total_reviews,
  sl.is_featured,
  t.name AS salon_name,
  t.salon_image_url,
  t.booking_url
FROM salon_listings sl
JOIN tenants t ON t.id = sl.tenant_id
WHERE sl.is_public = true
ORDER BY sl.is_featured DESC, sl.avg_rating DESC;

-- DONE!
-- Next step: Run this SQL in Supabase, then we build Next.js marketplace
