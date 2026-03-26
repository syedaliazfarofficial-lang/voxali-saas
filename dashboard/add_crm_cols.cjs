const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://sjzxgjimbcoqsylrglkm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function addColumns() {
    const query = `
        ALTER TABLE public.clients 
        ADD COLUMN IF NOT EXISTS notes TEXT,
        ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
    `;
    const { data, error } = await supabase.rpc('exec_sql', { query });
    if (error) {
        console.error("SQL Error:", error);
    } else {
        console.log("Columns added successfully:", data);
    }
}

addColumns();
