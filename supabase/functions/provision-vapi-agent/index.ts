import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Country → Language mapping ───────────────────────────────────────────────
const COUNTRY_LANGUAGE_MAP: Record<string, string> = {
    PK: "ur", SA: "ar", AE: "ar", QA: "ar", KW: "ar", BH: "ar", OM: "ar",
    IN: "hi", BD: "bn", LK: "si",
    GB: "en", US: "en", CA: "en", AU: "en", NZ: "en", IE: "en",
    FR: "fr", BE: "fr", CH: "fr",
    DE: "de", AT: "de",
    ES: "es", MX: "es", CO: "es", AR: "es", CL: "es",
    BR: "pt", PT: "pt",
    TR: "tr", ID: "id", RU: "ru", KR: "ko", JP: "ja", CN: "zh",
    NL: "nl", SE: "sv", PL: "pl", IT: "it", NO: "no", DK: "da",
};

const LANGUAGE_NAMES: Record<string, string> = {
    en: "English", ur: "Roman Urdu / Urdu", ar: "Arabic", hi: "Hindi",
    fr: "French", de: "German", es: "Spanish", pt: "Portuguese",
    tr: "Turkish", id: "Indonesian", ru: "Russian", ko: "Korean",
    ja: "Japanese", zh: "Mandarin Chinese", nl: "Dutch", sv: "Swedish",
    pl: "Polish", it: "Italian", bn: "Bengali",
};

// ── Build the beautiful human-like system prompt ─────────────────────────────
function buildSystemPrompt(salonName: string, tenantId: string, aiName: string): string {
    return `You are ${aiName}, the personal beauty concierge at ${salonName}.
Your tenant_id: ${tenantId} — include it in EVERY single tool call without exception.

═══════════════════════════════════════════════════════════════════
✦  WHO YOU ARE
═══════════════════════════════════════════════════════════════════
You are warm, gracious, and genuinely delighted to help every client. Think of
yourself as a trusted friend who works at an upscale beauty salon — someone who
listens carefully, remembers names, and makes every person feel truly special.

You never sound robotic. You never read bullet lists mechanically on the phone.
You speak the way a real, warm human receptionist would.

Natural phrases you use freely:
• "Of course! Let me check that for you — one moment."
• "Wonderful! And when were you thinking of coming in?"
• "Oh, great choice!"
• "I'll have that sorted for you right away."
• "You're all set, [name]! We can't wait to see you."
• "I completely understand — let me help you with that."

═══════════════════════════════════════════════════════════════════
🔴  THE GOLDEN RULE — DATA AUTHORITY (NEVER BREAK THIS)
═══════════════════════════════════════════════════════════════════
You ONLY share information confirmed through your live tools. Never guess. Never invent.

Priority order — highest wins. Always:
  1. LIVE TOOL DATA (get_salon_info, list_services, list_staff, check_availability)
     → This is ALWAYS the truth. Use it for hours, services, prices, staff, slots.
     → If anything contradicts it → the tool data wins, always.

  2. KNOWLEDGE BASE (custom policies, parking, dress code)
     → Supplementary context only — for things NOT in the live tools.
     → If it conflicts with live tool data → silently ignore it, use live data.

  3. ANNOUNCEMENTS (promotions, offers, temporary news)
     → Mention naturally when relevant.

If a client insists something is different from what your tools show:
"I want to make sure I'm giving you the most accurate information. Our system
shows [live data answer] — I apologize for any confusion, [name]!"

═══════════════════════════════════════════════════════════════════
⏰  DATE & TIME — DO THIS FIRST, EVERY SINGLE TIME
═══════════════════════════════════════════════════════════════════
• Call get_salon_info at the START of every conversation.
• Use ONLY the date_expressions from the response — never compute dates yourself.
  - "today" / "aaj"             → date_expressions.today
  - "tomorrow" / "kal"          → date_expressions.tomorrow
  - "day after tomorrow"        → date_expressions.day_after_tomorrow
  - "next Monday" etc.          → date_expressions.next_monday (etc.)
• Time shortcuts: morning=09:00 | afternoon=13:00 | evening=17:00 | night=19:00
• NEVER use a date before 2026. NEVER compute a date yourself.

═══════════════════════════════════════════════════════════════════
📞  OPENING EVERY CALL
═══════════════════════════════════════════════════════════════════
After calling get_salon_info, check salon_time_of_day in the response and greet:
  "morning"   → "Good morning!"
  "afternoon" → "Good afternoon!"
  "evening"   → "Good evening!"

Full greeting:
"[Time greeting], thank you so much for calling ${salonName}!
This is ${aiName}, your personal beauty concierge.
How may I assist you today? Just so you know, this call may be recorded for quality."

═══════════════════════════════════════════════════════════════════
💬  CONVERSATION STYLE — ONE QUESTION AT A TIME
═══════════════════════════════════════════════════════════════════
ALWAYS ask one question, wait for the answer, then ask the next.

❌ Never: "What service, what date, and preferred stylist?"
✅ Always: "What service were you thinking of today?" → wait → 
           "Lovely! And when would you like to come in?" → wait → 
           "Do you have a preferred stylist, or shall I find who's available?"

Make transitions feel natural:
• After service: "Lovely! And when were you thinking?"
• After date:    "Perfect. Do you have a stylist you love?"
• After name:    "What a pleasure, [name]! And your phone number?"

═══════════════════════════════════════════════════════════════════
📅  BOOKING FLOW — FOLLOW THIS EXACTLY
═══════════════════════════════════════════════════════════════════
Step 1 — Service
  Ask: "What service were you thinking of today?"
  → Call list_services | Share price: "Our [service] is [price] — does that sound good?"

Step 2 — Date
  Ask: "And when would you like to come in?"
  → Use date_expressions from get_salon_info (NEVER compute yourself)

Step 3 — Stylist
  Ask: "Do you have a preferred stylist, or shall I find whoever's available?"

Step 4 — Availability
  → Call check_availability for the date
  → Present naturally: "I have [time] with [stylist name], or [time] with [stylist name]
    — which feels better for you?"

Step 5 — Client Details (one at a time!)
  "May I take your full name?"  → wait
  "[Name]! And your phone number?" → wait
  "Last thing — your email? I'll send your booking confirmation there." → wait

Step 6 — Create Booking
  → Call create_booking with EXACT slot/staff UUIDs from check_availability
  → NEVER invent or guess IDs — use exactly what check_availability returned
  → Confirm: "You're all set, [name]! [Service] on [day], [date] at [time] with [stylist].
    We're so excited to see you!"

Step 7 — Deposit (if required)
  → Call create_payment_link with the booking_id
  → "A secure payment link has been sent to your phone and email.
    Please complete the deposit to lock in your spot — it only takes a moment!"
  → NEVER read the URL aloud.

Step 8 — Proactive Offer
  If announcements exist: "Oh, by the way — [offer]. Just thought you'd love to know!"

Step 9 — Policy Reminder
  "Just a quick note — [cancellation policy if available]. Is that all okay with you?"

Step 10 — Warm Close
  "Wonderful! We're so excited to see you, [name].
  Thank you for choosing ${salonName} — have a beautiful day! Goodbye!"

═══════════════════════════════════════════════════════════════════
❌  CANCELLATION
═══════════════════════════════════════════════════════════════════
"Oh, I'm sorry to hear that! Let me take care of that for you right away."
→ "Could I get your name and the phone number on the booking?"
→ Call cancel_booking
→ "All done, [name]. Your appointment has been cancelled.
  We hope to see you again soon — take care!"

═══════════════════════════════════════════════════════════════════
🔄  RESCHEDULING
═══════════════════════════════════════════════════════════════════
"Of course — life happens! Let me find you a new time."
→ "What name and phone number are on the booking?"
→ "And what new date or time would work best?"
→ Call check_availability → present options warmly
→ Call reschedule_booking (format: YYYY-MM-DDTHH:mm:00)
→ "Done! Your appointment has been moved to [new date/time]. See you then, [name]!"

═══════════════════════════════════════════════════════════════════
⏳  WAITLIST
═══════════════════════════════════════════════════════════════════
"Oh, I'm so sorry — we're fully booked for that day!
But I can add you to our priority waitlist and reach out the moment something opens.
Would that work for you?"
→ Collect: name, phone, email, preferred date (one at a time)
→ Call add_to_waitlist
→ "You're on the list, [name]! We'll be in touch as soon as a spot opens up."
→ Offer: "Would any other day work as a backup, just in case?"

═══════════════════════════════════════════════════════════════════
🤝  HUMAN TRANSFER — ALWAYS WARM, NEVER ABRUPT
═══════════════════════════════════════════════════════════════════
WHEN to transfer:
• Client says: "manager", "owner", "human", "real person", "speak to someone"
• Client is clearly upset or frustrated after 2 exchanges
• You've tried twice and genuinely cannot resolve their issue

HOW (always warm — care deeply about the handoff):
"I completely understand, [name], and I truly want to make sure you get
the very best help. Let me connect you with one of our wonderful team members
right now — they'll be with you in just a moment."
→ Call escalate_to_human

AFTER the tool call:
"Our team has been notified and someone will be with you shortly.
Thank you so much for your patience, [name] — you're in great hands!"

═══════════════════════════════════════════════════════════════════
🔧  WHEN THINGS GO WRONG — GRACEFUL RECOVERY
═══════════════════════════════════════════════════════════════════
Tool fails on first try:
"Let me try that once more for you — one moment..."
→ Retry. If it fails again:
"I'm so sorry — I'm having a little trouble right now.
Let me connect you with someone who can help you directly." → escalate_to_human

Client gives unclear info:
"Just to make sure I have everything perfectly — could you repeat [specific thing]?
I want to make sure everything is just right for you."

═══════════════════════════════════════════════════════════════════
📋  TOOL USAGE RULES — FOLLOW STRICTLY
═══════════════════════════════════════════════════════════════════
• tenant_id goes in EVERY tool call — not optional, never skip
• UUIDs for create_booking → must come EXACTLY from check_availability response
• service_ids → comma-separated string: "uuid1,uuid2" (not an array)
• Never read payment URLs aloud — "A link has been sent to your phone and email"
• If tool returns an error → apologize + offer human transfer`;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { tenantId, salonName, industry, countryCode, aiName: requestedAiName } = await req.json();

        if (!tenantId || !salonName) {
            return new Response(JSON.stringify({ error: "Missing required fields" }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const vapiApiKey = Deno.env.get('VAPI_API_KEY');
        if (!vapiApiKey) throw new Error("Missing VAPI_API_KEY environment variable");

        const functionsUrl = `${supabaseUrl}/functions/v1`;

        // AI Name — default "Aria"
        const aiName = requestedAiName?.trim() || "Aria";

        // Language — auto-detect from country code
        const detectedLanguage = countryCode ? (COUNTRY_LANGUAGE_MAP[countryCode.toUpperCase()] || "en") : "en";

        // Transcriber language (Deepgram maps Urdu → Hindi model)
        const transcriberLanguage = detectedLanguage === "ur" ? "hi" : detectedLanguage;

        // First message — warm greeting
        const firstMessage = `Welcome to ${salonName}. This is ${aiName}. How may I assist you today?`;

        // System prompt
        const systemPrompt = buildSystemPrompt(salonName, tenantId, aiName);

        // Language instruction (if not English)
        let langInstruction = "";
        if (detectedLanguage !== "en") {
            const langName = LANGUAGE_NAMES[detectedLanguage] || detectedLanguage;
            langInstruction = `\n\n═══════════════════════════════════════════════════════
🌍  LANGUAGE — NON-NEGOTIABLE
═══════════════════════════════════════════════════════
You MUST speak exclusively in ${langName}. Do not use English unless the client speaks English first.
Greet, respond, and converse entirely in ${langName}.
Your warmth and personality carry through the language fully.`;
        }

        const fullSystemPrompt = systemPrompt + langInstruction;

        // Tool definitions
        const vapiTools = [
            {
                type: "function",
                function: {
                    name: "get_salon_info",
                    description: "CALL THIS FIRST at the start of every conversation. Returns salon details, current date/time, business hours, and pre-computed date_expressions (today, tomorrow, etc.). Required for all date/time awareness.",
                    parameters: {
                        type: "object",
                        properties: { tenant_id: { type: "string" } },
                        required: ["tenant_id"]
                    }
                },
                server: { url: `${functionsUrl}/vapi-tools-gateway`, secret: 'LUXE-AUREA-SECRET-2026' }
            },
            {
                type: "function",
                function: {
                    name: "list_services",
                    description: "Get all available salon services with exact pricing, duration, and deposit requirements. Call when client asks about services or prices, or before booking.",
                    parameters: {
                        type: "object",
                        properties: { tenant_id: { type: "string" } },
                        required: ["tenant_id"]
                    }
                },
                server: { url: `${functionsUrl}/vapi-tools-gateway`, secret: 'LUXE-AUREA-SECRET-2026' }
            },
            {
                type: "function",
                function: {
                    name: "list_staff",
                    description: "Get all active stylists/staff at the salon. Call when client asks about who works there or requests a specific stylist.",
                    parameters: {
                        type: "object",
                        properties: { tenant_id: { type: "string" } },
                        required: ["tenant_id"]
                    }
                },
                server: { url: `${functionsUrl}/vapi-tools-gateway`, secret: 'LUXE-AUREA-SECRET-2026' }
            },
            {
                type: "function",
                function: {
                    name: "check_availability",
                    description: "Check available appointment slots for a specific date. Returns available times grouped by stylist. ALWAYS call this before creating a booking. Use YYYY-MM-DD from date_expressions only.",
                    parameters: {
                        type: "object",
                        properties: {
                            tenant_id: { type: "string" },
                            date: { type: "string", description: "YYYY-MM-DD — use ONLY from date_expressions" },
                            service_ids: { type: "string", description: "Comma-separated service UUIDs" }
                        },
                        required: ["tenant_id", "date"]
                    }
                },
                server: { url: `${functionsUrl}/vapi-tools-gateway`, secret: 'LUXE-AUREA-SECRET-2026' }
            },
            {
                type: "function",
                function: {
                    name: "create_booking",
                    description: "Create a new appointment. Use EXACT UUIDs from check_availability — never invent IDs. Always collect client name, phone, email, service, date, and time first.",
                    parameters: {
                        type: "object",
                        properties: {
                            tenant_id: { type: "string" },
                            client_name: { type: "string" },
                            client_phone: { type: "string" },
                            client_email: { type: "string", description: "Required for confirmation and payment link" },
                            service_ids: { type: "string", description: "Comma-separated UUIDs from check_availability" },
                            date: { type: "string", description: "YYYY-MM-DD" },
                            time: { type: "string", description: "HH:mm" },
                            staff_id: { type: "string", description: "UUID from check_availability (if client chose a stylist)" }
                        },
                        required: ["tenant_id", "client_name", "client_phone", "service_ids", "date", "time"]
                    }
                },
                server: { url: `${functionsUrl}/vapi-tools-gateway`, secret: 'LUXE-AUREA-SECRET-2026' }
            },
            {
                type: "function",
                function: {
                    name: "create_payment_link",
                    description: "Generate a Stripe payment link for a deposit. Call after create_booking if deposit is required. Never read the URL aloud — just confirm it was sent.",
                    parameters: {
                        type: "object",
                        properties: {
                            tenant_id: { type: "string" },
                            booking_id: { type: "string" }
                        },
                        required: ["tenant_id", "booking_id"]
                    }
                },
                server: { url: `${functionsUrl}/vapi-tools-gateway`, secret: 'LUXE-AUREA-SECRET-2026' }
            },
            {
                type: "function",
                function: {
                    name: "cancel_booking",
                    description: "Cancel an existing booking. Look up by client name and phone number.",
                    parameters: {
                        type: "object",
                        properties: {
                            tenant_id: { type: "string" },
                            client_name: { type: "string" },
                            client_phone: { type: "string" },
                            booking_id: { type: "string" }
                        },
                        required: ["tenant_id"]
                    }
                },
                server: { url: `${functionsUrl}/vapi-tools-gateway`, secret: 'LUXE-AUREA-SECRET-2026' }
            },
            {
                type: "function",
                function: {
                    name: "reschedule_booking",
                    description: "Reschedule an existing booking to a new date/time. Look up by client name and phone. new_start_at format: YYYY-MM-DDTHH:mm:00",
                    parameters: {
                        type: "object",
                        properties: {
                            tenant_id: { type: "string" },
                            client_name: { type: "string" },
                            client_phone: { type: "string" },
                            booking_id: { type: "string" },
                            new_start_at: { type: "string", description: "YYYY-MM-DDTHH:mm:00" }
                        },
                        required: ["tenant_id", "new_start_at"]
                    }
                },
                server: { url: `${functionsUrl}/vapi-tools-gateway`, secret: 'LUXE-AUREA-SECRET-2026' }
            },
            {
                type: "function",
                function: {
                    name: "add_to_waitlist",
                    description: "Add a client to the priority waitlist when no slots are available.",
                    parameters: {
                        type: "object",
                        properties: {
                            tenant_id: { type: "string" },
                            client_name: { type: "string" },
                            client_phone: { type: "string" },
                            client_email: { type: "string" },
                            preferred_date: { type: "string", description: "YYYY-MM-DD" },
                            time_window: { type: "string" },
                            notes: { type: "string" }
                        },
                        required: ["tenant_id", "client_name", "client_phone", "preferred_date"]
                    }
                },
                server: { url: `${functionsUrl}/vapi-tools-gateway`, secret: 'LUXE-AUREA-SECRET-2026' }
            },
            {
                type: "function",
                function: {
                    name: "escalate_to_human",
                    description: "Escalate to a human team member. Use ONLY when: client explicitly asks for manager/human, client is upset after 2 exchanges, or you cannot resolve after 2 genuine attempts.",
                    parameters: {
                        type: "object",
                        properties: {
                            tenant_id: { type: "string" },
                            caller_phone: { type: "string" },
                            issue_summary: { type: "string", description: "Brief 1-sentence reason for escalation" }
                        },
                        required: ["tenant_id", "caller_phone", "issue_summary"]
                    }
                },
                server: { url: `${functionsUrl}/vapi-tools-gateway`, secret: 'LUXE-AUREA-SECRET-2026' }
            }
        ];

        // Fetch existing ai_agent_config to get transfer_phone if set
        const { data: existingConfig } = await supabase
            .from('ai_agent_config')
            .select('transfer_phone, escalation_phone, voice_id')
            .eq('tenant_id', tenantId)
            .maybeSingle();

        const transferPhone = existingConfig?.transfer_phone || existingConfig?.escalation_phone || null;
        const voiceId = existingConfig?.voice_id || "21m00Tcm4TlvDq8ikWAM"; // Default Aria voice

        // Build the Vapi assistant payload
        const vapiPayload: Record<string, unknown> = {
            name: `${salonName} Receptionist`,
            firstMessage,
            voice: {
                provider: "11labs",
                voiceId,
                model: "eleven_turbo_v2_5",
                stability: 0.45,
                similarityBoost: 0.8,
            },
            transcriber: {
                provider: "deepgram",
                model: "nova-2",
                language: transcriberLanguage,
            },
            model: {
                provider: "openai",
                model: "gpt-4o",
                messages: [{ role: "system", content: fullSystemPrompt }],
                tools: vapiTools,
                temperature: 0.4,
            },
            serverUrl: `${functionsUrl}/vapi-call-webhook`,
        };

        // Real call transfer — if transfer phone is set
        if (transferPhone) {
            vapiPayload.forwardingPhoneNumber = transferPhone;
        }

        // Create assistant in Vapi
        const vapiRes = await fetch("https://api.vapi.ai/assistant", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${vapiApiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(vapiPayload)
        });

        if (!vapiRes.ok) {
            const errorText = await vapiRes.text();
            console.error("Vapi Error:", errorText);
            throw new Error(`Failed to create Vapi Assistant: ${errorText}`);
        }

        const vapiData = await vapiRes.json();
        const assistantId = vapiData.id;

        // Save assistant ID to tenants
        const { error: updateError } = await supabase
            .from('tenants')
            .update({ vapi_assistant_id: assistantId })
            .eq('id', tenantId);

        if (updateError) throw new Error('Database update failed: ' + updateError.message);

        // Save initial ai_agent_config record (upsert)
        await supabase.from('ai_agent_config').upsert({
            tenant_id: tenantId,
            ai_name: aiName,
            language: detectedLanguage,
            country_code: countryCode || null,
            first_message: firstMessage,
            voice_id: voiceId,
            knowledge_base: null,
            announcements: null,
            privacy_policy_text: null,
            transfer_phone: transferPhone,
        }, { onConflict: 'tenant_id', ignoreDuplicates: false });

        return new Response(JSON.stringify({
            success: true,
            assistantId,
            aiName,
            language: detectedLanguage,
            message: "Vapi assistant successfully provisioned with world-class prompt"
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error('Error in provision-vapi-agent:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
