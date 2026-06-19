import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sjzxgjimbcoqsylrglkm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MzAyOTAsImV4cCI6MjA4NTAwNjI5MH0.Az1hO8pFJcVIpeJJiSMe3MGEu5_u8oHaNqLW2gpBQn4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
    // 1. Log in
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'admin@voxali.net',
        password: 'password'
    });

    if (authErr) {
        console.error('Auth login failed:', authErr.message);
        return;
    }

    console.log('Auth login succeeded. User:', authData.user.email);
    console.log('Session JWT exists:', !!authData.session.access_token);

    const loidaId = '39f9dda4-23ca-4cd2-962e-6e80d8ac89f4';

    // 2. Try to run DELETE on staff_working_hours
    console.log('Attempting to delete Loida\'s working hours...');
    const { data: delData, error: delErr } = await supabase
        .from('staff_working_hours')
        .delete()
        .eq('staff_id', loidaId);

    if (delErr) {
        console.error('DELETE failed:', delErr);
    } else {
        console.log('DELETE succeeded! Data:', delData);
    }

    // 3. Try to run INSERT on staff_working_hours
    console.log('Attempting to insert a working hour record...');
    const record = {
        tenant_id: '5bd5fbd4-cbff-4f69-8fe2-e58939768ae8',
        staff_id: loidaId,
        day_of_week: 1,
        start_time: '09:00:00',
        end_time: '17:00:00'
    };

    const { data: insData, error: insErr } = await supabase
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
