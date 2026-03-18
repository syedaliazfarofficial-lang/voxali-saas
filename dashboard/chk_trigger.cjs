const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://sjzxgjimbcoqsylrglkm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0');

async function testTrigger() {
    console.log("Triggering public.expire_pending_bookings()...");
    const { error } = await supabase.rpc('expire_pending_bookings');
    console.log("RPC Error:", error);

    const { data: b } = await supabase
        .from('bookings')
        .select('id, created_at, status, clients(name)')
        .eq('id', '73a5e70d-1453-4e2d-bdc3-8f612b5c14c1')
        .single();
    
    console.log("Booking Status after trigger:", b.status);
}

testTrigger();
