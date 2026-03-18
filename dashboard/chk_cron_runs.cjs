const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://sjzxgjimbcoqsylrglkm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0');

async function testQuery() {
    console.log("Checking pg_cron runs for expire_unpaid_bookings...");
    const { data: logs, error } = await supabase.rpc('exec_sql', {
        query: `SELECT jobid, command, status, return_message, start_time FROM cron.job_run_details WHERE command LIKE '%expire_pending_bookings%' ORDER BY start_time DESC LIMIT 5;`
    });
    console.log(JSON.stringify(logs, null, 2), "Error:", error);
}

testQuery();
