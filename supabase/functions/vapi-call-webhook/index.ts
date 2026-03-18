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
            // CALL-START: Inject current date/time based on tenant timezone
            // ============================================================
            if (eventType === 'call-start' || eventType === 'assistant-request') {
                const agentIdStart = message.call?.assistantId || message.assistant?.id || '';
                const supabase = getSupabase();

                // Find tenant by vapi_assistant_id
                let tenantTz = 'UTC';
                let tenantName = 'the salon';
                if (agentIdStart) {
                    const { data: tenant } = await supabase
                        .from('tenants')
                        .select('timezone, salon_name')
                        .eq('vapi_assistant_id', agentIdStart)
                        .maybeSingle();
                    if (tenant?.timezone) tenantTz = tenant.timezone;
                    if (tenant?.salon_name) tenantName = tenant.salon_name;
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

                // Determine greeting based on local time
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
                    ``,
                    `## TIME EXPRESSIONS → 24h slot to request`,
                    `- morning / subah / صبح → 09:00`,
                    `- mid-morning / late morning → 11:00`,
                    `- afternoon / dopahar / after lunch → 13:00`,
                    `- evening / shaam / شام → 17:00`,
                    `- night → 19:00`,
                    `- If exact slot unavailable, pick nearest available.`,
                ].join('\n');

                return jsonResponse({
                    assistantOverrides: {
                        firstMessage: `${greeting}, thank you for calling ${tenantName}! Just so you know, today is ${localDate}. This is Aria, your personal beauty concierge. How may I assist you today?`,
                        model: {
                            messages: [
                                {
                                    role: 'system',
                                    content: dateContext
                                }
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
        // Vapi sends duration in seconds sometimes, or we calculate from cost/minutes.
        // Usually `duration` is in seconds.
        const callDuration = callData.duration || 0;

        // Extract tenant_id: URL query param -> assistant_id lookup
        const tenantId = urlTenantId || '';

        if (!conversationId) {
            return errorResponse('Missing call ID (conversation_id)');
        }

        const supabase = getSupabase();
        const recordingUrl = callData.recordingUrl || '';

        // Format transcript for readability
        let formattedTranscript = '';
        if (typeof transcript === 'string') {
            formattedTranscript = transcript;
        } else if (Array.isArray(artifact.messages)) {
            formattedTranscript = artifact.messages
                .map((t: any) => `${t.role === 'model' || t.role === 'assistant' ? '🤖 AI' : '👤 Customer'}: ${t.message}`)
                .join('\n');
        }

        // Determine which actions were taken during the call
        const actionsTaken: string[] = [];
        const lowerTranscript = formattedTranscript.toLowerCase();
        if (lowerTranscript.includes('booking confirmed') || lowerTranscript.includes('booked')) {
            actionsTaken.push('booking_created');
        }
        if (lowerTranscript.includes('cancelled')) {
            actionsTaken.push('booking_cancelled');
        }
        if (lowerTranscript.includes('rescheduled')) {
            actionsTaken.push('booking_rescheduled');
        }
        if (lowerTranscript.includes('waitlist')) {
            actionsTaken.push('added_to_waitlist');
        }

        // Resolve tenant_id: URL -> tenants.vapi_assistant_id -> error
        let finalTenantId = tenantId;
        if (!finalTenantId && agentId) {
            // Look up tenant by their vapi_assistant_id in the tenants table
            const { data: tenantMatch } = await supabase
                .from('tenants')
                .select('id')
                .eq('vapi_assistant_id', agentId)
                .limit(1)
                .single();
            finalTenantId = tenantMatch?.id || '';
        }

        if (!finalTenantId) {
            console.error('Could not resolve tenant_id for assistant_id:', agentId);
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

        if (error) {
            return errorResponse(`Failed to save call log: ${error.message}`, 500);
        }

        // ==========================================
        // Usage Tracking: Coin System (10 Coins per Min)
        // ==========================================
        const minutesConsumed = Math.ceil(callDuration / 60);
        if (minutesConsumed > 0) {
            const coinsToDeduct = minutesConsumed * 10; // 10 coins per AI minute

            // Read current coin balance
            const { data: tenantData } = await supabase
                .from('tenants')
                .select('ai_minutes_used, coin_balance')
                .eq('id', finalTenantId)
                .single();

            const currentMinutes = tenantData?.ai_minutes_used || 0;
            const currentCoins = tenantData?.coin_balance || 0;

            const newMinutes = currentMinutes + minutesConsumed;
            const newCoins = currentCoins - coinsToDeduct;

            // Update usage and deduct coins in DB
            await supabase
                .from('tenants')
                .update({
                    ai_minutes_used: newMinutes,
                    coin_balance: newCoins
                })
                .eq('id', finalTenantId);

            // Create coin transaction log
            await supabase
                .from('coin_transactions')
                .insert({
                    tenant_id: finalTenantId,
                    amount: -coinsToDeduct,
                    transaction_type: 'ai_call',
                    description: `AI Call: ${minutesConsumed} min(s) @ 10 coins/min`
                });

            console.log(`Billed ${minutesConsumed} AI mins. Deducted ${coinsToDeduct} coins. New balance: ${newCoins}. Tenant: ${finalTenantId}`);
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
