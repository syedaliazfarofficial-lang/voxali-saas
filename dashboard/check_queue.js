import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://sjzxgjimbcoqsylrglkm.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
  console.error("VITE_SUPABASE_ANON_KEY not found in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkQueue() {
  const { data, error } = await supabase
    .from('notification_queue')
    .select('id, event_type, status, created_at, client_name, booking_id')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error("Error fetching queue:", error);
  } else {
    console.log("Last 10 Queue Entries:");
    data.forEach(d => console.log(`${new Date(d.created_at).toLocaleString()} - ${d.event_type} - ${d.status} - client: ${d.client_name}`));
  }
}

checkQueue();
