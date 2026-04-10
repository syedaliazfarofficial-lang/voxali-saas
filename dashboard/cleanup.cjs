// cleanup.cjs - Delete all test data from Voxali
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const TOOLS_KEY = 'LUXE-AUREA-SECRET-2026';

const sql = `
DELETE FROM notification_queue;
DELETE FROM staff_payments;
DELETE FROM pos_transactions;
DELETE FROM gift_cards;
DELETE FROM package_sales;
DELETE FROM bookings;
DELETE FROM clients;
DELETE FROM services;
DELETE FROM staff;
DELETE FROM ai_usage_logs;
DELETE FROM call_logs;
DELETE FROM ai_agent_config;
DELETE FROM waitlist;
DELETE FROM marketing_campaigns;
DELETE FROM profiles WHERE role != 'super_admin';
DELETE FROM tenants;
`;

async function main() {
  console.log('Running cascade delete via apply-migration...');
  
  const res = await fetch(SUPABASE_URL + '/functions/v1/apply-migration', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-TOOLS-KEY': TOOLS_KEY,
      'Authorization': 'Bearer ' + ANON_KEY
    },
    body: JSON.stringify({ sql })
  });
  
  const d = await res.json();
  console.log('Result:', JSON.stringify(d, null, 2));
  
  // Verify
  const s = createClient(SUPABASE_URL, ANON_KEY);
  const { data: remaining } = await s.from('tenants').select('id');
  console.log('Remaining tenants:', remaining ? remaining.length : 'error');
  
  // Also delete auth users except super admin
  console.log('Deleting auth users (except super admin)...');
  const authRes = await fetch(SUPABASE_URL + '/auth/v1/admin/users?page=1&per_page=200', {
    headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + ANON_KEY }
  });
  const authData = await authRes.json();
  const users = authData.users || [];
  const SUPER_ADMIN = 'ba724bdd-8f71-4223-b48c-1f7f0a69abc5';
  const toDelete = users.filter(u => u.id !== SUPER_ADMIN);
  console.log('Auth users to delete:', toDelete.length);
  
  for (const u of toDelete) {
    const dr = await fetch(SUPABASE_URL + '/auth/v1/admin/users/' + u.id, {
      method: 'DELETE',
      headers: { 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + ANON_KEY }
    });
    console.log(dr.ok ? '✅' : '❌ ' + dr.status, u.email);
  }
  
  console.log('\nDONE! Database cleaned. Super admin preserved.');
}

main().catch(console.error);
