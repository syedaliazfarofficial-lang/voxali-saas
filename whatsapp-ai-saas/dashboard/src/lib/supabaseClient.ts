import { createClient } from '@supabase/supabase-js';

// Naye project ki details
const supabaseUrl = 'https://myuqhxicepxnnafxethe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dXFoeGljZXB4bm5hZnhldGhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NDc5NDMsImV4cCI6MjA5MzEyMzk0M30.yPlRtlH9NmMsRaOqPcjYcpMOEsj8PsBHMy4SWSoZNmo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
