const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://sjzxgjimbcoqsylrglkm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0');

async function testQuery() {
    console.log("Checking Bookings for Kashi...");
    const { data: b } = await supabase
        .from('bookings')
        .select('id, created_at, status, clients!inner(name)')
        .eq('clients.name', 'Kashi')
        .order('created_at', { ascending: false });

    console.log(JSON.stringify(b, null, 2));

    console.log("Checking Queue globally descending...");
    const { data: q } = await supabase
        .from('notification_queue')
        .select('id, created_at, event_type, client_name, error_message, status')
        .order('created_at', { ascending: false })
        .limit(3);

    console.log(JSON.stringify(q, null, 2));
}

testQuery();
