import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import "https://deno.land/std@0.168.0/dotenv/load.ts";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') || '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
);

async function check() {
  const { data, error } = await supabase
    .from('notification_queue')
    .select('id, client_name, client_email, event_type, status, error_message, created_at')
    .order('created_at', { ascending: false })
    .limit(3);
  console.log(JSON.stringify(data, null, 2));
}

check();
