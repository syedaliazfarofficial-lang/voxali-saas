// DB Migration via postgres direct connection
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { Pool } from 'https://deno.land/x/postgres@v0.17.0/mod.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const DB_URL = Deno.env.get('SUPABASE_DB_URL') || '';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey' };

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

    const results: any[] = [];

    // Method 1: Use postgres direct connection if DB_URL available
    if (DB_URL) {
        const pool = new Pool(DB_URL, 1);
        const client = await pool.connect();
        try {
            const sqls = [
                `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_notification_email text`,
                `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_phone text`,
                `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS low_balance_alert_sent boolean DEFAULT false`,
                `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ai_paused_alert_sent boolean DEFAULT false`,
            ];
            for (const sql of sqls) {
                await client.queryObject(sql);
                results.push(`✅ ${sql}`);
            }
            return new Response(JSON.stringify({ method: 'postgres_direct', results }), { headers: { ...cors, 'Content-Type': 'application/json' } });
        } catch (e: any) {
            results.push(`❌ Error: ${e.message}`);
        } finally {
            client.release();
            await pool.end();
        }
    }

    // Method 2: Supabase Admin API
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Try to read a known column to verify access
    const { data: tenantCheck, error: checkErr } = await supabase
        .from('tenants')
        .select('id, salon_name')
        .limit(1);
    
    results.push({ access_check: checkErr ? `Error: ${checkErr.message}` : `OK - ${tenantCheck?.length} rows` });

    // Since we can't run DDL via REST API, return instructions
    return new Response(JSON.stringify({
        method: 'manual_required',
        results,
        message: 'Run this SQL in Supabase Dashboard → SQL Editor:',
        sql: `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_notification_email text;\nALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_phone text;\nALTER TABLE tenants ADD COLUMN IF NOT EXISTS low_balance_alert_sent boolean DEFAULT false;\nALTER TABLE tenants ADD COLUMN IF NOT EXISTS ai_paused_alert_sent boolean DEFAULT false;`
    }), { headers: { ...cors, 'Content-Type': 'application/json' } });
});
