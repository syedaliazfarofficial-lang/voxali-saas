const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const supabase = createClient('https://sjzxgjimbcoqsylrglkm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0');

async function runMigration() {
    const query = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20260408000000_enhanced_saas_billing.sql'), 'utf8');
    console.log("Applying Database Schema...");
    const { data, error } = await supabase.rpc('exec_sql', { query });
    if (error) {
        console.error("Migration Error:", error);
    } else {
        console.log("Migration Success:", data);
    }
}

runMigration();
