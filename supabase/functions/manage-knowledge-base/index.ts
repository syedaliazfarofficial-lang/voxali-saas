// Edge Function: manage-knowledge-base
// Adds text-based custom knowledge to the tenant's Vapi AI Assistant.

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

    // 2. Get tenant and Assistant ID
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
      .select('vapi_assistant_id, plan_tier')
      .eq('id', tenantId)
      .single();

    if (tenant?.plan_tier === 'basic') {
      return errorResponse('Custom Knowledge Base is only available on Pro and Elite plans. Please upgrade.', 403);
    }

    const assistantId = tenant?.vapi_assistant_id;
    if (!assistantId) {
      return errorResponse('No AI Assistant configured for this tenant', 404);
    }

    const vapiApiKey = Deno.env.get('VAPI_API_KEY');
    if (!vapiApiKey) {
      console.warn('Simulating knowledge base addition');
      return jsonResponse({
        success: true,
        simulated: true,
        message: 'Successfully updated agent knowledge base (simulated).'
      });
    }

    // 3. Fetch current Vapi Assistant to extract the system prompt
    const agentRes = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
      headers: { 'Authorization': `Bearer ${vapiApiKey}` }
    });

    if (!agentRes.ok) {
      return errorResponse('Failed to fetch assistant details from Vapi.ai', 500);
    }

    const agentData = await agentRes.json();

    // Find the system prompt message
    const messages = agentData.model?.messages || [];
    const systemMessage = messages.find((m: any) => m.role === 'system');

    if (!systemMessage) {
      return errorResponse('Could not find system prompt in Vapi Assistant', 500);
    }

    const currentPrompt = systemMessage.content || '';

    // Append custom knowledge
    const newPrompt = currentPrompt.includes('--- ADDITIONAL KNOWLEDGE ---')
      ? currentPrompt.split('--- ADDITIONAL KNOWLEDGE ---')[0] + `\n--- ADDITIONAL KNOWLEDGE ---\n${document_name}:\n${knowledge_text}`
      : `${currentPrompt}\n\n--- ADDITIONAL KNOWLEDGE ---\n${document_name}:\n${knowledge_text}`;

    // 4. Update Assistant in Vapi
    const patchRes = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${vapiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: {
          messages: [
            {
              role: "system",
              content: newPrompt
            }
          ]
        }
      })
    });

    if (!patchRes.ok) {
      const errTxt = await patchRes.text();
      console.error('Vapi PATCH error:', errTxt);
      return errorResponse('Failed to update assistant knowledge', 500);
    }

    return jsonResponse({
      success: true,
      simulated: false,
      message: 'Successfully updated assistant knowledge base.'
    });

  } catch (e: any) {
    console.error("Knowledge base error:", e);
    return errorResponse(`Error processing request: ${e.message}`, 500);
  }
});
