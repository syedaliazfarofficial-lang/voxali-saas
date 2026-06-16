const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://sjzxgjimbcoqsylrglkm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0');

async function cleanStaffNames() {
    const { data: staff, error } = await supabase.from('staff').select('id, full_name');
    if (error) {
        console.error('Fetch error:', error);
        return;
    }
    
    console.log('Current staff names:');
    for (const member of staff) {
        console.log(`- ID: ${member.id}, Name: "${member.full_name}"`);
        const trimmed = member.full_name.trim();
        if (trimmed !== member.full_name) {
            console.log(`  Updating to: "${trimmed}"`);
            const { error: updateErr } = await supabase
                .from('staff')
                .update({ full_name: trimmed })
                .eq('id', member.id);
            if (updateErr) {
                console.error(`  Failed to update ID ${member.id}:`, updateErr);
            } else {
                console.log(`  Successfully updated!`);
            }
        }
    }
}
cleanStaffNames();
