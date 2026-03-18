const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://sjzxgjimbcoqsylrglkm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0');

async function testQuery() {
    const { data } = await supabase
        .from('bookings')
        .select(`id, created_at, status, clients!inner(name)`)
        .eq('status', 'pending_deposit')
        .eq('clients.name', 'Jani')
        .limit(1);

    if (data && data.length > 0) {
        const created_at = new Date(data[0].created_at);
        const now = new Date();
        const diff_mins = (now - created_at) / 1000 / 60;
        console.log(`Booking created at: ${created_at.toISOString()}`);
        console.log(`Current JS time: ${now.toISOString()}`);
        console.log(`Difference in minutes: ${diff_mins}`);
    } else {
        console.log("No pending booking found for Jani!");
    }
}

testQuery();
