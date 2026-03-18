const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://sjzxgjimbcoqsylrglkm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0');

async function testQuery() {
    console.log("Fetching booking 73a5e70d...");
    const { data: b } = await supabase
        .from('bookings')
        .select('id, created_at, status, tenant_id, tenants(payment_hold_minutes)')
        .eq('id', '73a5e70d-1453-4e2d-bdc3-8f612b5c14c1')
        .single();
    
    console.log(JSON.stringify(b, null, 2));

    const created_at = new Date(b.created_at);
    const now = new Date();
    const diff_mins = (now - created_at) / 1000 / 60;
    const payment_hold_minutes = b.tenants.payment_hold_minutes;

    console.log(`Created at: ${created_at.toISOString()}`);
    console.log(`Now: ${now.toISOString()}`);
    console.log(`Diff mins: ${diff_mins}`);
    console.log(`Hold mins from DB: ${payment_hold_minutes}`);
    console.log(`Should Expire?: ${diff_mins >= payment_hold_minutes}`);
}

testQuery();
