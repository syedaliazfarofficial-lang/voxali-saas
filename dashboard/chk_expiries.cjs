const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://sjzxgjimbcoqsylrglkm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0');

async function checkExpiries() {
    console.log("Checking expired bookings...");
    const { data: b } = await supabase
        .from('bookings')
        .select(`id, status, created_at, clients!inner(name)`)
        .in('clients.name', ['Jani', 'Kashi'])
        .order('created_at', { ascending: false })
        .limit(4);
        
    console.log(JSON.stringify(b, null, 2));

    console.log("Checking expiry notifications...");
    const { data: q } = await supabase
        .from('notification_queue')
        .select(`id, event_type, status, client_name, created_at`)
        .eq('event_type', 'payment_expired')
        .order('created_at', { ascending: false })
        .limit(3);
    
    console.log(JSON.stringify(q, null, 2));
}

checkExpiries();
