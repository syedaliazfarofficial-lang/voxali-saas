import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { assistantId, messages, sessionId } = await req.json();

    if (!assistantId || !messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Missing assistantId or messages" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const vapiApiKey = Deno.env.get('VAPI_API_KEY');
    if (!vapiApiKey) {
      return new Response(JSON.stringify({ error: "Missing VAPI_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the last user message
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user');
    if (!lastUserMsg) {
      return new Response(JSON.stringify({ error: "No user message found" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch assistant details to get the system prompt
    const asstRes = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
      headers: { "Authorization": `Bearer ${vapiApiKey}` }
    });

    let systemPrompt = "You are a helpful salon AI assistant. Help customers with booking appointments, answering questions about services, prices, and availability.";
    
    if (asstRes.ok) {
      const asstData = await asstRes.json();
      const modelInstructions = asstData?.model?.messages?.find((m: any) => m.role === 'system')?.content
        || asstData?.model?.systemPrompt
        || asstData?.transcriber?.systemPrompt
        || '';
      
      if (modelInstructions && modelInstructions.length > 20) {
        systemPrompt = modelInstructions;
      }
      console.log("Assistant name:", asstData?.name, "| Prompt length:", systemPrompt.length);
    }

    // Build conversation history — filter out any tool/function messages
    const openAiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages
        .filter((m: any) => m.role === 'user' || m.role === 'assistant')
        .filter((m: any) => typeof m.content === 'string' && m.content.trim().length > 0)
        .map((m: any) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content
        }))
    ];

    // Use OpenAI API
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (openaiKey) {
      const oaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: openAiMessages,
          max_tokens: 500,
          temperature: 0.7
        })
      });

      if (oaiRes.ok) {
        const oaiData = await oaiRes.json();
        const choice = oaiData?.choices?.[0];
        
        // Extract only text content — ignore tool_calls
        let reply = '';
        if (choice?.message?.content && typeof choice.message.content === 'string') {
          reply = choice.message.content.trim();
        } else if (choice?.message?.tool_calls) {
          // AI tried to call a tool — give a polite fallback
          reply = "I'd be happy to help you book an appointment! Please visit our booking page or call us directly to schedule your appointment.";
        }

        if (reply) {
          return new Response(JSON.stringify({
            message: reply,
            choices: [{ message: { role: 'assistant', content: reply } }]
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else {
        const errText = await oaiRes.text();
        console.error("OpenAI error:", errText);
      }
    }

    // Fallback: Try Vapi's chat endpoint
    const vapiChatBody: any = {
      assistantId,
      input: lastUserMsg.content,
    };

    if (sessionId) {
      vapiChatBody.sessionId = sessionId;
    }

    const vapiRes = await fetch("https://api.vapi.ai/chat", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${vapiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(vapiChatBody)
    });

    const vapiText = await vapiRes.text();
    console.log("Vapi chat response:", vapiText.substring(0, 500));

    let vapiData: any = {};
    try { vapiData = JSON.parse(vapiText); } catch { /* ignore */ }

    // Extract ONLY text content from Vapi response — never show tool_calls JSON
    let reply = '';

    // Try different response fields
    if (typeof vapiData?.output === 'string') {
      reply = vapiData.output;
    } else if (typeof vapiData?.message === 'string') {
      reply = vapiData.message;
    } else if (vapiData?.choices?.[0]?.message?.content && typeof vapiData.choices[0].message.content === 'string') {
      reply = vapiData.choices[0].message.content;
    } else if (typeof vapiData?.result === 'string') {
      reply = vapiData.result;
    } else if (Array.isArray(vapiData?.messages)) {
      // Find last assistant text message — skip tool_calls entries
      const assistantMsg = [...vapiData.messages].reverse().find(
        (m: any) => m.role === 'assistant' && typeof m.content === 'string' && m.content.trim()
      );
      if (assistantMsg) reply = assistantMsg.content;
    }

    // If still no text reply, give fallback
    if (!reply || reply.startsWith('[{')) {
      reply = "I'd be happy to help you book an appointment! Please visit our booking page or call us directly.";
    }

    const newSessionId = vapiData?.sessionId || vapiData?.id || '';

    return new Response(JSON.stringify({
      message: reply,
      sessionId: newSessionId,
      choices: [{ message: { role: 'assistant', content: reply } }]
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
