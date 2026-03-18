import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TOOLS_KEY = 'LUXE-AUREA-SECRET-2026';

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const vapiSecret = req.headers.get('x-vapi-secret');
    if (vapiSecret !== TOOLS_KEY) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    try {
        const body = await req.json();

        // Vapi wraps the tool call payload in this specific structure
        if (body?.message?.type !== 'tool-calls' || !Array.isArray(body?.message?.toolWithToolCallList)) {
            return new Response(JSON.stringify({ error: "Invalid Vapi webhook payload" }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const results = [];
        const functionsUrl = Deno.env.get('SUPABASE_URL') + '/functions/v1';

        for (const item of body.message.toolWithToolCallList) {
            const toolCallId = item.toolCall.id;
            const functionName = item.toolCall.function.name;
            const args = item.toolCall.function.arguments || {};

            console.log(`Forwarding tool call ${toolCallId} to ${functionName}`, args);

            // Forward the inner JSON payload directly to our internal edge functions
            // This allows the existing functions to stay exactly the same and parse `body.tenant_id`
            try {
                // Convert function_name (e.g., list_services) to endpoint-name (e.g., list-services)
                let endpointName = functionName.replace(/_/g, '-');
                const forwardUrl = `${functionsUrl}/${endpointName}`;

                const proxyRes = await fetch(forwardUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-TOOLS-KEY': TOOLS_KEY,
                        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
                    },
                    body: JSON.stringify(args)
                });

                const proxyData = await proxyRes.json();

                // Add the result wrapped perfectly for Vapi
                results.push({
                    toolCallId: toolCallId,
                    result: proxyData
                });

                console.log(`Received data from ${endpointName} successfully:`, proxyData);

            } catch (err) {
                console.error(`Error proxying ${functionName}:`, err);
                results.push({
                    toolCallId: toolCallId,
                    result: { error: `Internal execution failed for ${functionName}` }
                });
            }
        }

        // Return the perfectly formatted array back to Vapi
        return new Response(JSON.stringify({ results }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error("Vapi Gateway Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
