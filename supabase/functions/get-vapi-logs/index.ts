// Edge Function: get-vapi-logs
// Fetches call/chat logs directly from Vapi API for a tenant's assistant
// Saves new ones to call_logs table, deducts AI minutes, returns enriched logs

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
        const vapiApiKey = Deno.env.get('VAPI_API_KEY');
        if (!vapiApiKey) return errorResponse('VAPI_API_KEY not configured', 500);

        // Get tenant's Vapi assistant ID
        const { data: tenant } = await supabase
            .from('tenants')
            .select('vapi_assistant_id, salon_name, ai_minutes_used, ai_minutes_included, ai_minutes_topup_balance')
            .eq('id', tenantId)
            .single();

        if (!tenant?.vapi_assistant_id) {
            return jsonResponse({ logs: [], synced: 0, message: 'No Vapi agent configured for this tenant' });
        }

        const assistantId = tenant.vapi_assistant_id;

        // Fetch all calls from Vapi API (last 100)
        const vapiRes = await fetch(
            `https://api.vapi.ai/call?assistantId=${assistantId}&limit=100`,
            { headers: { 'Authorization': `Bearer ${vapiApiKey}` } }
        );

        if (!vapiRes.ok) {
            const err = await vapiRes.json().catch(() => ({}));
            console.error('Vapi API error:', vapiRes.status, JSON.stringify(err));
            return errorResponse(`Vapi API error: ${vapiRes.status}`, 502);
        }

        const vapiCalls: any[] = await vapiRes.json();
        if (!Array.isArray(vapiCalls)) {
            return jsonResponse({ logs: [], synced: 0, message: 'Unexpected Vapi response' });
        }

        // Get existing conversation IDs to avoid duplicates + duplicate billing
        const { data: existingLogs } = await supabase
            .from('call_logs')
            .select('conversation_id')
            .eq('tenant_id', tenantId);

        const existingIds = new Set((existingLogs || []).map((l: any) => l.conversation_id));

        let synced = 0;
        let totalNewMinutes = 0;
        const logsToReturn: any[] = [];

        for (const call of vapiCalls) {
            const callId = call.id || '';
            const callType = call.type || 'webCall'; // webCall | inboundPhoneCall | outboundPhoneCall

            // ✅ Calculate duration from timestamps if durationSeconds is 0 or missing
            const vapiDuration = call.durationSeconds || call.duration || 0;
            const startMs = call.startedAt ? new Date(call.startedAt).getTime() : 0;
            const endMs   = call.endedAt   ? new Date(call.endedAt).getTime()   : 0;
            const tsDuration = (endMs > startMs) ? Math.floor((endMs - startMs) / 1000) : 0;
            const durationSeconds = vapiDuration > 1 ? vapiDuration : tsDuration;

            const callerPhone = call.customer?.number || call.phoneNumber?.number || '';
            const recordingUrl = call.recordingUrl || call.artifact?.recordingUrl || '';
            const status = call.status || 'ended';

            // ✅ Build transcript — EXCLUDE system & tool messages
            let transcript = '';
            if (call.transcript && typeof call.transcript === 'string') {
                transcript = call.transcript;
            } else if (Array.isArray(call.artifact?.messages)) {
                transcript = call.artifact.messages
                    .filter((m: any) =>
                        m.role &&
                        m.message &&
                        m.role !== 'system' &&        // ✅ Filter out system prompt
                        m.role !== 'tool_call' &&
                        m.role !== 'tool_call_result' &&
                        !m.message.startsWith('You are Aria') &&
                        !m.message.includes('tenant_id:')
                    )
                    .map((m: any) => `${m.role === 'assistant' || m.role === 'bot' ? '🤖 Aria' : '👤 Client'}: ${m.message}`)
                    .join('\n');
            } else if (Array.isArray(call.messages)) {
                transcript = call.messages
                    .filter((m: any) =>
                        m.role &&
                        m.content &&
                        m.role !== 'system' &&
                        !m.content.includes('tenant_id:')
                    )
                    .map((m: any) => `${m.role === 'assistant' ? '🤖 Aria' : '👤 Client'}: ${m.content}`)
                    .join('\n');
            }

            // ✅ Clean up artifact transcript too (remove system sections)
            if (transcript) {
                // Remove lines that look like system prompt content
                const lines = transcript.split('\n').filter(line => {
                    const lower = line.toLowerCase();
                    return !lower.includes('you are aria') &&
                           !lower.includes('tenant_id:') &&
                           !lower.includes('who you are & tone') &&
                           !lower.includes('5-star luxury') &&
                           !line.includes('5bd5fbd4') &&
                           !line.trim().startsWith('##') &&
                           !line.trim().startsWith('*') &&
                           !line.trim().startsWith('---');
                });
                transcript = lines.join('\n').trim();
            }

            const summary = call.summary || call.artifact?.summary || '';
            const createdAt = call.createdAt || call.startedAt || new Date().toISOString();
            const endedAt = call.endedAt || call.updatedAt || new Date().toISOString();

            // Determine action from transcript + summary
            const combined = (transcript + ' ' + summary).toLowerCase();
            const actions: string[] = [];
            if (combined.includes('booking confirmed') || combined.includes('appointment confirmed') || combined.includes('booked successfully')) actions.push('booking_created');
            else if (combined.includes('cancel')) actions.push('booking_cancelled');
            else if (combined.includes('rescheduled') || combined.includes('reschedule')) actions.push('booking_rescheduled');
            if (combined.includes('timing') || combined.includes('hours') || combined.includes('open')) actions.push('inquiry_hours');
            if (combined.includes('service') || combined.includes('price') || combined.includes('cost') || combined.includes('fee')) actions.push('inquiry_services');
            const actionStr = actions.join(', ') || (callType === 'webCall' ? 'web_chat' : 'inquiry');

            const displayPhone = callerPhone || (callType === 'webCall' ? 'Web Chat' : 'Unknown Caller');

            const logObj = {
                conversation_id: callId,
                tenant_id: tenantId,
                agent_id: assistantId,
                caller_phone: displayPhone,
                call_duration: durationSeconds,         // ✅ Store seconds correctly
                call_duration_minutes: Math.ceil(durationSeconds / 60),
                transcript,
                transcript_summary: summary,
                recording_url: recordingUrl || null,
                action_taken: actionStr,
                status,
                call_type: callType,                    // ✅ Store call type
                call_ended_at: endedAt,
                created_at: createdAt,
            };

            logsToReturn.push(logObj);

            // ✅ Insert new OR update duration on existing
            if (callId) {
                const isNew = !existingIds.has(callId);

                if (isNew) {
                    // Insert brand new call
                    const { error: insertErr } = await supabase.from('call_logs').insert({
                        tenant_id: tenantId,
                        conversation_id: callId,
                        agent_id: assistantId,
                        caller_phone: displayPhone,
                        call_duration: durationSeconds,
                        transcript,
                        transcript_summary: summary,
                        recording_url: recordingUrl || null,
                        action_taken: actionStr,
                        status,
                        call_ended_at: endedAt,
                    });
                    if (insertErr) console.error('Insert error:', insertErr.message);
                    else {
                        synced++;
                        existingIds.add(callId);
                    }
                } else if (durationSeconds > 0) {
                    // Update duration on existing record (the old issue)
                    await supabase.from('call_logs')
                        .update({ call_duration: durationSeconds, transcript_summary: summary, action_taken: actionStr })
                        .eq('tenant_id', tenantId)
                        .eq('conversation_id', callId)
                        .eq('call_duration', 0);  // only update if was wrongly 0
                }

                if (isNew) {

                    // ✅ Bill AI minutes (idempotent)
                    if (durationSeconds > 0) {
                        const minutesConsumed = Math.ceil(durationSeconds / 60);

                        const { data: dbLog, error: logErr } = await supabase
                            .from('ai_usage_logs')
                            .insert({
                                tenant_id: tenantId,
                                call_id: callId,
                                minutes_used: minutesConsumed,
                                rounded_billable_minutes: minutesConsumed,
                                event_type: callType === 'webCall' ? 'web_chat' : 'inbound_call',
                                idempotency_key: `call_${callId}_bill`,
                                provider_call_id: callId,
                            })
                            .select('id')
                            .maybeSingle();

                        if (!logErr && dbLog) {
                            totalNewMinutes += minutesConsumed;
                            console.log(`Queued billing: ${minutesConsumed} mins for call ${callId}`);
                        }
                    }
                }
            }
        }

        // ✅ Bulk update AI minutes in one DB call
        if (totalNewMinutes > 0) {
            const currentUsed = tenant.ai_minutes_used || 0;
            const newUsed = currentUsed + totalNewMinutes;
            const remaining = ((tenant.ai_minutes_included || 0) + (tenant.ai_minutes_topup_balance || 0)) - newUsed;

            await supabase.from('tenants').update({
                ai_minutes_used: newUsed,
                ai_access_paused: remaining <= 0,
            }).eq('id', tenantId);

            console.log(`Total minutes billed: ${totalNewMinutes}. New total used: ${newUsed}. Remaining: ${remaining}`);

            // ✅ Trigger low-balance / paused alert (fire-and-forget)
            fetch(`${SUPABASE_URL}/functions/v1/send-low-balance-alert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenant_id: tenantId, alert_type: 'check_balance' }),
            }).catch((e: any) => console.warn('Alert trigger error:', e.message));
        }

        return jsonResponse({
            logs: logsToReturn,
            total: logsToReturn.length,
            synced,
            minutes_billed: totalNewMinutes,
            message: `Fetched ${logsToReturn.length} calls, ${synced} new synced, ${totalNewMinutes} mins billed`,
        });

    } catch (e: any) {
        console.error('get-vapi-logs error:', e.message, e.stack);
        return errorResponse(`Server error: ${e.message}`, 500);
    }
});
