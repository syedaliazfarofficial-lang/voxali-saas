const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://sjzxgjimbcoqsylrglkm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0');

async function test() {
    const { data: cols } = await supabase.rpc('exec_sql', {
        query: `SELECT column_name FROM information_schema.columns WHERE table_name = 'tenants';`
    });
    console.log("Columns in tenants:", JSON.stringify(cols?.slice(0, 15) || []));
    
    // Fallback if rpc fails
    const { data: t } = await supabase.from('tenants').select('*').limit(1);
    console.log("Keys in tenant obj:", t ? Object.keys(t[0]) : "No data");
}
test();
