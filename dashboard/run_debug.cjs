const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const supabase = createClient('https://sjzxgjimbcoqsylrglkm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0');

async function test() {
    // We can't use db execute, but we can call it via a query if we could...
    // Actually, I can't create a function from JS via Supabase client (only postgres role can do DDL easily, though service role has bypassrls).
    // Let me just construct a SELECT block if possible? No, can't run DO block returning table.
    // Instead of creating a function, I can just query the tables manually in Node exactly as the variables would evaluate.
    
    // Day 2 (Tuesday)
    const { data: tenant } = await supabase.from('tenants').select('*').eq('id', 'e3c9b32f-7f4c-44b9-b0b6-97b00b7c0288').single();
    const { data: tHours } = await supabase.from('tenant_hours').select('*').eq('tenant_id', 'e3c9b32f-7f4c-44b9-b0b6-97b00b7c0288').eq('day_of_week', 2).single();
    
    let v_open_time = tHours?.open_time;
    let v_close_time = tHours?.close_time;
    let v_is_open = tHours?.is_open;
    
    // Wait, the SQL does:
    // SELECT ... INTO v_open_time ...
    // IF NOT FOUND THEN...
    // In PLPGSQL, IF NOT FOUND triggers if zero rows are returned!
    console.log("tHours query:", tHours); // This should be null
    
    if (!tHours) {
        v_open_time = tenant.open_time;
        v_close_time = tenant.close_time;
        v_is_open = true;
    }
    console.log("After fallback - Open:", v_open_time, "Close:", v_close_time, "IsOpen:", v_is_open);
    
    // Now staff
    const { data: sHours } = await supabase.from('staff_working_hours').select('*').eq('tenant_id', 'e3c9b32f-7f4c-44b9-b0b6-97b00b7c0288').eq('staff_id', '8bac5491-43a0-4098-8268-bf14c2501fc3').eq('day_of_week', 2).single();
    console.log("Staff Hours:", sHours);
}
test();
