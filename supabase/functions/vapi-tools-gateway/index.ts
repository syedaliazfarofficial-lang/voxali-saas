import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-vapi-secret',
};

const TOOLS_KEY = 'LUXE-AUREA-SECRET-2026';

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    // Vapi sends secret in x-vapi-secret header
    const vapiSecret = req.headers.get('x-vapi-secret');
    if (vapiSecret !== TOOLS_KEY) {
        console.error(`[gateway] Unauthorized — got secret: "${vapiSecret}"`);
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    let body: any;
    try {
        body = await req.json();
        console.log('[gateway] Raw body:', JSON.stringify(body).substring(0, 500));
    } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // ── Detect Vapi payload format ─────────────────────────────────────────
    // Vapi sends tool calls in different formats depending on version.
    // Format A (new):  body.message.type === 'tool-calls', body.message.toolCallList = [{id, name, arguments}]
    // Format B (old):  body.message.type === 'tool-calls', body.message.toolWithToolCallList = [{toolCall:{id, function:{name,arguments}}}]
    // Format C (bare): body.type === 'tool-call', body.toolCallList = [{id, name, arguments}]
    // We handle ALL formats.

    const message = body?.message ?? body;
    const msgType = message?.type;

    // Normalize tool calls to unified format: [{id, name, arguments}]
    let toolCalls: Array<{ id: string; name: string; arguments: Record<string, any> }> = [];

    if (Array.isArray(message?.toolCallList) && message.toolCallList.length > 0) {
        // Format A (new Vapi) — two sub-variants:
        //   A1: { id, name, arguments }           (flat — Vapi docs example)
        //   A2: { id, type, function: { name, arguments } }  (OpenAI-style — what Vapi ACTUALLY sends)
        console.log('[gateway] Detected Format A (toolCallList)');
        toolCalls = message.toolCallList.map((tc: any) => {
            // Name: flat first, then nested
            const name = tc.name || tc.function?.name || '';
            // Arguments: flat first, then nested (may be JSON string)
            let rawArgs = tc.arguments !== undefined ? tc.arguments : tc.function?.arguments;
            let args: Record<string, any> = {};
            if (typeof rawArgs === 'string') { try { args = JSON.parse(rawArgs); } catch (_) { args = {}; } }
            else if (rawArgs && typeof rawArgs === 'object') { args = rawArgs; }
            console.log(`[gateway] A → tool: ${name}, argKeys: ${Object.keys(args).join(',') || 'EMPTY'}`);
            return { id: tc.id, name, arguments: args };
        });
    } else if (Array.isArray(message?.toolWithToolCallList) && message.toolWithToolCallList.length > 0) {
        // Format B (old Vapi)
        console.log('[gateway] Detected Format B (toolWithToolCallList)');
        toolCalls = message.toolWithToolCallList.map((item: any) => {
            const tc = item.toolCall ?? item;
            const fn = tc.function ?? {};
            let args = fn.arguments ?? tc.arguments ?? {};
            if (typeof args === 'string') { try { args = JSON.parse(args); } catch (_) { args = {}; } }
            return { id: tc.id, name: fn.name ?? tc.name, arguments: args };
        });
    } else if (Array.isArray(body?.toolCallList) && body.toolCallList.length > 0) {
        // Format C (bare)
        console.log('[gateway] Detected Format C (bare toolCallList)');
        toolCalls = body.toolCallList.map((tc: any) => ({
            id: tc.id,
            name: tc.name || tc.function?.name,
            arguments: typeof tc.arguments === 'string' ? JSON.parse(tc.arguments) : (tc.arguments ?? {}),
        }));
    } else {
        console.error('[gateway] Unknown payload format. Keys:', Object.keys(message ?? body ?? {}));
        // Don't hard-fail — return empty results so Vapi doesn't hang
        return new Response(JSON.stringify({ results: [] }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`[gateway] Processing ${toolCalls.length} tool call(s)`);

    const functionsUrl = Deno.env.get('SUPABASE_URL') + '/functions/v1';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const results: Array<{ toolCallId: string; result: string }> = [];

    for (const tc of toolCalls) {
        const { id: toolCallId, name: functionName, arguments: args } = tc;
        console.log(`[gateway] → Calling ${functionName} (${toolCallId}) with args:`, JSON.stringify(args));

        try {
            // Convert snake_case to kebab-case for edge function URLs
            const endpointName = functionName.replace(/_/g, '-');
            const forwardUrl = `${functionsUrl}/${endpointName}`;

            const proxyRes = await fetch(forwardUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-TOOLS-KEY': TOOLS_KEY,
                    'Authorization': `Bearer ${serviceKey}`,
                },
                body: JSON.stringify(args),
            });

            if (!proxyRes.ok) {
                const errTxt = await proxyRes.text();
                console.error(`[gateway] ${endpointName} returned ${proxyRes.status}: ${errTxt}`);
                results.push({
                    toolCallId,
                    result: JSON.stringify({ error: `Tool ${functionName} failed with status ${proxyRes.status}` }),
                });
                continue;
            }

            const proxyData = await proxyRes.json();
            console.log(`[gateway] ✅ ${endpointName} success:`, JSON.stringify(proxyData).substring(0, 200));

            results.push({
                toolCallId,
                result: JSON.stringify(proxyData),
            });

        } catch (err) {
            console.error(`[gateway] ❌ Exception calling ${functionName}:`, String(err));
            results.push({
                toolCallId,
                result: JSON.stringify({ error: `Internal error calling ${functionName}` }),
            });
        }
    }

    return new Response(JSON.stringify({ results }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
});
