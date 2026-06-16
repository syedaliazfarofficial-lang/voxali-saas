const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://sjzxgjimbcoqsylrglkm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0'
);

async function main() {
  // Get Glamaura Beauty Salon tenant info
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('id, salon_name, vapi_assistant_id, vapi_phone_number_id, plan_tier')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log('=== TENANTS ===');
  tenants.forEach(t => {
    console.log(`\nSalon: ${t.salon_name}`);
    console.log(`  ID: ${t.id}`);
    console.log(`  Plan: ${t.plan_tier}`);
    console.log(`  Vapi Assistant ID: ${t.vapi_assistant_id || 'NOT SET'}`);
    console.log(`  Vapi Phone Number ID: ${t.vapi_phone_number_id || 'NOT SET'}`);
  });

  // Also check ai_agent_config
  const { data: aiCfg } = await supabase
    .from('ai_agent_config')
    .select('tenant_id, ai_name, is_active, language_override')
    .order('created_at', { ascending: false });

  console.log('\n=== AI AGENT CONFIG ===');
  (aiCfg || []).forEach(c => {
    console.log(`Tenant: ${c.tenant_id} | AI: ${c.ai_name} | Active: ${c.is_active} | Lang: ${c.language_override}`);
  });
}

main();
