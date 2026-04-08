// Edge Function: vapi-call-webhook
// Receives end-of-call-report webhook from Vapi.ai
// Saves call recording, transcript, and summary to call_logs table

import { getSupabase, jsonResponse, errorResponse, corsHeaders } from '../_shared/utils.ts';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        const urlTenantId = url.searchParams.get('tenant_id') || '';
        const body = await req.json();

        // Vapi wraps webhook events in a "message" object
        const message = body.message || {};
        const eventType = message.type;

        // We only care about end of call reports for billing and logging
        if (eventType !== 'end-of-call-report') {
            // ============================================================
            // CALL-START / ASSISTANT-REQUEST: Quota Enforcment & System Prompts
            // ============================================================
            if (eventType === 'call-start' || eventType === 'assistant-request') {
                const agentIdStart = message.call?.assistantId || message.assistant?.id || '';
                const callerNumber = message.call?.customer?.number || message.call?.from || '';
                const supabase = getSupabase();

                // Find tenant by vapi_assistant_id
                let tenantTz = 'UTC';
                let tenantName = 'the salon';
                let tenantId = '';
                let clientName = '';
                let tenantData: any = null;

                if (agentIdStart) {
                    const { data: tenant } = await supabase
                        .from('tenants')
                        .select('*')
                        .eq('vapi_assistant_id', agentIdStart)
                        .maybeSingle();
                        
                    if (tenant) {
                        tenantTz = tenant.timezone || 'UTC';
                        tenantName = tenant.salon_name || 'the salon';
                        tenantId = tenant.id;
                        tenantData = tenant;
                    }
                }

                // ============= PHASE 2: AI QUOTA ENFORCEMENT =============
                if (tenantData) {
                    const aiIncluded = tenantData.ai_minutes_included || 0;
                    const aiTopup = tenantData.ai_minutes_topup_balance || 0;
                    const aiUsed = tenantData.ai_minutes_used || 0;
                    const effectiveMinutes = (aiIncluded + aiTopup) - aiUsed;
                    
                    const isPaused = tenantData.ai_access_paused || false;
                    const subStatus = tenantData.subscription_status || 'active';
                    
                    // Allow grace period bypass if substatus is past_due but within grace
                    const isAllowedStatus = ['active', 'trialing', 'past_due'].includes(subStatus);
                    
                    if (!isAllowedStatus || isPaused || effectiveMinutes <= 0) {
                        console.log(`[QUOTA EXHAUSTED] Tenant ${tenantId} has ${effectiveMinutes} mins. Routing to fallback.`);
                        const fallbackPhone = tenantData.fallback_number || tenantData.business_phone || tenantData.phone_number;
                        
                        const msg = fallbackPhone 
                            ? `Thanks for calling ${tenantName}. Our AI receptionist is currently unavailable. Please hold while we route your call.`
                            : `Thanks for calling ${tenantName}. Please leave a message or call back shortly.`;

                        // Reconfigure VAPI agent on-the-fly to become a simple Transfer/Hangup bot
                        return jsonResponse({
                            assistantOverrides: {
                                firstMessage: msg,
                                model: {
                                    messages: [{
                                        role: 'system',
                                        content: fallbackPhone 
                                            ? `You must immediately execute the transfer tool to transfer the call to ${fallbackPhone} without saying anything else.` 
                                            : `You must immediately end the call. Say nothing else.`
                                    }]
                                }
                            }
                        });
                    }
                }

                // Get current date/time in the tenant's local timezone
                const now = new Date();
                const localDate = now.toLocaleDateString('en-US', {
                    timeZone: tenantTz,
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                });
                const localTime = now.toLocaleTimeString('en-US', {
                    timeZone: tenantTz,
                    hour: '2-digit', minute: '2-digit', hour12: true
                });
                // Compute tomorrow correctly from local timezone date parts (avoids UTC date shift issues)
                const todayISO = now.toLocaleDateString('en-CA', { timeZone: tenantTz });
                const [yr2, mo, dy] = todayISO.split('-').map(Number);
                const tomorrowLocal = new Date(yr2, mo - 1, dy + 1);
                const tomorrowISO = tomorrowLocal.toLocaleDateString('en-CA');
                const yr = yr2;

                const localHour = parseInt(now.toLocaleTimeString('en-US', { timeZone: tenantTz, hour: 'numeric', hour12: false }));
                const greeting = localHour < 12 ? 'Good morning' : localHour < 17 ? 'Good afternoon' : 'Good evening';

                const dateContext = [
                    `## ⚠️ LIVE DATE & TIME — FOLLOW EXACTLY, DO NOT GUESS`,
                    `- TODAY: **${localDate}** | ISO: **${todayISO}**`,
                    `- TOMORROW ISO: **${tomorrowISO}**`,
                    `- Time now: ${localTime} (${tenantTz})`,
                    `- Current year: **${yr}** — NEVER use any year before ${yr}.`,
                    ``,
                    `## DATE WORDS (multi-language)`,
                    `- "today" / "aaj" / "aj" → ${todayISO}`,
                    `- "tomorrow" / "tomaro" / "kal" / "next day" → ${tomorrowISO}`,
                    `- Always use YYYY-MM-DD format when calling check_availability.`,
                ].join('\n');

                if (callerNumber && tenantId) {
                    const { data: clientObj } = await supabase
                        .from('clients')
                        .select('name')
                        .eq('tenant_id', tenantId)
                        .eq('phone_number', callerNumber)
                        .maybeSingle();
                        
                    if (clientObj?.name) clientName = clientObj.name;
                }

                const finalGreeting = clientName 
                    ? `${greeting}, ${clientName}! Welcome back to ${tenantName}. How may I assist you today?`
                    : `${greeting}, thank you for calling ${tenantName}. How may I assist you today?`;

                return jsonResponse({
                    assistantOverrides: {
                        firstMessage: finalGreeting,
                        model: {
                            messages: [
                                { role: 'system', content: dateContext }
                            ]
                        }
                    }
                });
            }

            return jsonResponse({ received: true, message: `Ignored event: ${eventType}` });
        }

        const callData = message.call || {};
        const conversationId = callData.id || '';
        const agentId = callData.assistantId || '';
        const status = callData.status || 'completed';

        const artifact = message.artifact || {};
        const transcript = artifact.transcript || '';
        const transcriptSummary = message.summary || '';

        const callerPhone = callData.customer?.number || callData.from || '';
        const callDuration = callData.duration || 0; // seconds

        const tenantId = urlTenantId || '';

        if (!conversationId) {
            return errorResponse('Missing call ID (conversation_id)');
        }

        const supabase = getSupabase();
        const recordingUrl = callData.recordingUrl || '';

        let formattedTranscript = '';
        if (typeof transcript === 'string') {
            formattedTranscript = transcript;
        } else if (Array.isArray(artifact.messages)) {
            formattedTranscript = artifact.messages
                .map((t: any) => `${t.role === 'model' || t.role === 'assistant' ? '🤖 AI' : '👤 Customer'}: ${t.message}`)
                .join('\n');
        }

        const actionsTaken: string[] = [];
        const lowerTranscript = formattedTranscript.toLowerCase();
        if (lowerTranscript.includes('booking confirmed') || lowerTranscript.includes('booked')) actionsTaken.push('booking_created');
        if (lowerTranscript.includes('cancelled')) actionsTaken.push('booking_cancelled');
        if (lowerTranscript.includes('rescheduled')) actionsTaken.push('booking_rescheduled');

        let finalTenantId = tenantId;
        if (!finalTenantId && agentId) {
            const { data: tenantMatch } = await supabase
                .from('tenants')
                .select('id')
                .eq('vapi_assistant_id', agentId)
                .maybeSingle();
            finalTenantId = tenantMatch?.id || '';
        }

        if (!finalTenantId) {
            return errorResponse('Could not resolve tenant for this agent', 400);
        }

        // Save to call_logs
        const { data: callLog, error } = await supabase
            .from('call_logs')
            .insert({
                tenant_id: finalTenantId,
                conversation_id: conversationId,
                agent_id: agentId,
                caller_phone: callerPhone,
                call_duration: callDuration,
                transcript: formattedTranscript,
                transcript_summary: transcriptSummary,
                recording_url: recordingUrl,
                action_taken: actionsTaken.join(', ') || 'inquiry',
                status: status,
                call_ended_at: new Date().toISOString(),
            })
            .select('id')
            .single();

        // ==========================================
        // Usage Tracking: Phase 2 Granular Billing
        // ==========================================
        const minutesConsumed = Math.ceil(callDuration / 60);

        if (minutesConsumed > 0) {
            // First, protect idempotency (Make sure we haven't billed this exact call yet)
            const idempotencyKey = `call_${conversationId}_bill`;
            
            const { data: dbLog, error: logInsertErr } = await supabase
                .from('ai_usage_logs')
                .insert({
                    tenant_id: finalTenantId,
                    call_id: conversationId,
                    minutes_used: minutesConsumed,
                    rounded_billable_minutes: minutesConsumed,
                    event_type: 'inbound_call',
                    idempotency_key: idempotencyKey,
                    provider_call_id: callData.id
                })
                .select('id')
                .maybeSingle();

            if (!logInsertErr && dbLog) {
                // Read current AI limits
                const { data: tenantData } = await supabase
                    .from('tenants')
                    .select('ai_minutes_used, ai_minutes_included, ai_minutes_topup_balance')
                    .eq('id', finalTenantId)
                    .single();

                if (tenantData) {
                    const currentUsed = tenantData.ai_minutes_used || 0;
                    const newUsed = currentUsed + minutesConsumed;

                    const effectiveRemaining = (tenantData.ai_minutes_included + tenantData.ai_minutes_topup_balance) - newUsed;
                    const shouldPause = effectiveRemaining <= 0;

                    // Update usage in DB
                    await supabase
                        .from('tenants')
                        .update({
                            ai_minutes_used: newUsed,
                            ai_access_paused: shouldPause
                        })
                        .eq('id', finalTenantId);
                        
                    console.log(`Billed ${minutesConsumed} AI mins. New Total Used: ${newUsed}. Paused: ${shouldPause}. Tenant: ${finalTenantId}`);
                }
            } else {
                console.log(`Idempotency caught duplicate tracking for call: ${conversationId}`);
            }
        }

        return jsonResponse({
            received: true,
            call_log_id: callLog?.id,
            conversation_id: conversationId,
            recording_saved: !!recordingUrl,
        });
    } catch (e: any) {
        return errorResponse(`Webhook error: ${e.message}`, 500);
    }
});
