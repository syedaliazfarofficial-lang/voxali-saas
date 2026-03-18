const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const supabase = createClient('https://sjzxgjimbcoqsylrglkm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0');

async function test() {
    console.log("Fetching latest booking...");
    const { data: b } = await supabase.from('bookings').select('*').eq('tenant_id', 'e3c9b32f-7f4c-44b9-b0b6-97b00b7c0288').order('created_at', { ascending: false }).limit(1).single();
    
    // Set booking to tomorrow specifically
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0] + "T10:00:00Z";
    
    console.log("Updating booking date to tomorrow: " + tomorrowStr);
    await supabase.from('bookings').update({ start_time: tomorrowStr, end_time: tomorrowStr, status: 'confirmed' }).eq('id', b.id);
    
    console.log("Executing queue_tomorrow_reminders()...");
    const { error: e } = await supabase.rpc('queue_tomorrow_reminders');
    console.log("Queue Error (if any):", e);
    
    // Wait for edge function to process
    await new Promise(r => setTimeout(r, 2000));
    
    console.log("Checking notification queue for Aslam...");
    const { data: q } = await supabase.from('notification_queue').select('*').order('created_at', { ascending: false }).limit(2);
    console.log(q);
}
test();
