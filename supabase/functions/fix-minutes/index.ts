// One-time fix: Recalculate AI minutes used from existing call_logs
// and update tenants.ai_minutes_used correctly
// Run via: npx supabase functions deploy fix-minutes --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { jsonResponse, errorResponse, handleCORS } from '../_shared/utils.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return handleCORS();

    try {
        let body: any = {};
        try { body = await req.json(); } catch { }

        const url = new URL(req.url);
        const tenantId = body.tenant_id || url.searchParams.get('tenant_id') || '';
        if (!tenantId) return errorResponse('Missing tenant_id');

        const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

        // Get all call_logs for this tenant with their durations
        const { data: callLogs, error: logsErr } = await supabase
            .from('call_logs')
            .select('conversation_id, call_duration, created_at')
            .eq('tenant_id', tenantId)
            .gt('call_duration', 0);

        if (logsErr) return errorResponse('DB error: ' + logsErr.message);

        const logs = callLogs || [];

        // Calculate total seconds and minutes
        const totalSeconds = logs.reduce((sum: number, l: any) => sum + (l.call_duration || 0), 0);
        const totalMinutes = Math.ceil(totalSeconds / 60);

        console.log(`Tenant ${tenantId}: ${logs.length} calls, ${totalSeconds} seconds, ${totalMinutes} minutes`);

        // Clear old ai_usage_logs for this tenant and re-insert
        await supabase.from('ai_usage_logs').delete().eq('tenant_id', tenantId);

        // Re-insert usage logs for each call
        let billableMinutes = 0;
        for (const log of logs) {
            const mins = Math.ceil((log.call_duration || 0) / 60);
            if (mins <= 0) continue;
            billableMinutes += mins;

            await supabase.from('ai_usage_logs').insert({
                tenant_id: tenantId,
                call_id: log.conversation_id,
                minutes_used: mins,
                rounded_billable_minutes: mins,
                event_type: 'web_chat',
                idempotency_key: `call_${log.conversation_id}_bill_v2`,
                provider_call_id: log.conversation_id,
            }).maybeSingle();
        }

        // Update the tenant's ai_minutes_used
        const { data: tenant } = await supabase
            .from('tenants')
            .select('ai_minutes_included, ai_minutes_topup_balance')
            .eq('id', tenantId)
            .single();

        const included = tenant?.ai_minutes_included || 0;
        const topup = tenant?.ai_minutes_topup_balance || 0;
        const remaining = (included + topup) - billableMinutes;

        const { error: updateErr } = await supabase
            .from('tenants')
            .update({
                ai_minutes_used: billableMinutes,
                ai_access_paused: remaining <= 0,
            })
            .eq('id', tenantId);

        if (updateErr) return errorResponse('Update error: ' + updateErr.message);

        // ✅ Trigger low-balance alert check after billing
        try {
            await fetch(`${SUPABASE_URL}/functions/v1/send-low-balance-alert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenant_id: tenantId, alert_type: 'check_balance' }),
            });
        } catch (alertErr: any) {
            console.warn('Alert trigger failed:', alertErr.message);
        }

        return jsonResponse({
            calls_processed: logs.length,
            total_seconds: totalSeconds,
            total_minutes_billed: billableMinutes,
            remaining_minutes: remaining,
            message: `✅ Fixed! ${billableMinutes} minutes deducted from ${logs.length} calls.`,
        });

    } catch (e: any) {
        return errorResponse(`Server error: ${e.message}`, 500);
    }
});
