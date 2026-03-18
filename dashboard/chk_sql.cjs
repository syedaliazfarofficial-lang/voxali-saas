const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://sjzxgjimbcoqsylrglkm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0');

async function testQuery() {
    const { data, error } = await supabase.rpc('exec_sql', {
        query: `
        SELECT
            b.id as booking_id,
            b.created_at,
            t.payment_hold_minutes,
            NOW() - make_interval(mins => COALESCE(t.payment_hold_minutes, 30)) as threshold
        FROM bookings b
        JOIN tenants t ON b.tenant_id = t.id
        JOIN clients c ON b.client_id = c.id
        WHERE b.status = 'pending_deposit'
          AND c.name = 'Jani'
        `
    });

    console.log(JSON.stringify(data, null, 2), "Error:", error);
}

testQuery();
