// Edge Function: provision-elevenlabs-agent
// Automatically creates a new ElevenLabs Conversational AI Agent for a salon
// and assigns the agent ID to the new tenant.

import { getSupabase, validateAuth, errorResponse, jsonResponse, corsHeaders } from '../_shared/utils.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    const auth = validateAuth(req);
    if (!auth.valid) return errorResponse(auth.error!, 401);

    try {
        const body = await req.json();
        const tenantId = body.tenant_id;
        const salonName = body.salon_name || 'The Salon';

        if (!tenantId) {
            return errorResponse('Missing tenant_id', 400);
        }

        const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        if (!apiKey) {
            console.warn('ElevenLabs API Key missing. Simulating agent creation.');
            const simulatedAgentId = `ag_${Math.random().toString(36).substring(2, 12)}`;
            await supabaseAdmin.from('tenants').update({ elevenlabs_agent_id: simulatedAgentId }).eq('id', tenantId);

            return jsonResponse({
                success: true,
                simulated: true,
                message: 'ElevenLabs credentials missing. Simulated agent creation.',
                agent_id: simulatedAgentId,
                tenant_id: tenantId
            });
        }

        // Call ElevenLabs API to create a new agent
        const createAgentPayload = {
            name: `${salonName} AI Receptionist`,
            conversation_config: {
                agent: {
                    prompt: {
                        prompt: `You are the AI receptionist for ${salonName}. Your job is to assist clients by providing business hours, answering simple queries, and helping them book an appointment. Be polite, professional, and friendly. Always keep your responses concise.`,
                        llm: "gemini-2.5-flash"
                    },
                    first_message: `Hello, thank you for calling ${salonName}. How can I help you book your appointment today?`,
                    language: "en"
                }
            }
        };

        const response = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
            method: 'POST',
            headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(createAgentPayload)
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error('ElevenLabs API Error:', errBody);
            return errorResponse(`Failed to create ElevenLabs agent: ${errBody}`, 500);
        }

        const data = await response.json();
        const newAgentId = data.agent_id;

        // Update tenant database with the new agent_id
        await supabaseAdmin.from('tenants').update({ elevenlabs_agent_id: newAgentId }).eq('id', tenantId);

        return jsonResponse({
            success: true,
            simulated: false,
            message: 'Successfully provisioned ElevenLabs Agent',
            agent_id: newAgentId,
            tenant_id: tenantId
        });

    } catch (e: any) {
        console.error("Agent provisioning error:", e);
        return errorResponse(`Error provisioning agent: ${e.message}`, 500);
    }
});
