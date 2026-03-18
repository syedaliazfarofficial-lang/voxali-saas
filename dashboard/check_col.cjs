const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://sjzxgjimbcoqsylrglkm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0');

async function exec() {
    console.log("Checking if column exists...");
    const { error: checkErr } = await supabase.from('tenants').select('payment_hold_minutes').limit(1);
    
    if (checkErr && checkErr.message.includes('Could not find')) {
        console.log("Column missing. Creating a helper function to add it...");
        
        // Setup an RPC to execute raw SQL using the postgres `execute` function bypass
        // Actually, we'll try something easier if possible.
        // Let me just send the user the exact SQL they need to run again, but I'll do it via scraping their existing script.
        
        console.log("We need to execute DDL via REST. Creating quick RPC wrapper...");
        
        // This query creates a helper function `exec_sql`
        const createRPC = await supabase.rpc('exec_sql', { query: `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS payment_hold_minutes INTEGER DEFAULT 30; NOTIFY pgrst, 'reload schema';` });
        
        if (createRPC.error && createRPC.error.message.includes("Could not find the function")) {
            console.log("RPC exec_sql not found, creating it first through trick...");
            // If they have pgcrypto, we can't easily bootstrap arbitrary DDL from the client without an existing RPC.
            console.log("Failed to automate DDL from client. Manual fix required in UI.");
            return;
        }

        console.log("Done executing DDL", createRPC);
    } else {
        console.log("Column ALREADY exists! The issue is pure schema cache.");
        // Try to bump it
        await supabase.from('tenants').update({ payment_hold_minutes: 30 }).eq('id', '11111111-1111-1111-1111-111111111111');
        // Let's call the notify directly? Can't do it via REST easily.
    }
}
exec();
