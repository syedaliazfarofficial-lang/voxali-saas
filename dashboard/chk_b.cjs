const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://sjzxgjimbcoqsylrglkm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0');

async function triggerExpiry() {
    console.log("Triggering expire_pending_bookings manually...");
    const { data, error } = await supabase.rpc('expire_pending_bookings');
    console.log("Result:", data, "Error:", error);
    
    console.log("Checking booked status for Jani again...");
    const { data: qData } = await supabase
        .from('bookings')
        .select(`id, status, created_at, clients!inner(name)`)
        .eq('clients.name', 'Jani')
        .order('created_at', { ascending: false })
        .limit(1);
    console.log(JSON.stringify(qData, null, 2));
}

triggerExpiry();
