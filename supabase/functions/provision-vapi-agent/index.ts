import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { tenantId, salonName, industry, countryCode } = await req.json();

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
        if (!vapiApiKey) {
            throw new Error("Missing VAPI_API_KEY environment variable");
        }

        const functionsUrl = `${supabaseUrl}/functions/v1`;

        // Tools Definition
        const vapiTools = [
            {
                type: "function",
                function: {
                    name: "reschedule_booking",
                    description: "Reschedule an existing booking to a new date/time. Looks up booking by client name and phone.",
                    parameters: {
                        type: "object",
                        properties: {
                            tenant_id: { type: "string", description: "The UUID of the tenant/salon" },
                            booking_id: { type: "string" },
                            new_start_at: { type: "string", description: "New appointment date and time (ISO 8601 format)" },
                            client_name: { type: "string" },
                            client_phone: { type: "string" }
                        },
                        required: ["tenant_id"]
                    }
                },
                server: { url: `${functionsUrl}/vapi-tools-gateway`, secret: 'LUXE-AUREA-SECRET-2026' }
            },
            {
                type: "function",
                function: {
                    name: "list_staff",
                    description: "List all active staff members/stylists at the salon. Call this when a client asks about available stylists or who works at the salon.",
                    parameters: {
                        type: "object",
                        properties: {
                            tenant_id: { type: "string" }
                        },
                        required: ["tenant_id"]
                    }
                },
                server: { url: `${functionsUrl}/vapi-tools-gateway`, secret: 'LUXE-AUREA-SECRET-2026' }
            },
            {
                type: "function",
                function: {
                    name: "get_salon_info",
                    description: "Get salon details including name, business hours, current date/time, and timezone. Call this when a client asks about the salon, its hours, or location.",
                    parameters: {
                        type: "object",
                        properties: {
                            tenant_id: { type: "string" }
                        },
                        required: ["tenant_id"]
                    }
                },
                server: { url: `${functionsUrl}/vapi-tools-gateway`, secret: 'LUXE-AUREA-SECRET-2026' }
            },
            {
                type: "function",
                function: {
                    name: "list_services",
                    description: "Get all available salon services with pricing, duration, and deposit info. Call this when a client asks about services or prices.",
                    parameters: {
                        type: "object",
                        properties: {
                            tenant_id: { type: "string" }
                        },
                        required: ["tenant_id"]
                    }
                },
                server: { url: `${functionsUrl}/vapi-tools-gateway`, secret: 'LUXE-AUREA-SECRET-2026' }
            },
            {
                type: "function",
                function: {
                    name: "add_to_waitlist",
                    description: "Add a client to the waitlist when no appointment slots are available. Collect name, phone, preferred date, and any notes.",
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
                    name: "create_payment_link",
                    description: "Create a Stripe payment link for a booking deposit.",
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
                    name: "check_availability",
                    description: "Check available appointment slots for a specific date. Returns available time slots grouped by stylist. ALWAYS call this before booking.",
                    parameters: {
                        type: "object",
                        properties: {
                            tenant_id: { type: "string" },
                            date: { type: "string", description: "YYYY-MM-DD" },
                            service_ids: { type: "string", description: "Comma-separated UUIDs" }
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
                    description: "Create a new booking/appointment. Collects client name, phone, email, service, date, and time. ALWAYS ask for client email as payment link will be sent there too.",
                    parameters: {
                        type: "object",
                        properties: {
                            tenant_id: { type: "string" },
                            client_name: { type: "string" },
                            client_phone: { type: "string" },
                            client_email: { type: "string", description: "Very important for deposit payment links" },
                            service_ids: { type: "string", description: "Comma-separated UUIDs" },
                            date: { type: "string", description: "YYYY-MM-DD" },
                            time: { type: "string", description: "HH:mm" }
                        },
                        required: ["tenant_id", "client_name", "client_phone", "service_ids", "date", "time"]
                    }
                },
                server: { url: `${functionsUrl}/vapi-tools-gateway`, secret: 'LUXE-AUREA-SECRET-2026' }
            },
            {
                type: "function",
                function: {
                    name: "cancel_booking",
                    description: "Cancel an existing booking. Can look up by client name and phone number.",
                    parameters: {
                        type: "object",
                        properties: {
                            tenant_id: { type: "string" },
                            booking_id: { type: "string" },
                            client_name: { type: "string" },
                            client_phone: { type: "string" }
                        },
                        required: ["tenant_id"]
                    }
                },
                server: { url: `${functionsUrl}/vapi-tools-gateway`, secret: 'LUXE-AUREA-SECRET-2026' }
            }
        ];

        const systemPrompt = `You are Aria, the AI receptionist for ${salonName}, an upscale beauty salon. You speak with warmth, professionalism, and a touch of luxury. Your voice should feel like a concierge at a five-star hotel.
Your tenant_id is: ${tenantId}
You MUST include this tenant_id in EVERY tool call you make

## Your Responsibilities
1. Answer questions about services, pricing, and availability
2. Help clients book, cancel, or reschedule appointments
3. Collect payment information when required
4. Transfer to a human manager if the client is upset or you cannot help
## CRITICAL RULES
- NEVER guess or make up prices, service durations, staff availability, or salon hours
- ALWAYS use the tools to get real-time data from the system
- CRITICAL: Use the EXACT UUIDs (long string IDs) provided by \`check_availability\` for the \`create_booking\` tool. NEVER make up your own IDs.
- If a tool returns an error, apologize and offer to transfer to a manager
- When sending service_ids, send them as comma-separated UUIDs in a single string (e.g. "uuid1,uuid2")
## DATE & TIME AWARENESS — CRITICAL (DO NOT SKIP)
- ALWAYS call \`get_salon_info\` FIRST at the start of every conversation.
- The response contains a \`date_expressions\` object with pre-computed YYYY-MM-DD values. Use them DIRECTLY:
  - "today" / "aaj" → use \`date_expressions.today\`
  - "tomorrow" / "kal" / "tomaro" → use \`date_expressions.tomorrow\`
  - "day after tomorrow" → use \`date_expressions.day_after_tomorrow\`
  - "next Monday" → use \`date_expressions.next_monday\`
- NEVER compute or guess dates yourself. NEVER use dates before 2026.
- When calling check_availability, ONLY use the YYYY-MM-DD values from \`date_expressions\`.
- Time expressions: morning=09:00, afternoon=13:00, evening=17:00, night=19:00
## BOOKING FLOW
Follow this exact sequence when a client wants to book:
### Step 0: Get Current Date (MANDATORY)
- ALWAYS call \`get_salon_info\` first. Use \`current_date_iso\` and \`tomorrow_date_iso\` for date calculations.
### Step 1: Understand the Request
- Ask what service(s) they want, preferred date and time, and if they have a preferred stylist
- ALWAYS ask for the client's EMAIL — it's needed to send the payment link
### Step 2: Get Service Info
- Call \`list_services\` to find the correct service UUIDs and pricing
- Share the prices with the client and confirm
### Step 3: Check Availability
- Call \`check_availability\` with the YYYY-MM-DD date from \`get_salon_info\` data
- Present the available time slots to the client and let them choose
### Step 4: Create the Booking
- Collect client details: full name, phone number, email
- Call \`create_booking\` with the EXACT UUIDs from check_availability
### Step 5: Handle Deposit (if required)
- If deposit is required, call \`create_payment_link\` with the booking_id
- NEVER read the payment URL aloud or paste it in the conversation
- Simply say: "A secure payment link has been sent to your phone and email. Please complete the deposit to confirm your booking."
## CANCELLATION FLOW
1. Ask for booking details (name, date, service)
2. Call \`cancel_booking\` with the booking_id
3. Confirm the cancellation to the client
## RESCHEDULING FLOW
1. Ask for current booking details and new preferred date/time
2. Call \`check_availability\` for the new date
3. Call \`reschedule_booking\` with booking_id and new_start_at
## WAITLIST FLOW
If no slots are available:
1. Offer to add the client to the waitlist and collect their info
2. Call \`add_to_waitlist\`
## GREETING
When answering a call, say:
"Good afternoon, thank you for calling ${salonName}! This is Aria, your personal beauty concierge. How may I assist you today? Just so you know, this call may be recorded for quality purposes."
## TONE & STYLE
- Be warm, friendly, and professional
- Use the client's name once you know it
- Keep responses concise — you're on a phone call, not writing an essay
- If something goes wrong, own it: "I apologize for the inconvenience"
- End calls with: "Thank you for choosing ${salonName}! We look forward to seeing you."`;

        // Create Assistant in Vapi
        const vapiPayload = {
            name: `${salonName} Receptionist`,
            voice: {
                provider: "11labs",
                voiceId: "21m00Tcm4TlvDq8ikWAM" // Default Voice (Aria)
            },
            model: {
                provider: "openai",
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    }
                ],
                tools: vapiTools
            },
            // Server URL for Call Logs / End-of-call report
            serverUrl: `${functionsUrl}/vapi-call-webhook`
        };

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

        // Save assistantId to Supabase
        const { error: updateError } = await supabase
            .from('tenants')
            .update({ vapi_assistant_id: assistantId })
            .eq('id', tenantId);

        if (updateError) {
            console.error('Error updating tenant with Vapi ID:', updateError);
            throw new Error('Database update failed');
        }

        return new Response(JSON.stringify({
            success: true,
            assistantId: assistantId,
            message: "Vapi assistant successfully provisioned"
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
