const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndFix() {
  console.log("Checking tenants table schema...");
  
  // 1. Try to fetch a single row with the new column
  const { data, error } = await supabase.from('tenants').select('payment_hold_minutes').limit(1);
  
  if (error && error.message.includes('Could not find')) {
    console.log("Column missing or schema cache dirty. Attempting to add column via RPC...");
    
    // We don't have a direct RPC to run arbitrary SQL, so we'll try something else.
    // Let's create a quick RPC to run the ALTER TABLE.
    console.log("Please run the attached SQL in the Supabase Editor manually, as service role cannot run arbitrary DDL without an RPC.");
  } else if (error) {
    console.log("Other error:", error);
  } else {
    console.log("Data fetched successfully. Column exists!", data);
    
    // Attempting to update it to trigger a schema cache refresh on PostgREST side
    if (data.length > 0) {
        // Just mock update to force cache awareness
        await supabase.from('tenants').update({ payment_hold_minutes: 30 }).eq('id', 'non-existent-id');
        console.log("Mock update performed to bump cache.");
    }
  }
}

checkAndFix();
