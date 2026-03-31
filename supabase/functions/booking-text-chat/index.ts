import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { slug, tenantId, messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Missing messages" }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // ── Resolve tenant ──
    let tId = tenantId;
    let salonName = 'Our Salon';
    let salonPhone = '';
    let salonAddress = '';

    if (!tId && slug) {
      const { data } = await supabase.from('tenants').select('id, salon_name, phone, address').eq('slug', slug).single();
      if (data) { tId = data.id; salonName = data.salon_name || salonName; salonPhone = data.phone || ''; salonAddress = data.address || ''; }
    } else if (tId) {
      const { data } = await supabase.from('tenants').select('id, salon_name, phone, address').eq('id', tId).single();
      if (data) { salonName = data.salon_name || salonName; salonPhone = data.phone || ''; salonAddress = data.address || ''; }
    }

    // ── Fetch real salon data ──
    const [svcRes, staffRes, aiRes, hrRes] = await Promise.all([
      tId ? supabase.from('services').select('name, category, price, duration, deposit_amount, description').eq('tenant_id', tId).eq('is_active', true).order('category, name').limit(60) : Promise.resolve({ data: [] }),
      tId ? supabase.from('staff').select('name, specialties, bio').eq('tenant_id', tId).eq('is_active', true).limit(20) : Promise.resolve({ data: [] }),
      tId ? supabase.from('ai_agent_config').select('custom_knowledge, system_prompt').eq('tenant_id', tId).single() : Promise.resolve({ data: null }),
      tId ? supabase.from('business_hours').select('day_of_week, open_time, close_time, is_closed').eq('tenant_id', tId).order('day_of_week').limit(7) : Promise.resolve({ data: [] }),
    ]);

    const services: any[] = (svcRes as any).data || [];
    const staff: any[] = (staffRes as any).data || [];
    const aiConfig: any = (aiRes as any).data;
    const hours: any[] = (hrRes as any).data || [];

    // ── Format services ──
    let servicesText = 'No services listed yet.';
    if (services.length > 0) {
      const grouped: Record<string, any[]> = {};
      services.forEach((s) => { const cat = s.category || 'General'; if (!grouped[cat]) grouped[cat] = []; grouped[cat].push(s); });
      servicesText = Object.entries(grouped).map(([cat, svcs]) =>
        `${cat}:\n` + svcs.map((s) => `  - ${s.name}: $${s.price || 0} (${s.duration || 30} min)${s.deposit_amount ? `, $${s.deposit_amount} deposit` : ''}${s.description ? ` [${s.description}]` : ''}`).join('\n')
      ).join('\n\n');
    }

    // ── Format staff ──
    const staffText = staff.length > 0
      ? staff.map((s) => `- ${s.name}${s.specialties ? ` (specializes in: ${s.specialties})` : ''}${s.bio ? `: ${s.bio}` : ''}`).join('\n')
      : 'Our expert team is ready to serve you.';

    // ── Format hours ──
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const hoursText = hours.length > 0
      ? hours.map((h) => h.is_closed ? `${dayNames[h.day_of_week]}: Closed` : `${dayNames[h.day_of_week]}: ${(h.open_time || '09:00').substring(0, 5)} - ${(h.close_time || '18:00').substring(0, 5)}`).join('\n')
      : '';

    const customKnowledge = aiConfig?.custom_knowledge || '';

    // ── Gemini system prompt ──
    const systemPrompt = `You are Bella, the friendly AI chat assistant for "${salonName}" on their online booking website.

CRITICAL RULES:
- This is a WEBSITE TEXT CHAT — NOT a phone call. Never say "Thank you for calling"
- Keep replies SHORT and friendly (2-4 sentences max, unless listing services)
- You understand typos and informal language (English + Urdu/Roman Urdu is fine)
- For booking: tell them to use the booking form on THIS PAGE (scroll up)
- For time slots/availability: tell them to use the booking form or call
- Use ONLY the real data below. Do NOT make up services, prices, or staff

=== ${salonName.toUpperCase()} REAL DATA ===

SERVICES & PRICES:
${servicesText}

OUR TEAM:
${staffText}

${hoursText ? `HOURS:\n${hoursText}` : ''}
${salonAddress ? `\nLOCATION: ${salonAddress}` : ''}
${salonPhone ? `\nPHONE/WHATSAPP: ${salonPhone}` : ''}
${customKnowledge ? `\nSALON POLICIES/INFO:\n${customKnowledge}` : ''}
=== END ===`;

    const lastUserMsg = messages[messages.length - 1];
    const userText = lastUserMsg.content || '';

    // ── Try Gemini Flash (primary) ──
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    let replyText = '';

    if (geminiKey) {
      const geminiHistory = messages.slice(0, -1).map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const geminiBody = {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [...geminiHistory, { role: 'user', parts: [{ text: userText }] }],
        generationConfig: { maxOutputTokens: 500, temperature: 0.7, topP: 0.9 }
      };

      const callGemini = async () => fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(geminiBody) }
      );

      let gRes = await callGemini();
      if (gRes.status === 429) {
        await new Promise(r => setTimeout(r, 3000));
        gRes = await callGemini();
      }

      if (gRes.ok) {
        const gData = await gRes.json();
        replyText = gData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        console.log(`[${salonName}] Gemini OK: "${replyText.substring(0, 60)}"`);
      } else {
        const errJson = await gRes.json().catch(() => ({}));
        console.error(`[${salonName}] Gemini ${gRes.status}:`, errJson?.error?.message);
      }
    }

    // ── Smart fallback (always works, no external API needed) ──
    if (!replyText) {
      console.log(`[${salonName}] Using smart fallback for: "${userText.substring(0, 40)}"`);
      const m = userText.toLowerCase();

      if (/^(hi|hey|hello|salam|hola|assalam|yo|sup)\b/i.test(m.trim()) || /salam|good\s*(morning|evening|afternoon)/i.test(m)) {
        replyText = `Hi! 👋 Welcome to **${salonName}**. I'm Bella, your AI assistant!\n\nI can help with services & prices, our team, booking info, and opening hours. What can I help you with?`;

      } else if (/book|appoint|schedul|reserve|slot|fix appointment|want.*appoint|need.*appoint/i.test(m)) {
        const found = services.find((s) => m.includes(s.name.toLowerCase().split(' ')[0]));
        if (found) {
          replyText = `Great choice! 🌟 **${found.name}** — $${found.price || 0} (${found.duration || 30} min)${found.deposit_amount ? `, $${found.deposit_amount} deposit` : ''}.\n\nScroll up and select it from the booking form to pick your date & time! 📅`;
        } else {
          replyText = `Sure! Here's how to book at **${salonName}** 📅:\n1. Select your service above\n2. Choose your stylist\n3. Pick a date & time\n4. Enter your details\n\nThe booking form is right on this page — scroll up! 👆`;
        }

      } else if (/service|offer|what.*have|haircut|color|highlight|keratin|blowout|facial|wax|nail|brow|lash|treatment/i.test(m)) {
        if (services.length > 0) {
          const sample = services.slice(0, 7).map((s) => `• ${s.name}: $${s.price || 0}`).join('\n');
          replyText = `Here's what we offer at **${salonName}** 💅:\n\n${sample}${services.length > 7 ? `\n\n_...and ${services.length - 7} more in the booking form above!_` : ''}\n\nSelect any service to book! 👆`;
        } else {
          replyText = `We offer a full range of beauty services at **${salonName}**! See them all in the booking form above. 💇`;
        }

      } else if (/price|cost|how much|rate|fee|charg|\$/i.test(m)) {
        if (services.length > 0) {
          const match = services.find((s) => m.split(/\s+/).some((w) => w.length > 3 && s.name.toLowerCase().includes(w)));
          if (match) {
            replyText = `**${match.name}** is **$${match.price || 0}** (${match.duration || 30} min)${match.deposit_amount ? `, deposit: $${match.deposit_amount}` : ''}. Select it in the booking form above! 📅`;
          } else {
            const sample = services.slice(0, 6).map((s) => `• ${s.name}: $${s.price || 0}`).join('\n');
            replyText = `Prices at **${salonName}** 💰:\n\n${sample}\n\nAll prices in the booking form above!`;
          }
        } else {
          replyText = `Please check the booking form above for our current prices, or call us${salonPhone ? ` at ${salonPhone}` : ''}!`;
        }

      } else if (/staff|team|stylist|who|expert|speciali|barber/i.test(m)) {
        if (staff.length > 0) {
          const list = staff.map((s) => `• **${s.name}**${s.specialties ? ` — ${s.specialties}` : ''}`).join('\n');
          replyText = `Meet the team at **${salonName}** 👥:\n\n${list}\n\nChoose your stylist when booking above!`;
        } else {
          replyText = `Our expert stylists at **${salonName}** are ready to serve you! Choose your preferred stylist in the booking form above.`;
        }

      } else if (/hour|open|close|timing|when.*open|schedule/i.test(m)) {
        if (hoursText) {
          replyText = `**${salonName}** opening hours 🕐:\n\n${hoursText}\n\nBook anytime online using the form above!`;
        } else {
          replyText = `Contact **${salonName}**${salonPhone ? ` at ${salonPhone}` : ''} for our current hours. You can also try booking online — available slots will show up! 📅`;
        }

      } else if (/where|locat|address|directi|find you/i.test(m)) {
        replyText = salonAddress
          ? `📍 Find us at: **${salonAddress}**\n\nWe look forward to seeing you! Book your appointment in the form above.`
          : `For our location, contact **${salonName}**${salonPhone ? ` at ${salonPhone}` : ''}. We'd love to see you! 📍`;

      } else if (/cancel|reschedul|postpone|move|change.*appoint/i.test(m)) {
        replyText = `To cancel or reschedule your appointment at **${salonName}**:\n• Check your confirmation email for a manage link\n• Or call us${salonPhone ? ` at **${salonPhone}**` : ''}\n\n⚠️ 24-hour cancellation notice is appreciated!`;

      } else if (/thank|shukriya|jazak/i.test(m)) {
        replyText = `You're so welcome! 😊 Is there anything else I can help with? Book your next appointment at **${salonName}** using the form above!`;

      } else if (/contact|phone|whatsapp|call|number|email/i.test(m)) {
        replyText = salonPhone
          ? `You can reach **${salonName}** at 📞 **${salonPhone}**\n\nOr simply use the online booking form on this page! 💻`
          : `For contact details, please use the booking form above or look for our info on the page!`;

      } else {
        if (services.length > 0) {
          const top = services.slice(0, 4).map((s) => `• ${s.name} ($${s.price || 0})`).join('\n');
          replyText = `Hi! I'm Bella from **${salonName}** 😊 I can help with:\n\n${top}\n\n...and more! What would you like to know?`;
        } else {
          replyText = `Hi! I'm Bella, your AI assistant for **${salonName}**. 😊 Ask me about services, prices, booking, our team, or opening hours!`;
        }
      }
    }

    return new Response(JSON.stringify({
      message: replyText,
      salon: salonName,
      choices: [{ message: { role: 'assistant', content: replyText } }]
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("booking-text-chat error:", error.message);
    return new Response(JSON.stringify({
      message: "Hi! 😊 I'm Bella. Use the booking form above to schedule your appointment, or ask me about our services!",
      choices: [{ message: { role: 'assistant', content: "Use the booking form above to get started!" } }]
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
