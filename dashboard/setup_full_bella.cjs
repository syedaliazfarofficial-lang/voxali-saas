// Full Vapi agent setup matching old Misbah/Glamaura config — on NEW account
const https = require('https');

const VAPI_PRIVATE_KEY = '944a1b75-bc45-4ad4-80bc-6974b0695dab';
const RILEY_ASSISTANT_ID = '9b7b1de9-7fc9-4bf2-9088-4956b86e5eb3';
const TENANT_ID = '5bd5fbd4-cbff-4f69-8fe2-e58939768ae8';
const SALON_NAME = 'Glamaura Beauty Salon';
const AI_NAME = 'Bella';
const FUNCTIONS_URL = 'https://sjzxgjimbcoqsylrglkm.supabase.co/functions/v1';
const TOOLS_SECRET = 'LUXE-AUREA-SECRET-2026';

const systemPrompt = `You are ${AI_NAME}, the personal beauty concierge at ${SALON_NAME}.
Your tenant_id: ${TENANT_ID} — include it in EVERY single tool call without exception.

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

FILLER WORDS (Use ONLY these approved phrases before querying data):
  'Allow me a moment to check that for you...'
  'One moment, please, while I look that up...'
  'Let me quickly pull up those details...'
BANNED PHRASES (NEVER use these):
  NEVER say: 'Hold on a sec', 'Just a sec', 'Hold on', 'One sec', 'Give me a sec'
  NEVER say: 'Sure thing', 'No worries', 'Yep', 'Yup', 'Yeah', 'Ok so'
  Instead always say: 'Certainly', 'Of course', 'It would be my pleasure'
EMPATHY FIRST:
"I am so sorry to hear that. Please focus on getting well. We can easily reschedule when you feel better."

═══════════════════════════════════════════════════════════════════
🔴  THE GOLDEN RULE — DATA AUTHORITY (NEVER BREAK THIS)
═══════════════════════════════════════════════════════════════════
You ONLY share information confirmed through your live tools. Never guess. Never invent.
Priority: 1. LIVE TOOL DATA  2. KNOWLEDGE BASE  3. ANNOUNCEMENTS

═══════════════════════════════════════════════════════════════════
⏰  DATE & TIME — CRITICAL ACCURACY
═══════════════════════════════════════════════════════════════════
• Call get_salon_info at the START of every conversation.
• NEVER guess or speak a time that the client did not agree to.
• Use ONLY the date_expressions object from the response.
• Time shortcuts: morning=09:00 | afternoon=13:00 | evening=17:00 | night=19:00

═══════════════════════════════════════════════════════════════════
💬  CONVERSATION STYLE — NO LONG LISTS!
═══════════════════════════════════════════════════════════════════
NEVER list more than 2 or 3 available time slots or services.
✅ Always: "I have an opening at 10 AM or 11:30 AM. Do either of those work for you?"
ALWAYS ask one question, wait for the answer, then ask the next.

═══════════════════════════════════════════════════════════════════
📅  BOOKING FLOW — FOLLOW EXACTLY
═══════════════════════════════════════════════════════════════════
Step 1: Service - Call list_services. Share price.
Step 2: Date - Use date_expressions from get_salon_info.
Step 3: Stylist - "Do you have a preferred stylist?"
Step 4: Availability - Call check_availability. Offer only 2 options.
Step 5: Client Details ONE AT A TIME:
  a. First name -> wait -> 'And your last name?'
  b. Phone -> wait -> read back digit by digit
  c. Email -> wait -> ask to SPELL it out -> check for typos
  d. Ask: 'Is this your first visit, or have you been before?'
Step 6: PRE-BOOKING READBACK (MANDATORY):
  'Just to confirm -- [Full Name], [phone], [email], [date] at [time] for [service]. All correct?'
  Wait for YES before calling create_booking.
Step 7: Create Booking with EXACT UUIDs from check_availability.
Step 8: Payment/Deposit if required.
Step 9: Proactive Upsell (Only once).
Step 10: Very Short Close.

═══════════════════════════════════════════════════════════════════
❌  CANCELLATION & RESCHEDULING
═══════════════════════════════════════════════════════════════════
Gather Name & Phone -> Call cancel_booking or reschedule_booking (YYYY-MM-DDTHH:mm:00).

═══════════════════════════════════════════════════════════════════
🤝  HUMAN TRANSFER — ALWAYS WARM
═══════════════════════════════════════════════════════════════════
Transfer when client says: "manager", "owner", "human", "real person"
"I completely understand. Let me connect you with our salon manager right now."
→ Call escalate_to_human

═══════════════════════════════════════════════════════════════════
📋  TOOL RULES
═══════════════════════════════════════════════════════════════════
• tenant_id in EVERY tool call — not optional
• UUIDs for create_booking → EXACT from check_availability (never invent)
• service_ids → comma-separated string

--- DATA VALIDATION RULES ---
FULL NAME: Collect first AND last separately. Spell unusual names letter by letter.
PHONE: Repeat digit by digit. 'Is 0-3-1-2-1-2-3-4-5-6-7 correct?'
EMAIL: Ask to spell letter by letter. Spell back to confirm. Check typos.
FIRST VISIT: 'Is this your first visit with us, or have you been before?'
Tool error → apologize + offer human transfer

═══════════════════════════════════════════════════════════════════
🔒  PRIVACY
═══════════════════════════════════════════════════════════════════
"Your personal information is used only to manage your appointments at ${SALON_NAME} and will never be shared with third parties. This call may be recorded for quality and training purposes only."`;

function makeTool(name, description, parameters) {
  return {
    type: 'function',
    function: { name, description, parameters },
    server: { url: `${FUNCTIONS_URL}/vapi-tools-gateway`, secret: TOOLS_SECRET }
  };
}

const tools = [
  makeTool('get_salon_info',
    'CALL THIS FIRST at the start of every conversation. Returns salon details, current date/time, business hours, and pre-computed date_expressions (today, tomorrow, etc.). Required for all date/time awareness.',
    { type: 'object', properties: { tenant_id: { type: 'string' } }, required: ['tenant_id'] }),

  makeTool('list_services',
    'Get all available salon services with exact pricing, duration, and deposit requirements. Call when client asks about services or prices, or before booking.',
    { type: 'object', properties: { tenant_id: { type: 'string' } }, required: ['tenant_id'] }),

  makeTool('list_staff',
    'Get all active stylists/staff at the salon. Call when client asks about who works there or requests a specific stylist.',
    { type: 'object', properties: { tenant_id: { type: 'string' } }, required: ['tenant_id'] }),

  makeTool('check_availability',
    'Check available appointment slots for a specific date. Returns available times grouped by stylist. ALWAYS call this before creating a booking. Use YYYY-MM-DD from date_expressions only.',
    { type: 'object', properties: { tenant_id: { type: 'string' }, date: { type: 'string', description: 'YYYY-MM-DD — use ONLY from date_expressions' }, service_ids: { type: 'string', description: 'Comma-separated service UUIDs' } }, required: ['tenant_id', 'date'] }),

  makeTool('create_booking',
    'Create a new appointment. Use EXACT UUIDs from check_availability — never invent IDs. Always collect client name, phone, email, service, date, and time first.',
    { type: 'object', properties: { tenant_id: { type: 'string' }, client_name: { type: 'string' }, client_phone: { type: 'string' }, client_email: { type: 'string', description: 'Required for confirmation and payment link' }, service_ids: { type: 'string', description: 'Comma-separated UUIDs from check_availability' }, date: { type: 'string', description: 'YYYY-MM-DD' }, time: { type: 'string', description: 'HH:mm' }, staff_id: { type: 'string', description: 'UUID from check_availability (if client chose a stylist)' } }, required: ['tenant_id', 'client_name', 'client_phone', 'service_ids', 'date', 'time'] }),

  makeTool('create_payment_link',
    'Generate a Stripe payment link for a deposit. Call after create_booking if deposit is required. Never read the URL aloud — just confirm it was sent.',
    { type: 'object', properties: { tenant_id: { type: 'string' }, booking_id: { type: 'string' } }, required: ['tenant_id', 'booking_id'] }),

  makeTool('cancel_booking',
    'Cancel an existing booking. Look up by client name and phone number.',
    { type: 'object', properties: { tenant_id: { type: 'string' }, client_name: { type: 'string' }, client_phone: { type: 'string' }, booking_id: { type: 'string' } }, required: ['tenant_id'] }),

  makeTool('reschedule_booking',
    'Reschedule an existing booking to a new date/time. Look up by client name and phone. new_start_at format: YYYY-MM-DDTHH:mm:00',
    { type: 'object', properties: { tenant_id: { type: 'string' }, client_name: { type: 'string' }, client_phone: { type: 'string' }, booking_id: { type: 'string' }, new_start_at: { type: 'string', description: 'YYYY-MM-DDTHH:mm:00' } }, required: ['tenant_id', 'new_start_at'] }),

  makeTool('add_to_waitlist',
    'Add a client to the priority waitlist when no slots are available.',
    { type: 'object', properties: { tenant_id: { type: 'string' }, client_name: { type: 'string' }, client_phone: { type: 'string' }, client_email: { type: 'string' }, preferred_date: { type: 'string', description: 'YYYY-MM-DD' }, time_window: { type: 'string' }, notes: { type: 'string' } }, required: ['tenant_id', 'client_name', 'client_phone', 'preferred_date'] }),

  makeTool('escalate_to_human',
    'Escalate to a human team member. Use ONLY when: client explicitly asks for manager/human, client is upset after 2 exchanges, or you cannot resolve after 2 genuine attempts.',
    { type: 'object', properties: { tenant_id: { type: 'string' }, caller_phone: { type: 'string' }, issue_summary: { type: 'string', description: 'Brief 1-sentence reason for escalation' } }, required: ['tenant_id', 'caller_phone', 'issue_summary'] }),
];

const payload = {
  name: `${AI_NAME} - ${SALON_NAME}`,
  firstMessage: `Welcome to ${SALON_NAME}. This is ${AI_NAME}. How may I assist you today?`,
  voice: {
    provider: '11labs',
    voiceId: '21m00Tcm4TlvDq8ikWAM',
    model: 'eleven_turbo_v2_5',
    stability: 0.45,
    similarityBoost: 0.8
  },
  transcriber: {
    provider: 'deepgram',
    model: 'nova-2',
    language: 'en'
  },
  model: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.4,
    messages: [{ role: 'system', content: systemPrompt }],
    tools
  }
};

const body = JSON.stringify(payload);
const options = {
  hostname: 'api.vapi.ai',
  path: `/assistant/${RILEY_ASSISTANT_ID}`,
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
};

console.log(`🚀 Configuring full Bella agent for ${SALON_NAME}...`);
console.log(`   Assistant ID: ${RILEY_ASSISTANT_ID}`);
console.log(`   Tenant ID:    ${TENANT_ID}`);
console.log(`   Tools:        ${tools.length} tools configured`);

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(`\n   HTTP Status: ${res.statusCode}`);
    if (res.statusCode === 200 || res.statusCode === 201) {
      const result = JSON.parse(data);
      console.log('\n✅ SUCCESS! Full Bella agent configured!');
      console.log(`   Name:         ${result.name}`);
      console.log(`   ID:           ${result.id}`);
      console.log(`   Voice:        11labs - ${result.voice?.voiceId}`);
      console.log(`   Model:        ${result.model?.model}`);
      console.log(`   Tools:        ${result.model?.tools?.length || 0} tools`);
      console.log('\n🎉 Bella is now fully operational on the new Vapi account!');
      console.log('   Same config as old Misbah Salon agent — ready for Glamaura.');
    } else {
      console.error('❌ Error:', data.substring(0, 500));
    }
  });
});

req.on('error', (err) => console.error('❌ Request error:', err.message));
req.write(body);
req.end();
