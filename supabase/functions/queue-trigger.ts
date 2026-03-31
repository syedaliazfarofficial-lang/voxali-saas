import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import "https://deno.land/std@0.168.0/dotenv/load.ts";

async function main() {
    const res = await fetch(Deno.env.get('SUPABASE_URL') + '/rest/v1/rpc/get_function_def', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
            'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
        },
        body: JSON.stringify({ func_name: 'queue_booking_created' })
    });
    
    // Fallback: we can just run a raw query via postgres...
    // But since no pg driver is installed, let's just use the query if there is an rpc.
    console.log(await res.text());
}

main();
