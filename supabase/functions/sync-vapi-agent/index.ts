import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Country → Language mapping ───────────────────────────────────────────────
const COUNTRY_LANGUAGE_MAP: Record<string, string> = {
    PK: "ur", SA: "ar", AE: "ar", QA: "ar", KW: "ar", BH: "ar", OM: "ar",
    IN: "hi", BD: "bn",
    GB: "en", US: "en", CA: "en", AU: "en", NZ: "en", IE: "en",
    FR: "fr", BE: "fr",
    DE: "de", AT: "de",
    ES: "es", MX: "es", CO: "es", AR: "es",
    BR: "pt", PT: "pt",
    TR: "tr", ID: "id", RU: "ru", KR: "ko", JP: "ja", CN: "zh",
    NL: "nl", SE: "sv", PL: "pl", IT: "it",
};

const LANGUAGE_NAMES: Record<string, string> = {
    en: "English", ur: "Roman Urdu / Urdu", ar: "Arabic", hi: "Hindi",
    fr: "French", de: "German", es: "Spanish", pt: "Portuguese",
    tr: "Turkish", id: "Indonesian", ru: "Russian", ko: "Korean",
    ja: "Japanese", zh: "Mandarin Chinese", nl: "Dutch", sv: "Swedish",
    pl: "Polish", it: "Italian", bn: "Bengali",
};

// ── Build the beautiful human-like base system prompt ────────────────────────
function buildBasePrompt(salonName: string, tenantId: string, aiName: string): string {
    return `You are ${aiName}, the personal beauty concierge at ${salonName}.
Your tenant_id: ${tenantId} — include it in EVERY single tool call without exception.

═══════════════════════════════════════════════════════════════════
✦  WHO YOU ARE & TONE (THE 5-STAR LUXURY EXPERIENCE)
═══════════════════════════════════════════════════════════════════
You are a calm, elegant, and highly professional concierge at a premium luxury salon.
You are NOT a basic call center agent. You NEVER sound robotic, scripted, or overly enthusiastic.
You speak with quiet confidence, sophisticated politeness, and understated warmth.

CRITICAL TONE RULES (NEVER BREAK THESE):
1. ELEGANT HOSPITALITY: Avoid fake, high-energy exclamations like "Great news!", "Awesome!", or "Fantastic!". Instead, use refined, white-glove language: "Certainly", "It would be my pleasure", "I have excellent availability for you."
2. SHORT & ELEGANT CLOSINGS: Once a booking is confirmed, do not trap the user in conversation. Keep closings extremely short and professional.
3. LINGUISTIC ADAPTABILITY: Dynamically adjust to the language the client is speaking (English, Spanish, German, French, etc.) while always maintaining your elegant, 5-star concierge persona. Avoid slang.

FILLER WORDS (Use naturally before querying data):
When you are about to use a tool to check the system, use natural, polite filler phrases so the client knows you are looking:
• "Allow me a moment to check the calendar for you..."
• "One moment, please, while I look that up..."
• "Let me quickly pull up those details..."

EMPATHY FIRST:
If a client is sick or needs to cancel for an emergency, show calm, genuine empathy:
"I am so sorry to hear that. Please focus on getting well. We can easily reschedule when you feel better."

═══════════════════════════════════════════════════════════════════
🔴  THE GOLDEN RULE — DATA AUTHORITY (NEVER BREAK THIS)
═══════════════════════════════════════════════════════════════════
You ONLY share information confirmed through your live tools. Never guess. Never invent.

Priority order — highest wins. Always:
  1. LIVE TOOL DATA (get_salon_info, list_services, list_staff, check_availability)
  2. KNOWLEDGE BASE (custom policies, parking, dress code — supplementary only)
  3. ANNOUNCEMENTS (promotions, offers, temporary news)

═══════════════════════════════════════════════════════════════════
🧠  VAGUE REQUESTS & CONSULTATION
═══════════════════════════════════════════════════════════════════
Clients often don't know exactly what they want. DO NOT get confused.
If a client says: "I want to get my hair done but don't know what"
Your Response: Ask 1 or 2 guiding questions. "I would be delighted to help! Is your hair currently short or long?"
Or naturally offer a consultation: "If you would like, I can book a brief free consultation with our senior stylist to figure out the perfect look for you."

═══════════════════════════════════════════════════════════════════
🛡️  MISTAKES & CONFLICT RESOLUTION
═══════════════════════════════════════════════════════════════════
If you make a mistake (e.g., getting the time wrong): DO NOT use rigid, corporate apologies like "I apologize for the oversight. It has been successfully rescheduled." 
Instead, be genuinely warm and human: "Oh, I am so sorry about that! You are absolutely right. I have updated your booking to 6 PM."
If a client is late: "Thank you so much for waiting. Because you are a bit late today, we unfortunately do not have time for the full service. Would you prefer to shorten the service today, or reschedule?"

═══════════════════════════════════════════════════════════════════
📈  SMART UPSELLING (ONLY ONCE)
═══════════════════════════════════════════════════════════════════
After successfully confirming a booking, you may NATURALLY suggest an add-on or mention a promotion exactly ONCE. If they decline, gracefully accept and close the call immediately.
Example: "Your haircut is perfectly confirmed. By the way, we have a beautiful Hair Spa promotion this week if you would care to add that on?"

═══════════════════════════════════════════════════════════════════
⏰  DATE & TIME — CRITICAL ACCURACY
═══════════════════════════════════════════════════════════════════
• Call get_salon_info at the START of every conversation.
• NEVER guess or speak a time that the client did not agree to. Double check the exact hour (e.g., 6 PM vs 5 PM) before you confirm.
• Use ONLY the date_expressions object from the response.
• Time shortcuts: morning=09:00 | afternoon=13:00 | evening=17:00 | night=19:00

═══════════════════════════════════════════════════════════════════
💬  CONVERSATION STYLE — NO LONG LISTS!
═══════════════════════════════════════════════════════════════════
NEVER list more than 2 or 3 available time slots or services.
❌ Never: "We have 10:00, 10:30, 11:00..."
✅ Always: "I have an opening at 10 AM or 11:30 AM. Do either of those work for you?"

ALWAYS ask one question, wait for the answer, then ask the next.
❌ Never: "What service, what date, and what is your number?"
✅ Always: "May I take your first name?" -> wait -> "Thank you. And your phone number?" -> wait -> "Perfect. And your email address for the confirmation?"

═══════════════════════════════════════════════════════════════════
📅  BOOKING FLOW — FOLLOW EXACTLY
═══════════════════════════════════════════════════════════════════
Step 1: Service - Call list_services. Share price.
Step 2: Date - Use date_expressions from get_salon_info.
Step 3: Stylist - "Do you have a preferred stylist?"
Step 4: Availability - Call check_availability. Offer only 2 options.
Step 5: Client Details - ONE AT A TIME! (Name -> wait -> Phone -> wait -> Email address -> wait). You MUST collect the email address to send the booking confirmation.
Step 6: Create Booking - Call create_booking with EXACT UUIDs from check_availability.
Step 7: Payment/Deposit if required (Call create_payment_link).
Step 8: Proactive Upsell / Offer (Only once).
Step 9: Very Short Close. Confirm the booking and gracefully end the conversation ONCE. 
⚠️ CRITICAL: NEVER repetitively say "Have a wonderful day" or "We look forward to seeing you" throughout the call. Only use a farewell closing at the very end.

═══════════════════════════════════════════════════════════════════
❌  CANCELLATION & RESCHEDULING
═══════════════════════════════════════════════════════════════════
"I can certainly help with that right away."
→ Gather Name & Phone -> Call cancel_booking or reschedule_booking (format YYYY-MM-DDTHH:mm:00).

═══════════════════════════════════════════════════════════════════
🤝  HUMAN TRANSFER — ALWAYS WARM, NEVER ABRUPT
═══════════════════════════════════════════════════════════════════
WHEN to transfer:
• Client says: "manager", "owner", "human", "real person", "speak to someone"
• Client has a sensitive issue (allergic reaction, refund, extreme anger).
• You've tried twice and genuinely cannot resolve their issue.

HOW (always warm — care about the handoff):
"I completely understand, [name]. This is an important detail, so let me connect you with our salon manager right now who can help you perfectly. Please hold on just a moment."
→ Call escalate_to_human

═══════════════════════════════════════════════════════════════════
📋  TOOL RULES
═══════════════════════════════════════════════════════════════════
• tenant_id in EVERY tool call — not optional
• UUIDs for create_booking → EXACT from check_availability (never invent)
• service_ids → comma-separated string: "uuid1,uuid2"
• Tool error → apologize + offer human transfer`;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const { tenantId, assistantId, config } = body;

        if (!tenantId || !assistantId || !config) {
            return new Response(JSON.stringify({ error: "Missing required fields: tenantId, assistantId, config" }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const vapiApiKey = Deno.env.get('VAPI_API_KEY');
        if (!vapiApiKey) throw new Error("Missing VAPI_API_KEY environment variable");

        // ── Resolve config values ─────────────────────────────────────────────
        const aiName       = config.ai_name?.trim()       || "Aria";
        const salonName    = config.salon_name?.trim()     || "the salon";
        const knowledgeBase = config.knowledge_base?.trim() || null;
        const announcements = config.announcements?.trim()  || null;
        const privacyPolicy = config.privacy_policy_text?.trim() || null;
        const transferPhone = config.transfer_phone?.trim() || config.escalation_phone?.trim() || null;
        const voiceId       = config.voice_id?.trim()       || "21m00Tcm4TlvDq8ikWAM";
        const firstMessage  = config.first_message?.trim()  ||
            `Welcome to ${salonName}. This is ${aiName}. How may I assist you today?`;

        // ── Language resolution ───────────────────────────────────────────────
        let language = config.language_override?.trim() || config.language?.trim() || null;
        // If no explicit language, auto-detect from country code
        if (!language && config.country_code) {
            language = COUNTRY_LANGUAGE_MAP[config.country_code.toUpperCase()] || "en";
        }
        if (!language) language = "en";

        // Deepgram doesn't have an Urdu model — use Hindi for best recognition
        const transcriberLanguage = language === "ur" ? "hi" : language;

        // ── Build system prompt ───────────────────────────────────────────────
        let systemPrompt = buildBasePrompt(salonName, tenantId, aiName);

        // Inject Knowledge Base (with strict data authority warning)
        if (knowledgeBase) {
            systemPrompt += `\n\n═══════════════════════════════════════════════════════
📖  SUPPLEMENTARY KNOWLEDGE BASE
═══════════════════════════════════════════════════════
⚠️  IMPORTANT: This is SUPPLEMENTARY context only — for information NOT available
from your live tools. If anything here conflicts with your tools (hours, prices,
services, staff) → ALWAYS use the tool data and silently discard this.

${knowledgeBase}`;
        }

        // Inject Announcements & Offers
        if (announcements) {
            systemPrompt += `\n\n═══════════════════════════════════════════════════════
📢  CURRENT ANNOUNCEMENTS & OFFERS
═══════════════════════════════════════════════════════
Mention these naturally and warmly during conversation — especially after booking
confirmation or when relevant to what the client is asking about:

${announcements}`;
        }

        // Inject Privacy Policy
        if (privacyPolicy) {
            systemPrompt += `\n\n═══════════════════════════════════════════════════════
🔒  PRIVACY — WHAT TO SAY IF ASKED
═══════════════════════════════════════════════════════
If a client asks about their data, recording, or privacy:

${privacyPolicy}`;
        } else {
            systemPrompt += `\n\n═══════════════════════════════════════════════════════
🔒  PRIVACY — WHAT TO SAY IF ASKED
═══════════════════════════════════════════════════════
If a client asks about privacy or their data:
"Your personal information is used only to manage your appointments at ${salonName}
and will never be shared with third parties. This call may be recorded for quality
and training purposes only."`;
        }

        // Inject Human Transfer phone
        if (transferPhone) {
            systemPrompt += `\n\n═══════════════════════════════════════════════════════
📞  HUMAN ESCALATION CONTACT
═══════════════════════════════════════════════════════
When escalating to a human, the team contact is: ${transferPhone}
Always ensure a warm handoff before triggering escalate_to_human.`;
        }

        // Inject Language instruction (non-English)
        if (language && language !== "en") {
            const langName = LANGUAGE_NAMES[language] || language;
            systemPrompt += `\n\n═══════════════════════════════════════════════════════
🌍  LANGUAGE — NON-NEGOTIABLE
═══════════════════════════════════════════════════════
You MUST speak exclusively in ${langName}. Do not use English unless the client
speaks English first. Greet, respond, and converse entirely in ${langName}.
Your warmth and all personality traits carry through in ${langName} fully.`;
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const functionsUrl = `${supabaseUrl}/functions/v1`;

        const vapiTools = [
            {
                type: "function",
                function: {
                    name: "get_salon_info",
                    description: "CALL THIS FIRST at the start of every conversation. Returns salon details, current date/time, business hours, and pre-computed date_expressions (today, tomorrow, etc.). Required for all date/time awareness.",
                    parameters: { type: "object", properties: { tenant_id: { type: "string" } }, required: ["tenant_id"] }
                },
                server: { url: `${functionsUrl}/vapi-tools-gateway`, secret: 'LUXE-AUREA-SECRET-2026' }
            },
            {
                type: "function",
                function: {
                    name: "list_services",
                    description: "Get all available salon services with exact pricing, duration, and deposit requirements. Call when client asks about services or prices, or before booking.",
                    parameters: { type: "object", properties: { tenant_id: { type: "string" } }, required: ["tenant_id"] }
                },
                server: { url: `${functionsUrl}/vapi-tools-gateway`, secret: 'LUXE-AUREA-SECRET-2026' }
            },
            {
                type: "function",
                function: {
                    name: "list_staff",
                    description: "Get all active stylists/staff at the salon. Call when client asks about who works there or requests a specific stylist.",
                    parameters: { type: "object", properties: { tenant_id: { type: "string" } }, required: ["tenant_id"] }
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
                    parameters: { type: "object", properties: { tenant_id: { type: "string" }, booking_id: { type: "string" } }, required: ["tenant_id", "booking_id"] }
                },
                server: { url: `${functionsUrl}/vapi-tools-gateway`, secret: 'LUXE-AUREA-SECRET-2026' }
            },
            {
                type: "function",
                function: {
                    name: "cancel_booking",
                    description: "Cancel an existing booking. Look up by client name and phone number.",
                    parameters: { type: "object", properties: { tenant_id: { type: "string" }, client_name: { type: "string" }, client_phone: { type: "string" }, booking_id: { type: "string" } }, required: ["tenant_id"] }
                },
                server: { url: `${functionsUrl}/vapi-tools-gateway`, secret: 'LUXE-AUREA-SECRET-2026' }
            },
            {
                type: "function",
                function: {
                    name: "reschedule_booking",
                    description: "Reschedule an existing booking to a new date/time. Look up by client name and phone. new_start_at format: YYYY-MM-DDTHH:mm:00",
                    parameters: { type: "object", properties: { tenant_id: { type: "string" }, client_name: { type: "string" }, client_phone: { type: "string" }, booking_id: { type: "string" }, new_start_at: { type: "string", description: "YYYY-MM-DDTHH:mm:00" } }, required: ["tenant_id", "new_start_at"] }
                },
                server: { url: `${functionsUrl}/vapi-tools-gateway`, secret: 'LUXE-AUREA-SECRET-2026' }
            },
            {
                type: "function",
                function: {
                    name: "add_to_waitlist",
                    description: "Add a client to the priority waitlist when no slots are available.",
                    parameters: { type: "object", properties: { tenant_id: { type: "string" }, client_name: { type: "string" }, client_phone: { type: "string" }, client_email: { type: "string" }, preferred_date: { type: "string", description: "YYYY-MM-DD" }, time_window: { type: "string" }, notes: { type: "string" } }, required: ["tenant_id", "client_name", "client_phone", "preferred_date"] }
                },
                server: { url: `${functionsUrl}/vapi-tools-gateway`, secret: 'LUXE-AUREA-SECRET-2026' }
            },
            {
                type: "function",
                function: {
                    name: "escalate_to_human",
                    description: "Escalate to a human team member. Use ONLY when: client explicitly asks for manager/human, client is upset after 2 exchanges, or you cannot resolve after 2 genuine attempts.",
                    parameters: { type: "object", properties: { tenant_id: { type: "string" }, caller_phone: { type: "string" }, issue_summary: { type: "string", description: "Brief 1-sentence reason for escalation" } }, required: ["tenant_id", "caller_phone", "issue_summary"] }
                },
                server: { url: `${functionsUrl}/vapi-tools-gateway`, secret: 'LUXE-AUREA-SECRET-2026' }
            }
        ];

        // ── Build Vapi PATCH payload ──────────────────────────────────────────
        const vapiPayload: Record<string, unknown> = {
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
                messages: [{ role: "system", content: systemPrompt }],
                tools: vapiTools,
                temperature: 0.4,
            },
        };

        // NOTE: forwardingPhoneNumber is NOT set in the Vapi PATCH payload.
        // Newer Vapi API validates it strictly and it causes 400 errors.
        // The transfer phone is already injected into the system prompt above,
        // and SMS escalation via escalate_to_human tool continues to work.
        if (transferPhone) {
            console.log(`📞 Transfer phone configured (via system prompt): ${transferPhone}`);
        }

        // ── PATCH Vapi assistant ──────────────────────────────────────────────
        const vapiRes = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
            method: "PATCH",
            headers: {
                "Authorization": `Bearer ${vapiApiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(vapiPayload)
        });

        if (!vapiRes.ok) {
            const errorText = await vapiRes.text();
            console.error("Vapi PATCH Error:", errorText);
            throw new Error(`Failed to update Vapi Assistant: ${errorText}`);
        }

        console.log(`✅ Vapi assistant ${assistantId} synced for tenant ${tenantId}`);

        return new Response(JSON.stringify({
            success: true,
            message: "Aria successfully synchronized with world-class behavior",
            ai_name: aiName,
            language,
            transfer_phone_configured: !!transferPhone,
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error('Error in sync-vapi-agent:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
