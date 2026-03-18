const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://sjzxgjimbcoqsylrglkm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0');

async function clearQueue() {
    console.log("Marking old pending items as failed so the queue can proceed...");
    
    // We want to keep Jani's booking which was created just now.
    // Let's just find everything pending except Jani's and mark failed.
    const { data: qData } = await supabase
        .from('notification_queue')
        .select(`id, client_name`)
        .eq('status', 'pending');
        
    for (const q of (qData || [])) {
        if (q.client_name === 'Jani') {
            console.log(`Keeping Jani: ${q.id}`);
            continue;
        }
        console.log(`Marking failed: ${q.id} (${q.client_name})`);
        await supabase.from('notification_queue').update({ status: 'failed', error_message: 'Cleared old stuck item' }).eq('id', q.id);
    }
    console.log("Done clearing old queue.");
    
    // Now trigger the worker for Jani
    console.log("Triggering email worker manually...");
    const res = await fetch('https://sjzxgjimbcoqsylrglkm.supabase.co/functions/v1/send-notification', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0`,
            'Content-Type': 'application/json'
        }
    });
    const text = await res.text();
    console.log("Worker status:", res.status, text);
}

clearQueue();
