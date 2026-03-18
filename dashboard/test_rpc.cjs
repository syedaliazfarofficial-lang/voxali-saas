const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://sjzxgjimbcoqsylrglkm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0');

async function test() {
    const rpcParams = {
        p_tenant_id: 'e3c9b32f-7f4c-44b9-b0b6-97b00b7c0288',
        p_date: '2026-03-24'
    };
    const { data: slots, error: e1 } = await supabase.rpc('get_available_slots', rpcParams);
    console.log("Error:", e1);
    console.log("Slots:", JSON.stringify(slots, null, 2));
}
test();
