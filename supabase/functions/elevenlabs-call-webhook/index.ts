// Edge Function: elevenlabs-call-webhook
// Receives post_call_transcription webhook from ElevenLabs
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
        const eventType = body.type;

        // Only handle post_call_transcription events
        if (eventType !== 'post_call_transcription') {
            return jsonResponse({ received: true, message: `Ignored event: ${eventType}` });
        }

        const data = body.data || {};
        const conversationId = data.conversation_id || '';
        const agentId = data.agent_id || '';
        const status = data.status || 'completed';
        const transcript = data.transcript || '';
        const transcriptSummary = data.transcript_summary || '';

        // Extract call metadata
        const metadata = data.metadata || {};
        const callerPhone = metadata.caller_phone || data.caller_phone || '';
        const callDuration = data.call_duration_secs || data.duration || 0;

        // Extract tenant_id: URL query param → webhook metadata → agent_id lookup
        const tenantId = urlTenantId || metadata.tenant_id || '';

        if (!conversationId) {
            return errorResponse('Missing conversation_id');
        }

        const supabase = getSupabase();

        // Get recording URL from ElevenLabs API
        let recordingUrl = data.recording_url || '';

        // If no recording URL in webhook, fetch from ElevenLabs API
        if (!recordingUrl && conversationId) {
            const elevenLabsKey = Deno.env.get('ELEVENLABS_API_KEY') || '';
            if (elevenLabsKey) {
                try {
                    const apiRes = await fetch(
                        `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`,
                        {
                            headers: { 'xi-api-key': elevenLabsKey },
                        }
                    );
                    if (apiRes.ok) {
                        // Upload audio to Supabase Storage
                        const audioBlob = await apiRes.blob();
                        const fileName = `call-recordings/${conversationId}.mp3`;

                        const { data: uploadData } = await supabase.storage
                            .from('recordings')
                            .upload(fileName, audioBlob, {
                                contentType: 'audio/mpeg',
                                upsert: true,
                            });

                        if (uploadData) {
                            const { data: urlData } = supabase.storage
                                .from('recordings')
                                .getPublicUrl(fileName);
                            recordingUrl = urlData?.publicUrl || '';
                        }
                    }
                } catch (fetchErr: any) {
                    console.error('Failed to fetch recording:', fetchErr.message);
                }
            }
        }

        // Format transcript for readability
        let formattedTranscript = '';
        if (typeof transcript === 'string') {
            formattedTranscript = transcript;
        } else if (Array.isArray(transcript)) {
            formattedTranscript = transcript
                .map((t: any) => `${t.role === 'agent' ? '🤖 AI' : '👤 Customer'}: ${t.message}`)
                .join('\n');
        }

        // Determine which actions were taken during the call
        const actionsTaken: string[] = [];
        if (formattedTranscript.toLowerCase().includes('booking confirmed') ||
            formattedTranscript.toLowerCase().includes('booked')) {
            actionsTaken.push('booking_created');
        }
        if (formattedTranscript.toLowerCase().includes('cancelled')) {
            actionsTaken.push('booking_cancelled');
        }
        if (formattedTranscript.toLowerCase().includes('rescheduled')) {
            actionsTaken.push('booking_rescheduled');
        }
        if (formattedTranscript.toLowerCase().includes('waitlist')) {
            actionsTaken.push('added_to_waitlist');
        }

        // Resolve tenant_id: metadata → tenants.elevenlabs_agent_id → error
        let finalTenantId = tenantId;
        if (!finalTenantId && agentId) {
            // Look up tenant by their elevenlabs_agent_id in the tenants table
            const { data: tenantMatch } = await supabase
                .from('tenants')
                .select('id')
                .eq('elevenlabs_agent_id', agentId)
                .limit(1)
                .single();
            finalTenantId = tenantMatch?.id || '';
        }

        if (!finalTenantId) {
            console.error('Could not resolve tenant_id for agent_id:', agentId);
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
        // Usage Tracking: AI Minutes
        // ==========================================
        const minutesConsumed = Math.ceil(callDuration / 60);
        if (minutesConsumed > 0) {
            // Read current usage
            const { data: tenantData } = await supabase
                .from('tenants')
                .select('ai_minutes_used')
                .eq('id', finalTenantId)
                .single();

            const currentUsage = tenantData?.ai_minutes_used || 0;
            const newUsage = currentUsage + minutesConsumed;

            // Update usage in DB
            await supabase
                .from('tenants')
                .update({ ai_minutes_used: newUsage })
                .eq('id', finalTenantId);

            console.log(`Billed ${minutesConsumed} AI mins to tenant ${finalTenantId}. Total used: ${newUsage}.`);
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
