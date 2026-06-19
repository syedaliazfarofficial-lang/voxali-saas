// DB Migration via postgres direct connection
import { Pool } from 'https://deno.land/x/postgres@v0.17.0/mod.ts';

const DB_URL = Deno.env.get('SUPABASE_DB_URL') || '';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey' };

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

    const results: any[] = [];

    if (!DB_URL) {
        return new Response(JSON.stringify({ success: false, error: 'SUPABASE_DB_URL environment variable is missing.' }), {
            status: 500,
            headers: { ...cors, 'Content-Type': 'application/json' }
        });
    }

    const pool = new Pool(DB_URL, 1);
    const client = await pool.connect();
    try {
        const sqls = [
            `SELECT * FROM staff_timeoff WHERE tenant_id = '5bd5fbd4-cbff-4f69-8fe2-e58939768ae8';`,
            `DELETE FROM staff_timeoff WHERE id = '2abcfd72-9e1e-4ab7-9695-bfd201b0ba79';`
        ];
        
        for (const sql of sqls) {
            const res = await client.queryObject(sql);
            results.push(res.rows);
        }
        
        return new Response(JSON.stringify({ success: true, method: 'postgres_direct', results }), {
            headers: { ...cors, 'Content-Type': 'application/json' }
        });
    } catch (e: any) {
        return new Response(JSON.stringify({ success: false, error: e.message }), {
            status: 500,
            headers: { ...cors, 'Content-Type': 'application/json' }
        });
    } finally {
        client.release();
        await pool.end();
    }
});
