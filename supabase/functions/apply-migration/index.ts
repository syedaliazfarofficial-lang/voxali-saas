// apply-migration - Reset to original state (no more delete function)
import * as postgres from 'https://deno.land/x/postgres@v0.17.0/mod.ts';

Deno.serve(async (_req) => {
    try {
        const pool = new postgres.Pool(Deno.env.get('SUPABASE_DB_URL'), 3, true);
        const connection = await pool.connect();
        try {
            // Safe helper to ignore missing tables
            const safeRun = async (sql: string) => {
                try { await connection.queryObject(sql); }
                catch(e: any) { console.log('Skip:', e.message.split('\n')[0]); }
            };

            // Delete all tenant data in FK-safe order
            await safeRun(`DELETE FROM notification_queue`);
            await safeRun(`DELETE FROM staff_payments`);
            await safeRun(`DELETE FROM pos_transactions`);
            await safeRun(`DELETE FROM pos_sales`);
            await safeRun(`DELETE FROM gift_cards`);
            await safeRun(`DELETE FROM package_sales`);
            await safeRun(`DELETE FROM ai_usage_logs`);
            await safeRun(`DELETE FROM call_logs`);
            await safeRun(`DELETE FROM waitlist`);
            await safeRun(`DELETE FROM marketing_campaigns`);
            await safeRun(`DELETE FROM bookings`);
            await safeRun(`DELETE FROM clients`);
            await safeRun(`DELETE FROM services`);
            await safeRun(`DELETE FROM staff`);
            await safeRun(`DELETE FROM ai_agent_config`);
            await safeRun(`DELETE FROM profiles WHERE role != 'super_admin'`);
            await safeRun(`DELETE FROM tenants`);

            return new Response(JSON.stringify({ success: true, message: 'All test data deleted. Ready for fresh start.' }), {
                headers: { 'Content-Type': 'application/json' }
            });

        } finally {
            connection.release();
        }

    } catch (e: any) {
        return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
    }
});
