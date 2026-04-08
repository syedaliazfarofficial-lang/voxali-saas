import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
    const { data, error } = await supabase.from('tenants').select('vapi_assistant_id').limit(1);
    console.log("Error:", error);
    console.log("Data:", data);
}
test();
