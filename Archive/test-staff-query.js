const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('', '');

async function testQuery() {
    const tenantId = '67244f82-65ae-44cf-8ca8-63017b60789d';
    const { data: staff, error } = await supabase
        .from('staff')
        .select('*')
        .eq('tenant_id', tenantId);
        
    console.log('Error:', error);
    console.log('Staff Data:', staff);
}
testQuery();
