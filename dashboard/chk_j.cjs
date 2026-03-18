const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://sjzxgjimbcoqsylrglkm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0');

async function testJoin() {
    console.log("Testing join logic for Jani...");
    const { data, error } = await supabase
        .from('bookings')
        .select(`
            id,
            status,
            created_at,
            client_id,
            service_id,
            tenant_id,
            stylist_id,
            clients!inner(name),
            services(id),
            tenants(id, payment_hold_minutes)
        `)
        .eq('status', 'pending_deposit')
        .eq('clients.name', 'Jani')
        .limit(1);

    console.log(JSON.stringify(data, null, 2));
    console.log("Error:", error);
}

testJoin();
