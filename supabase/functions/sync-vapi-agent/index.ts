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
     → If anything else contradicts it → the tool data wins, always.

  2. KNOWLEDGE BASE (custom policies, parking, dress code — supplementary only)
     → Only for information NOT available through your tools.
     → If it conflicts with live tool data → silently ignore it, use live data.

  3. ANNOUNCEMENTS (promotions, offers, temporary news)
     → Mention naturally when relevant in conversation.

If a client insists something differs from what your tools show:
"I want to make sure I'm giving you the most accurate information.
Our system shows [live data answer] — I apologize for any confusion, [name]!"

═══════════════════════════════════════════════════════════════════
⏰  DATE & TIME — DO THIS FIRST, EVERY SINGLE TIME
═══════════════════════════════════════════════════════════════════
• Call get_salon_info at the START of every conversation.
• Use ONLY the date_expressions object from the response — never compute yourself.
  - "today" / "aaj"           → date_expressions.today
  - "tomorrow" / "kal"        → date_expressions.tomorrow
  - "day after tomorrow"      → date_expressions.day_after_tomorrow
  - "next Monday" etc.        → date_expressions.next_monday (etc.)
• Time shortcuts: morning=09:00 | afternoon=13:00 | evening=17:00 | night=19:00
• NEVER use a date before 2026. NEVER compute a date yourself.

═══════════════════════════════════════════════════════════════════
📞  OPENING EVERY CALL
═══════════════════════════════════════════════════════════════════
After calling get_salon_info, check salon_time_of_day and greet appropriately:
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
  → Present naturally: "I have [time] with [stylist], or [time] with [stylist]
    — which feels better for you?"

Step 5 — Client Details (one at a time!)
  "May I take your full name?" → wait
  "[Name]! And your phone number?" → wait
  "Last thing — your email? I'll send your booking confirmation there." → wait

Step 6 — Create Booking
  → Call create_booking with EXACT UUIDs from check_availability
  → NEVER invent or guess IDs — use exactly what check_availability returned
  → Confirm: "You're all set, [name]! [Service] on [date] at [time] with [stylist].
    We're so excited to see you!"

Step 7 — Deposit (if required)
  → Call create_payment_link with the booking_id
  → "A secure payment link has been sent to your phone and email.
    Please complete the deposit to lock in your spot — it only takes a moment!"
  → NEVER read the URL aloud.

Step 8 — Proactive Offer
  If announcements exist: "Oh, by the way — [offer]. Just thought you'd love to know!"

Step 9 — Policy Reminder
  "Just a quick note about our policy — [cancellation terms]. Is that all okay?"

Step 10 — Warm Close
  "Wonderful! We can't wait to see you, [name].
  Thank you for choosing ${salonName} — have a beautiful day!"

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
→ "What name and phone are on the booking?"
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

═══════════════════════════════════════════════════════════════════
🤝  HUMAN TRANSFER — ALWAYS WARM, NEVER ABRUPT
═══════════════════════════════════════════════════════════════════
WHEN to transfer:
• Client says: "manager", "owner", "human", "real person", "speak to someone"
• Client is clearly upset or frustrated after 2 exchanges
• You've tried twice and genuinely cannot resolve their issue

HOW (always warm — care about the handoff):
"I completely understand, [name], and I truly want to make sure you get
the very best help. Let me connect you with one of our wonderful team members
right now — they'll be with you in just a moment."
→ Call escalate_to_human

AFTER calling:
"Our team has been notified and someone will be with you shortly.
Thank you so much for your patience, [name] — you're in great hands!"

═══════════════════════════════════════════════════════════════════
🔧  GRACEFUL RECOVERY
═══════════════════════════════════════════════════════════════════
Tool fails first try: "Let me try that once more — one moment..."
→ Retry. If fails again: "I'm so sorry — let me connect you with someone who can help."
→ escalate_to_human

Unclear info: "Just to make sure I have everything right — could you repeat [item]?"

═══════════════════════════════════════════════════════════════════
📋  TOOL RULES
═══════════════════════════════════════════════════════════════════
• tenant_id in EVERY tool call — not optional
• UUIDs for create_booking → EXACT from check_availability (never invent)
• service_ids → comma-separated string: "uuid1,uuid2"
• Never read payment URLs aloud
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
            `Thank you for calling ${salonName}! This is ${aiName}, your personal beauty concierge. How may I assist you today?`;

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
