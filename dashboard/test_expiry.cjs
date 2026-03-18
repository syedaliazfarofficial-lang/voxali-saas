const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const supabase = createClient('https://sjzxgjimbcoqsylrglkm.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0');

async function testExpiry() {
    console.log("Checking for a pending_deposit booking to test...");
    
    // Find any pending booking
    const { data: b } = await supabase.from('bookings').select('*').eq('status', 'pending_deposit').order('created_at', { ascending: false }).limit(1).single();
    
    if (!b) {
        console.log("No pending booking found to test.");
        return;
    }
    
    console.log(`Found booking ${b.id} for client_id: ${b.client_id}`);
    
    // Force it to be 31 minutes old
    const oldTime = new Date(Date.now() - 31 * 60000).toISOString();
    console.log(`Setting created_at to 31 minutes ago: ${oldTime}`);
    
    await supabase.from('bookings').update({ created_at: oldTime }).eq('id', b.id);
    
    // Run the expiration logic manually
    console.log("Triggering expire_pending_bookings()...");
    const { error: rpcErr } = await supabase.rpc('expire_pending_bookings');
    if (rpcErr) console.error("RPC Error:", rpcErr);
    
    // Check the new status
    const { data: updated } = await supabase.from('bookings').select('status').eq('id', b.id).single();
    console.log("New Status: ", updated.status);
    
    // Check if notification was queued
    const { data: notif } = await supabase.from('notification_queue').select('*').eq('booking_id', b.id).eq('event_type', 'payment_expired');
    console.log(`Notification queued? ${notif.length > 0 ? "YES" : "NO"}`);
    
}
testExpiry();
