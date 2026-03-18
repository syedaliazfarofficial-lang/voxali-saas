const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://sjzxgjimbcoqsylrglkm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0');

async function checkEmails() {
    console.log("Checking recent notification queue...");
    const { data: qData, error: qErr } = await supabase
        .from('notification_queue')
        .select(`id, status, error_message, created_at, client_name, client_email`)
        .order('created_at', { ascending: false })
        .limit(10);
        
    if (qErr) console.error("Error fetching queue:", qErr);
    else {
    	qData.forEach(q => console.log(`[${q.created_at}] ${q.client_name} (${q.client_email}): ${q.status} -> ${q.error_message}`));
    }
}

checkEmails();
