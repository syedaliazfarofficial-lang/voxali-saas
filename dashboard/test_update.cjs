const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://sjzxgjimbcoqsylrglkm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0');

async function testUpdate() {
    console.log("Attempting to update tenant...");
    const { data, error } = await supabase.from('tenants').update({
        cancellation_window_hours: 24,
        late_cancel_refund_percent: 50,
        no_show_refund_percent: 0,
        auto_refund_enabled: true,
        payment_hold_minutes: 30
    }).eq('id', 'e3c9b32f-7f4c-44b9-b0b6-97b00b7c0288');

    if (error) {
        console.error("EXACT ERROR:", JSON.stringify(error, null, 2));
    } else {
        console.log("SUCCESS!", data);
    }
}
testUpdate();
