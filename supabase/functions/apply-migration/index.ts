// apply-migration
import * as postgres from 'https://deno.land/x/postgres@v0.17.0/mod.ts';

Deno.serve(async (req) => {
    // No auth check for temporary migration script

    try {
        const pool = new postgres.Pool(Deno.env.get('SUPABASE_DB_URL'), 3, true);
        const connection = await pool.connect();
        try {
            // Run the migration
            await connection.queryObject`
                ALTER TABLE tenants
                ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'starter',
                ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
                ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
                ADD COLUMN IF NOT EXISTS twilio_phone_number TEXT,
                ADD COLUMN IF NOT EXISTS elevenlabs_agent_id TEXT,
                ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
            `;

            await connection.queryObject`
                ALTER TABLE tenants
                ADD COLUMN IF NOT EXISTS ai_minutes_used INTEGER DEFAULT 0,
                ADD COLUMN IF NOT EXISTS sms_used INTEGER DEFAULT 0,
                ADD COLUMN IF NOT EXISTS emails_used INTEGER DEFAULT 0;
            `;

            await connection.queryObject`
                ALTER TABLE tenants
                ADD COLUMN IF NOT EXISTS plan_ai_minutes_limit INTEGER DEFAULT 150,
                ADD COLUMN IF NOT EXISTS plan_sms_limit INTEGER DEFAULT 200,
                ADD COLUMN IF NOT EXISTS plan_email_limit INTEGER DEFAULT 500;
            `;

            return new Response(JSON.stringify({ success: true, message: 'Migration applied successfully' }), {
                headers: { 'Content-Type': 'application/json' }
            });

        } finally {
            connection.release();
        }

    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: e.message }), { status: 500 });
    }
});
