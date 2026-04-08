import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: './supabase/.env' });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing env variables');
  process.exit();
}
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('notification_queue')
    .select('id, client_name, event_type, status, error_message, created_at')
    .order('created_at', { ascending: false })
    .limit(2);
  console.log(JSON.stringify(data, null, 2));
}

check();
