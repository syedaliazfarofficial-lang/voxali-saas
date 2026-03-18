require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data: adminData } = await supabaseAdmin.from('coin_transactions').select('*');
    console.log('Admin Tx Count:', adminData?.length);

    if (adminData && adminData.length > 0) {
        console.log('Sample Tx:', adminData[0]);
    }
}
check();
