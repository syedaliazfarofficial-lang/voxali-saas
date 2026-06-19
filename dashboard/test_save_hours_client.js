import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sjzxgjimbcoqsylrglkm.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MzAyOTAsImV4cCI6MjA4NTAwNjI5MH0.Az1hO8pFJcVIpeJJiSMe3MGEu5_u8oHaNqLW2gpBQn4';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
    const ownerId = 'ec463e81-29fa-4a51-b376-2ff4b445876a'; // misbah@salon.com
    
    // 1. Reset password
    console.log('Resetting password for misbah@salon.com...');
    const { data: updateData, error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(ownerId, {
        password: 'password'
    });

    if (updateErr) {
        console.error('Password reset failed:', updateErr);
        return;
    }
    console.log('Password reset succeeded.');

    // 2. Log in using anon client
    console.log('Logging in as misbah@salon.com...');
    const { data: authData, error: authErr } = await supabaseAnon.auth.signInWithPassword({
        email: 'misbah@salon.com',
        password: 'password'
    });

    if (authErr) {
        console.error('Auth login failed:', authErr.message);
        return;
    }

    console.log('Auth login succeeded. JWT token loaded in anon client.');

    const loidaId = '39f9dda4-23ca-4cd2-962e-6e80d8ac89f4';

    // 3. Try to delete Loida's working hours
    console.log('Attempting to delete Loida\'s working hours using logged-in anon client...');
    const { data: delData, error: delErr } = await supabaseAnon
        .from('staff_working_hours')
        .delete()
        .eq('staff_id', loidaId);

    if (delErr) {
        console.error('DELETE failed:', delErr);
    } else {
        console.log('DELETE succeeded! Data:', delData);
    }

    // 4. Try to insert working hours
    console.log('Attempting to insert a working hour record using logged-in anon client...');
    const record = {
        tenant_id: '5bd5fbd4-cbff-4f69-8fe2-e58939768ae8',
        staff_id: loidaId,
        day_of_week: 0,
        start_time: '09:00:00',
        end_time: '17:00:00'
    };

    const { data: insData, error: insErr } = await supabaseAnon
        .from('staff_working_hours')
        .insert([record])
        .select();

    if (insErr) {
        console.error('INSERT failed:', insErr);
    } else {
        console.log('INSERT succeeded! Data:', insData);
    }
}

main();
