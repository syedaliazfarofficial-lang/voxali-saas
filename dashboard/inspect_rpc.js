import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sjzxgjimbcoqsylrglkm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, role, tenant_id');
    
    if (error) {
        console.error('Error fetching profiles:', error);
    } else {
        console.log('Profiles in DB:', profiles);
    }
}

main();
