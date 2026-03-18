const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://sjzxgjimbcoqsylrglkm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0');

async function test() {
    // Try Wednesday (March 25) vs Tuesday (March 24)
    const { data: d25, error: e25 } = await supabase.rpc('get_available_slots', { p_tenant_id: 'e3c9b32f-7f4c-44b9-b0b6-97b00b7c0288', p_date: '2026-03-25' });
    const { data: d24, error: e24 } = await supabase.rpc('get_available_slots', { p_tenant_id: 'e3c9b32f-7f4c-44b9-b0b6-97b00b7c0288', p_date: '2026-03-24' });
    
    console.log("March 25th output:");
    console.log("slots count:", d25?.slots_count);
    
    console.log("March 24th output:");
    console.log("slots count:", d24?.slots_count);
    console.log(JSON.stringify(d24, null, 2));
}
test();
