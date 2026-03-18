const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const supabase = createClient('https://sjzxgjimbcoqsylrglkm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0');

async function test() {
    console.log("Fetching booking to check date...");
    const { data: b } = await supabase.from('bookings').select('*').eq('tenant_id', 'e3c9b32f-7f4c-44b9-b0b6-97b00b7c0288').order('created_at', { ascending: false }).limit(1).single();
    console.log("Latest booking date:", b.start_time);
    
    console.log("Executing queue_tomorrow_reminders()...");
    const { error: e } = await supabase.rpc('queue_tomorrow_reminders');
    console.log("Queue Error (if any):", e);
    
    console.log("Checking notification queue for Aslam...");
    const { data: q } = await supabase.from('notification_queue').select('*').order('created_at', { ascending: false }).limit(2);
    console.log(q);
}
test();
