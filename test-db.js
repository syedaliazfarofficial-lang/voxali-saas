const { createClient } = require('@supabase/supabase-js');
const url = process.env.VITE_SUPABASE_URL || 'https://sjzxgjimbcoqsylrglkm.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0';

const supabase = createClient(url, key);

async function testQuery() {
    const { data: client, error: cErr } = await supabase.from('clients').select('*').eq('name', 'Kashi');
    const { data: booking, error: bErr } = await supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(3);
    const { data: notif, error: nErr } = await supabase.from('notification_queue').select('*').order('created_at', { ascending: false }).limit(3);
        
    console.log('Clients:', client);
    console.log('Recent Bookings:', booking);
    console.log('Recent Notifications:', notif);
}
testQuery();
