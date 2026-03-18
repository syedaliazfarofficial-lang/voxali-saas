const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://sjzxgjimbcoqsylrglkm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0');

async function testQuery() {
    console.log("Checking Queue for Kashi...");
    const { data: q } = await supabase
        .from('notification_queue')
        .select('*')
        .eq('client_name', 'Kashi')
        .order('created_at', { ascending: false });

    console.log(JSON.stringify(q, null, 2));

    console.log("Checking PG Cron Jobs...");
    const { data: c } = await supabase.rpc('exec_sql', {
        query: `SELECT * FROM cron.job;`
    });
    console.log(JSON.stringify(c, null, 2));
    
    // Also try to run expire_pending_bookings and see what it does
    console.log("Running expire_pending_bookings()...");
    const { data: res } = await supabase.rpc('expire_pending_bookings');
    console.log("Executed expire_pending_bookings:", res);
    
    const { data: b } = await supabase
        .from('bookings')
        .select('*')
        .eq('status', 'pending_deposit')
        .order('created_at', { ascending: false });
    console.log("Pending bookings still leaving:", JSON.stringify(b.map(x => ({ id: x.id, name: x.client_name, created_at: x.created_at })), null, 2));
}

testQuery();
