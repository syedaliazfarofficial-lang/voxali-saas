import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing DB credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTenants() {
    const { data, error } = await supabase
        .from("tenants")
        .select("id, name, created_at, elevenlabs_agent_id")
        .order("created_at", { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error fetching tenants:", error);
    } else {
        console.table(data);
    }
}

checkTenants();
