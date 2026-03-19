import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const TOOLS_KEY = 'LUXE-AUREA-SECRET-2026';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TWILIO_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
const TWILIO_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') || '';

async function sendSMS(toPhone: string, body: string, fromPhone: string): Promise<{ success: boolean; error?: string }> {
    if (!TWILIO_SID || !TWILIO_TOKEN) return { success: false, error: 'Twilio not configured globally' };
    try {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ To: toPhone, From: fromPhone, Body: body }),
        });
        if (!res.ok) {
            const err = await res.json();
            return { success: false, error: err.message || `Twilio HTTP ${res.status}` };
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });

    const key = req.headers.get('x-tools-key') || req.headers.get('X-TOOLS-KEY');
    if (key !== TOOLS_KEY) {
        return new Response(JSON.stringify({ error: "Unauthorized AI Tool Access" }), { status: 401 });
    }

    try {
        const { tenant_id, caller_phone, issue_summary } = await req.json();

        if (!tenant_id || !caller_phone) {
            return new Response(JSON.stringify({ error: "Missing required fields (tenant_id or caller_phone)" }), { status: 400 });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        // 1. Fetch AI config for escalation_phone
        const { data: config } = await supabase
            .from('ai_agent_config')
            .select('escalation_phone')
            .eq('tenant_id', tenant_id)
            .single();

        if (!config?.escalation_phone) {
            return new Response(JSON.stringify({ 
                success: false, 
                message: "Salon owner has not configured a Human Handoff SMS number. Just tell the user you cannot escalate right now." 
            }), { status: 400 });
        }

        // 2. Fetch tenant Twilio number and Coin balance
        const { data: tenant } = await supabase
            .from('tenants')
            .select('twilio_phone_number, salon_name, coin_balance')
            .eq('id', tenant_id)
            .single();

        if (!tenant?.twilio_phone_number) {
            return new Response(JSON.stringify({ 
                success: false, 
                message: "Salon Twilio number not configured or missing." 
            }), { status: 400 });
        }

        const currentCoins = tenant.coin_balance || 0;
        if (currentCoins < 2) {
            return new Response(JSON.stringify({ 
                success: false, 
                message: "Salon has insufficient coins for SMS fallback. Tell the user we cannot escalate right now." 
            }), { status: 400 });
        }

        // 3. Send SMS to the Escalation Phone (the Salon Owner)
        const smsBody = `🚨 Voxali Alert: A customer is requesting Human Handoff!\n\nCaller: ${caller_phone}\nReason: ${issue_summary || 'Customer requested a manager'}\n\nPlease call them back as soon as possible.`;
        const smsResult = await sendSMS(config.escalation_phone, smsBody, tenant.twilio_phone_number);

        if (!smsResult.success) {
            return new Response(JSON.stringify({ 
                success: false, 
                message: `Failed to deliver SMS to manager: ${smsResult.error}` 
            }), { status: 500 });
        }

        // 4. Deduct 2 Coins for SMS
        await supabase.from('tenants').update({
            coin_balance: currentCoins - 2
        }).eq('id', tenant_id);

        await supabase.from('coin_transactions').insert({
            tenant_id: tenant_id,
            amount: -2,
            transaction_type: 'sms',
            description: `AI Handoff Escalation SMS to Manager`
        });

        // 5. Success reply to AI
        return new Response(JSON.stringify({ 
            success: true, 
            message: "SMS has been successfully sent to the salon manager. You can safely inform the caller that a manager will reach out shortly, and then politely end the call." 
        }), { status: 200 });

    } catch (e: any) {
        console.error("Escalate Tool Error:", e);
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
});
