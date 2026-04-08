const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEmails() {
    console.log("Checking recent notification queue...");
    const { data: qData, error: qErr } = await supabase
        .from('notification_queue')
        .select(`id, status, error, payload, created_at`)
        .order('created_at', { ascending: false })
        .limit(3);
        
    if (qErr) console.error("Error fetching queue:", qErr);
    else console.log("Recent queue items:", JSON.stringify(qData, null, 2));
}

checkEmails();
