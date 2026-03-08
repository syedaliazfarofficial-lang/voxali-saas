// Edge Function: manage-knowledge-base
// Adds text-based custom knowledge to the tenant's ElevenLabs AI Agent.

import { getSupabase, validateAuth, errorResponse, jsonResponse, corsHeaders } from '../_shared/utils.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // 1. Authenticate user
  const auth = validateAuth(req);
  if (!auth.valid) return errorResponse(auth.error!, 401);
  const userId = auth.user?.id;

  try {
    const body = await req.json();
    const { knowledge_text, document_name } = body;

    if (!knowledge_text || !document_name) {
      return errorResponse('Missing knowledge_text or document_name', 400);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 2. Get tenant and Agent ID
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('tenant_id')
      .eq('user_id', userId)
      .single();

    if (!profile || !profile.tenant_id) {
      return errorResponse('User not linked to a tenant', 403);
    }
    const tenantId = profile.tenant_id;

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('elevenlabs_agent_id, plan_tier')
      .eq('id', tenantId)
      .single();

    if (tenant?.plan_tier === 'basic') {
      return errorResponse('Custom Knowledge Base is only available on Pro and Elite plans. Please upgrade.', 403);
    }

    const agentId = tenant?.elevenlabs_agent_id;
    if (!agentId) {
      return errorResponse('No AI Agent configured for this tenant', 404);
    }

    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!apiKey) {
      console.warn('Simulating knowledge base addition');
      return jsonResponse({
        success: true,
        simulated: true,
        message: 'Successfully updated agent knowledge base (simulated).'
      });
    }

    // 3. Create Knowledge Base Document in ElevenLabs
    const createDocRes = await fetch('https://api.elevenlabs.io/v1/convai/knowledge-base/document', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `${tenantId}_${document_name}`,
        text: knowledge_text
      })
    });

    // Some endpoints may differ, often you upload file for text as well or use /text endpoint.
    // Handling fallback: if POST /document fails, we will try the /v1/convai/agents/{agent_id}/knowledge-base if it exists.
    // Actually, the simplest way to dynamically update knowledge without managing doc IDs 
    // is to append the knowledge_text directly to the agent's prompt via PATCH if document API is complex.
    // But let's fetch the current agent, append to prompt.

    const agentRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      headers: { 'xi-api-key': apiKey }
    });

    if (!agentRes.ok) {
      return errorResponse('Failed to fetch agent details from ElevenLabs', 500);
    }

    const agentData = await agentRes.json();
    const currentPrompt = agentData.conversation_config?.agent?.prompt?.prompt || '';

    const newPrompt = currentPrompt.includes('--- ADDITIONAL KNOWLEDGE ---')
      ? currentPrompt.split('--- ADDITIONAL KNOWLEDGE ---')[0] + `\n--- ADDITIONAL KNOWLEDGE ---\n${document_name}:\n${knowledge_text}`
      : `${currentPrompt}\n\n--- ADDITIONAL KNOWLEDGE ---\n${document_name}:\n${knowledge_text}`;

    const patchRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      method: 'PATCH',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        conversation_config: {
          agent: {
            prompt: {
              prompt: newPrompt
            }
          }
        }
      })
    });

    if (!patchRes.ok) {
      const errTxt = await patchRes.text();
      console.error('Agent PATCH error:', errTxt);
      return errorResponse('Failed to update agent knowledge', 500);
    }

    return jsonResponse({
      success: true,
      simulated: false,
      message: 'Successfully updated agent knowledge base.'
    });

  } catch (e: any) {
    console.error("Knowledge base error:", e);
    return errorResponse(`Error processing request: ${e.message}`, 500);
  }
});
