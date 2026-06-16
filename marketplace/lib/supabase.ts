import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface SalonListing {
  id: string;
  slug: string;
  salon_name: string;
  city: string;
  state: string;
  country: string;
  address: string;
  latitude?: number;
  longitude?: number;
  categories: string[];
  cover_image_url?: string;
  salon_image_url?: string;
  avg_rating: number;
  total_reviews: number;
  total_bookings: number;
  is_featured: boolean;
  booking_url?: string;
  created_at: string;
}

// ── FEATURED salons (is_featured = true)
export async function getFeaturedSalons(limit = 10): Promise<SalonListing[]> {
  const { data } = await supabase
    .from('public_salon_directory')
    .select('*')
    .eq('is_featured', true)
    .order('avg_rating', { ascending: false })
    .limit(limit);
  return data || [];
}

// ── TRENDING (most bookings + high rating)
export async function getTrendingSalons(limit = 10): Promise<SalonListing[]> {
  const { data } = await supabase
    .from('public_salon_directory')
    .select('*')
    .order('total_bookings', { ascending: false })
    .order('avg_rating', { ascending: false })
    .limit(limit);
  return data || [];
}

// ── NEW (recently joined)
export async function getNewSalons(limit = 10): Promise<SalonListing[]> {
  const { data } = await supabase
    .from('public_salon_directory')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}

// ── ALL with optional filters (global, no country restriction)
export async function getPublicSalons(filters?: {
  country?: string;
  city?: string;
  category?: string;
  q?: string;
  limit?: number;
}): Promise<SalonListing[]> {
  let query = supabase.from('public_salon_directory').select('*');
  if (filters?.country) query = query.eq('country', filters.country);
  if (filters?.city) query = query.ilike('city', `%${filters.city}%`);
  if (filters?.category) query = query.contains('categories', [filters.category]);
  if (filters?.q) query = query.ilike('salon_name', `%${filters.q}%`);
  if (filters?.limit) query = query.limit(filters.limit);
  const { data } = await query.order('avg_rating', { ascending: false });
  return data || [];
}

// ── Single salon by slug
export async function getSalonBySlug(slug: string) {
  const { data } = await supabase
    .from('salon_listings')
    .select(`*, tenants!inner(name, salon_image_url, booking_url)`)
    .eq('slug', slug)
    .eq('is_public', true)
    .single();
  return data;
}
