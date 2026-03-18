const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const supabase = createClient('https://sjzxgjimbcoqsylrglkm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0');

async function runSQL() {
    const query = fs.readFileSync('../process_queue_cron.sql', 'utf8');
    console.log("Running crons...");
    const { data, error } = await supabase.rpc('exec_sql', { query });
    console.log("Result:", data, "Error:", error);
}

runSQL();
