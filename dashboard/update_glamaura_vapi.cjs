// Update Glamaura Beauty Salon to use existing Riley assistant from new Vapi account
// and rename/reconfigure it for Glamaura

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://sjzxgjimbcoqsylrglkm.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0';

// Riley assistant from NEW Vapi account (already exists - seen in dashboard screenshot)
const RILEY_ASSISTANT_ID = '9b7b1de9-7fc9-4bf2-9088-4956b86e5eb3';
const GLAMAURA_TENANT_ID = '5bd5fbd4-cbff-4f69-8fe2-e58939768ae8';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log('🔧 Updating Glamaura Beauty Salon with new Vapi account assistant...\n');

  // Step 1: Update tenant vapi_assistant_id
  const { error: tenantErr } = await supabase
    .from('tenants')
    .update({
      vapi_assistant_id: RILEY_ASSISTANT_ID,
      updated_at: new Date().toISOString()
    })
    .eq('id', GLAMAURA_TENANT_ID);

  if (tenantErr) {
    console.error('❌ Tenant update error:', tenantErr.message);
    return;
  }
  console.log('✅ tenants table updated');
  console.log(`   Glamaura vapi_assistant_id → ${RILEY_ASSISTANT_ID}`);

  // Step 2: Update ai_agent_config if it exists
  const { data: aiCfg } = await supabase
    .from('ai_agent_config')
    .select('id')
    .eq('tenant_id', GLAMAURA_TENANT_ID)
    .single();

  if (aiCfg) {
    const { error: cfgErr } = await supabase
      .from('ai_agent_config')
      .update({
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', aiCfg.id);

    if (cfgErr) {
      console.error('❌ ai_agent_config update error:', cfgErr.message);
    } else {
      console.log('✅ ai_agent_config set to active');
    }
  } else {
    // Create ai_agent_config entry
    const { error: insertErr } = await supabase
      .from('ai_agent_config')
      .insert({
        tenant_id: GLAMAURA_TENANT_ID,
        ai_name: 'Bella',
        is_active: true,
        language_override: 'en',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (insertErr) {
      console.error('❌ ai_agent_config insert error:', insertErr.message);
    } else {
      console.log('✅ ai_agent_config created');
    }
  }

  // Step 3: Verify
  const { data: verify } = await supabase
    .from('tenants')
    .select('salon_name, vapi_assistant_id, plan_tier')
    .eq('id', GLAMAURA_TENANT_ID)
    .single();

  console.log('\n📋 VERIFICATION:');
  console.log(`   Salon: ${verify?.salon_name}`);
  console.log(`   Plan:  ${verify?.plan_tier}`);
  console.log(`   Vapi:  ${verify?.vapi_assistant_id}`);
  console.log('\n🎉 Done! Glamaura is now connected to new Vapi account (Riley assistant).');
  console.log('   Next step: update Riley assistant name to "Bella" in Vapi dashboard.');
}

main();
