const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://sjzxgjimbcoqsylrglkm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0');

async function test() {
    const { data: bHours, error: e1 } = await supabase.from('business_hours').select('*').eq('tenant_id', 'e3c9b32f-7f4c-44b9-b0b6-97b00b7c0288');
    console.log("Business Hours:\n", bHours);
    
    const { data: sHours, error: e2 } = await supabase.from('staff_working_hours').select('*').eq('tenant_id', 'e3c9b32f-7f4c-44b9-b0b6-97b00b7c0288').eq('staff_id', '8bac5491-43a0-4098-8268-bf14c2501fc3');
    console.log("Staff Hours:\n", sHours);
}
test();
