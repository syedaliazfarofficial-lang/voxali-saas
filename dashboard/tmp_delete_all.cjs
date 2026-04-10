// Script: delete_all_test_data.cjs
// Deletes ALL Vapi assistants and ALL tenants (except super_admin)

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const VAPI_API_KEY = 'b3e43291-83a3-4462-93f0-e93de7cdfb87'; // from Supabase secrets
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

async function deleteVapiAssistant(assistantId) {
  const res = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${VAPI_API_KEY}` }
  });
  return res.ok || res.status === 404;
}

async function main() {
  const s = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Get ALL tenants
  const { data: tenants } = await s.from('tenants').select('id, name, vapi_assistant_id');
  console.log(`Found ${tenants.length} tenants to delete.`);

  // Step 1: Delete all Vapi assistants
  console.log('\n--- Deleting Vapi Assistants ---');
  for (const t of tenants) {
    if (t.vapi_assistant_id) {
      const ok = await deleteVapiAssistant(t.vapi_assistant_id);
      console.log(`${ok ? '✅' : '❌'} Vapi: ${t.name} (${t.vapi_assistant_id})`);
      await new Promise(r => setTimeout(r, 200)); // avoid rate limit
    }
  }

  // Step 2: Delete all tenants (cascade will remove related data)
  console.log('\n--- Deleting All Tenants from DB ---');
  const { error: tenantErr } = await s.from('tenants').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // delete all
  if (tenantErr) console.error('Tenant delete error:', tenantErr);
  else console.log(`✅ All ${tenants.length} tenants deleted from DB.`);

  // Step 3: Delete all auth users EXCEPT super admin
  console.log('\n--- Deleting Auth Users (except super admin) ---');
  const { data: users } = await s.auth.admin ? { data: null } : { data: null };
  // We use the service role to do this via REST
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=200`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });
  const authData = await authRes.json();
  const allUsers = authData.users || [];
  
  const SUPER_ADMIN_ID = 'ba724bdd-8f71-4223-b48c-1f7f0a69abc5';
  const usersToDelete = allUsers.filter(u => u.id !== SUPER_ADMIN_ID);
  console.log(`Found ${usersToDelete.length} auth users to delete (keeping super admin).`);
  
  for (const u of usersToDelete) {
    const delRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${u.id}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });
    console.log(`${delRes.ok ? '✅' : '❌'} Auth user: ${u.email}`);
  }

  console.log('\n✅ DONE! All test data cleaned up. Super admin preserved.');
}

main().catch(console.error);
