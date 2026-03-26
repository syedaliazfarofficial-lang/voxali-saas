-- Add standalone public salon reviews table
CREATE TABLE IF NOT EXISTS salon_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE salon_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create salon reviews" 
ON salon_reviews 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Tenants can view their salon reviews" 
ON salon_reviews 
FOR SELECT 
USING (tenant_id = (SELECT tenant_id FROM user_roles WHERE user_id = auth.uid() LIMIT 1));
