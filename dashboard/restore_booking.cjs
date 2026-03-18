const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const supabase = createClient('https://sjzxgjimbcoqsylrglkm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0');

async function fix() {
    const { data: b } = await supabase.from('bookings').select('*').eq('tenant_id', 'e3c9b32f-7f4c-44b9-b0b6-97b00b7c0288').order('created_at', { ascending: false }).limit(1).single();
    
    // Restore to March 24 1:00 PM EDT => 17:00:00 UTC
    const originalTime = "2026-03-24T17:00:00Z";
    
    console.log("Restoring booking date back to: " + originalTime);
    await supabase.from('bookings').update({ start_time: originalTime, end_time: "2026-03-24T18:00:00Z" }).eq('id', b.id);
}
fix();
