// Edge Function: send-low-balance-alert
// Sends warning email when AI minutes or SMS are running low
// Also handles AI pause by updating Vapi assistant message
// Called from: get-vapi-logs, fix-minutes

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { jsonResponse, errorResponse, handleCORS } from '../_shared/utils.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPI_API_KEY = Deno.env.get('VAPI_API_KEY') || '';
const RESEND_KEY = Deno.env.get('RESEND_API_KEY') || '';

// Thresholds
const LOW_BALANCE_PCT = 20;   // Send warning when < 20% remaining
const CRITICAL_PCT   = 5;    // Send critical warning at < 5%

// ===== Run DB migration to add columns if missing =====
async function ensureColumns(supabase: any) {
    try {
        // Try to set low_balance_alert_sent — if column missing, we'll add it
        await supabase.rpc('exec_ddl').catch(() => null);
    } catch { /* ignore */ }
}

// ===== Send email via Resend =====
async function sendEmail(to: string, subject: string, html: string) {
    if (!RESEND_KEY || !to) {
        console.log(`Email skipped (no key or email). To: ${to}, Subject: ${subject}`);
        return false;
    }
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            from: 'Voxali Platform <alerts@voxali.net>',
            to: [to],
            subject,
            html,
        }),
    });
    const data = await res.json();
    console.log('Email sent:', data.id || JSON.stringify(data));
    return res.ok;
}

// ===== Update Vapi assistant first message when paused =====
async function pauseVapiAssistant(assistantId: string, salonPhone: string, salonName: string) {
    if (!VAPI_API_KEY || !assistantId) return;
    const pauseMsg = `Thank you for calling ${salonName || 'our salon'}. We are currently unable to take bookings. Please call ${salonPhone || 'our number'} to speak with our team. Goodbye!`;
    
    const systemPrompt = `You are a short pre-recorded message system. Your ONLY task is to deliver the message below and then say "Goodbye!" to end the call. You must NOT answer questions, take bookings, engage in conversation, or respond to anything the user says. No matter what the user says, respond ONLY with: "Goodbye!"

Message you already delivered: "${pauseMsg}"

INSTRUCTIONS:
- Do NOT help with appointments or bookings
- Do NOT answer any questions  
- Do NOT continue any conversation
- If user says ANYTHING, your ONLY response is: "Goodbye!"
- Then the call will end automatically`;

    try {
        const res = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${VAPI_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                firstMessage: pauseMsg,
                endCallPhrases: ['Goodbye!', 'Goodbye', 'goodbye'],  // ✅ Call cuts when Bella says Goodbye
                maxDurationSeconds: 25,                               // ✅ Hard cap 25 seconds
                model: {
                    provider: 'openai',
                    model: 'gpt-4o-mini',
                    messages: [{ role: 'system', content: systemPrompt }],
                    temperature: 0,
                    maxTokens: 20,   // ✅ Force very short replies
                },
            }),
        });
        if (res.ok) {
            console.log(`Vapi assistant ${assistantId} fully paused — endCallPhrases + system prompt updated`);
        } else {
            const err = await res.text();
            console.error('Vapi patch error:', err);
        }
    } catch (e: any) {
        console.error('pauseVapiAssistant error:', e.message);
    }
}

// ===== Email templates =====
function lowMinutesEmail(salonName: string, remaining: number, total: number, pct: number, topupUrl: string) {
    return `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#111;color:#fff;border-radius:12px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,#D4AF37,#B8962E);padding:24px 32px;">
    <h1 style="margin:0;font-size:22px;">⚠️ Your AI Minutes Are Running Low</h1>
    <p style="margin:8px 0 0;opacity:0.85;">Action required for ${salonName}</p>
  </div>
  <div style="padding:32px;">
    <div style="background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:20px;margin-bottom:24px;text-align:center;">
      <p style="margin:0;font-size:36px;font-weight:bold;color:#D4AF37;">${remaining}</p>
      <p style="margin:4px 0 0;color:#888;font-size:14px;">AI MINUTES REMAINING</p>
      <div style="background:#333;height:8px;border-radius:4px;margin:16px 0 8px;">
        <div style="background:${pct < 5 ? '#ef4444' : '#f97316'};height:8px;border-radius:4px;width:${pct}%;"></div>
      </div>
      <p style="color:#888;font-size:12px;margin:0;">${Number(pct).toFixed(1)}% remaining of ${total} total minutes</p>
    </div>
    <p style="color:#ccc;line-height:1.6;">Your Bella AI Receptionist will continue working until your minutes reach 0. <strong style="color:#D4AF37;">Top up now</strong> to avoid service interruption.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${topupUrl}" style="background:#D4AF37;color:#000;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">Top Up Minutes Now</a>
    </div>
    <p style="color:#555;font-size:12px;text-align:center;">Voxali Platform · <a href="${topupUrl}" style="color:#D4AF37;">Manage your plan</a></p>
  </div>
</div>`;
}

function pausedEmail(salonName: string, salonPhone: string, topupUrl: string) {
    return `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#111;color:#fff;border-radius:12px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,#ef4444,#b91c1c);padding:24px 32px;">
    <h1 style="margin:0;font-size:22px;">🔴 Bella AI Has Been Paused</h1>
    <p style="margin:8px 0 0;opacity:0.85;">${salonName} — Immediate Action Required</p>
  </div>
  <div style="padding:32px;">
    <div style="background:#1a1a1a;border:1px solid #ef4444;border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0;font-weight:bold;color:#ef4444;">Your AI minutes have been exhausted.</p>
      <p style="margin:8px 0 0;color:#ccc;font-size:14px;">Bella is currently directing all callers to your salon phone number: <strong style="color:#fff;">${salonPhone || '(not set)'}</strong></p>
    </div>
    <p style="color:#ccc;line-height:1.6;">To restore Bella AI, please purchase additional minutes from your dashboard.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${topupUrl}" style="background:#ef4444;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">Buy Minutes — Restore Bella Now</a>
    </div>
    <p style="color:#555;font-size:12px;text-align:center;">Voxali Platform · <a href="${topupUrl}" style="color:#D4AF37;">Manage your plan</a></p>
  </div>
</div>`;
}

function lowSmsEmail(salonName: string, remaining: number, total: number, topupUrl: string) {
    return `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#111;color:#fff;border-radius:12px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);padding:24px 32px;">
    <h1 style="margin:0;font-size:22px;">📱 SMS Credits Running Low</h1>
    <p style="margin:8px 0 0;opacity:0.85;">${salonName}</p>
  </div>
  <div style="padding:32px;">
    <div style="background:#1a1a1a;border:1px solid #333;border-radius:8px;padding:20px;margin-bottom:24px;text-align:center;">
      <p style="margin:0;font-size:36px;font-weight:bold;color:#3b82f6;">${remaining}</p>
      <p style="margin:4px 0 0;color:#888;font-size:14px;">SMS CREDITS REMAINING of ${total}</p>
    </div>
    <p style="color:#ccc;line-height:1.6;">Your booking confirmation and reminder SMS to clients may stop sending soon. Top up to keep clients informed.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${topupUrl}" style="background:#3b82f6;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">Buy SMS Credits</a>
    </div>
  </div>
</div>`;
}

function lowStockEmail(salonName: string, productName: string, currentStock: number, threshold: number) {
    const isOutOfStock = currentStock === 0;
    const headerColor = isOutOfStock ? 'linear-gradient(135deg,#ef4444,#b91c1c)' : 'linear-gradient(135deg,#f59e0b,#d97706)';
    const borderColor = isOutOfStock ? '#ef4444' : '#f59e0b';
    const stockColor  = isOutOfStock ? '#ef4444' : '#f59e0b';
    const icon        = isOutOfStock ? '🚫' : '📦';
    const title       = isOutOfStock ? 'Out of Stock — Restock Required' : 'Low Stock Alert';
    const stockText   = isOutOfStock ? '0 units — SOLD OUT' : `${currentStock} units remaining`;
    const bodyMsg     = isOutOfStock
        ? `<strong style="color:#ef4444">${productName}</strong> is now completely out of stock. Customers can no longer purchase this product. Please restock immediately.`
        : `<strong style="color:#f59e0b">${productName}</strong> is running low. You have only <strong>${currentStock} units</strong> left in stock. Restock soon to avoid selling out.`;

    return `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#111;color:#fff;border-radius:12px;overflow:hidden;">
  <div style="background:${headerColor};padding:24px 32px;">
    <h1 style="margin:0;font-size:22px;">${icon} ${title}</h1>
    <p style="margin:8px 0 0;opacity:0.85;">${salonName}</p>
  </div>
  <div style="padding:32px;">
    <div style="background:#1a1a1a;border:1px solid ${borderColor};border-radius:8px;padding:20px;margin-bottom:24px;">
      <p style="margin:0;font-size:18px;font-weight:bold;">${productName}</p>
      <p style="margin:8px 0 0;color:${stockColor};font-size:24px;font-weight:bold;">${stockText}</p>
      ${threshold > 0 ? `<p style="margin:4px 0 0;color:#888;font-size:12px;">Alert threshold: ${threshold} units</p>` : ''}
    </div>
    <p style="color:#ccc;line-height:1.6;">${bodyMsg}</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="https://voxali.net/app" style="background:${isOutOfStock ? '#ef4444' : '#f59e0b'};color:${isOutOfStock ? '#fff' : '#000'};padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">View Inventory Dashboard</a>
    </div>
    <p style="color:#555;font-size:12px;text-align:center;margin-top:24px;">Voxali Platform — Retail Inventory Alert</p>
  </div>
</div>`;
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return handleCORS();

    try {
        let body: any = {};
        try { body = await req.json(); } catch { }

        const { tenant_id, alert_type } = body;
        // alert_type: 'check_balance' | 'low_stock'
        
        if (!tenant_id) return errorResponse('Missing tenant_id');

        const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

        // Fetch tenant — graceful fallback if new columns missing
        let tenant: any = null;
        let tenantErr: any = null;

        // Try with new columns first
        const res1 = await supabase.from('tenants').select(`
            id, salon_name, salon_email,
            owner_notification_email, owner_phone,
            vapi_assistant_id, ai_access_paused,
            ai_minutes_used, ai_minutes_included, ai_minutes_topup_balance,
            sms_used, sms_included, sms_topup_balance,
            low_balance_alert_sent, ai_paused_alert_sent
        `).eq('id', tenant_id).single();

        if (res1.error) {
            // Fallback: fetch without new columns (in case migration not run)
            const res2 = await supabase.from('tenants').select(`
                id, salon_name, salon_email,
                vapi_assistant_id, ai_access_paused,
                ai_minutes_used, ai_minutes_included, ai_minutes_topup_balance,
                sms_used, sms_included, sms_topup_balance
            `).eq('id', tenant_id).single();
            tenant = res2.data;
            tenantErr = res2.error;
        } else {
            tenant = res1.data;
        }

        if (tenantErr || !tenant) return errorResponse('Tenant not found: ' + (tenantErr?.message || 'unknown'));

        const alertEmail = tenant.owner_notification_email || tenant.salon_email || '';
        const salonName  = tenant.salon_name || 'Your Salon';
        const salonPhone = tenant.owner_phone || tenant.salon_phone || '';
        const topupUrl   = `https://voxali.net/app?tab=billing`;
        const actions: string[] = [];

        if (alert_type === 'low_stock') {
            // Retail low stock alert
            const { product_name, current_stock, threshold } = body;
            const html = lowStockEmail(salonName, product_name || 'Unknown Product', current_stock || 0, threshold || 5);
            const sent = await sendEmail(alertEmail, `📦 Low Stock: ${product_name} — ${salonName}`, html);
            return jsonResponse({ sent, alert_type: 'low_stock', email: alertEmail });
        }

        // ===== TEST MODE — sends test emails without using real credits =====
        if (alert_type === 'test_low_balance') {
            const html = lowMinutesEmail(salonName, 50, 1200, 4.2, topupUrl);
            const sent = await sendEmail(alertEmail, `[TEST] ⚠️ Low AI Balance: 50 minutes remaining — ${salonName}`, html);
            const vapi_pause_message = `Hello! I'm sorry, but ${salonName}'s AI service is temporarily unavailable. Please call us directly at ${salonPhone} and we'll be happy to assist you. Thank you for your patience!`;
            return jsonResponse({
                test_mode: true,
                alert_type: 'low_balance_warning',
                email_sent: sent,
                email_to: alertEmail,
                resend_key_configured: !!RESEND_KEY,
                vapi_pause_message,
                note: 'This was a TEST — no real credits affected. Check your inbox at: ' + alertEmail,
            });
        }

        if (alert_type === 'test_paused') {
            const html = pausedEmail(salonName, salonPhone, topupUrl);
            const sent = await sendEmail(alertEmail, `[TEST] 🔴 ACTION REQUIRED: Bella AI Paused — ${salonName}`, html);
            const vapi_pause_message = `Hello! I'm sorry, but ${salonName}'s AI service is temporarily unavailable. Please call us directly at ${salonPhone} and we'll be happy to assist you. Thank you for your patience!`;
            return jsonResponse({
                test_mode: true,
                alert_type: 'ai_paused',
                email_sent: sent,
                email_to: alertEmail,
                resend_key_configured: !!RESEND_KEY,
                vapi_key_configured: !!VAPI_API_KEY,
                vapi_assistant_id: tenant.vapi_assistant_id || 'NOT SET',
                vapi_pause_message,
                note: 'This was a TEST — Vapi NOT updated. Real pause would set this message on Bella.',
            });
        }

        // ===== Check Balance =====
        const aiTotal     = (tenant.ai_minutes_included || 0) + (tenant.ai_minutes_topup_balance || 0);
        const aiUsed      = tenant.ai_minutes_used || 0;
        const aiRemaining = Math.max(0, aiTotal - aiUsed);
        const aiPct       = aiTotal > 0 ? (aiRemaining / aiTotal) * 100 : 100;

        const smsTotal     = (tenant.sms_included || 0) + (tenant.sms_topup_balance || 0);
        const smsUsed      = tenant.sms_used || 0;
        const smsRemaining = Math.max(0, smsTotal - smsUsed);
        const smsPct       = smsTotal > 0 ? (smsRemaining / smsTotal) * 100 : 100;

        // ===== AI Minutes — Paused (0 remaining) =====
        if (aiRemaining <= 0 && !tenant.ai_paused_alert_sent) {
            // 1. Update Vapi assistant message
            if (tenant.vapi_assistant_id) {
                await pauseVapiAssistant(tenant.vapi_assistant_id, salonPhone, salonName);
            }
            // 2. Send paused email
            const html = pausedEmail(salonName, salonPhone, topupUrl);
            await sendEmail(alertEmail, `🔴 ACTION REQUIRED: Bella AI Paused — ${salonName}`, html);
            // 3. Mark alert sent
            await supabase.from('tenants').update({ ai_paused_alert_sent: true }).eq('id', tenant_id);
            actions.push('ai_paused_email_sent + vapi_updated');
        }
        // ===== AI Minutes — Low Balance Warning =====
        else if (aiPct <= LOW_BALANCE_PCT && aiRemaining > 0 && !tenant.low_balance_alert_sent) {
            const html = lowMinutesEmail(salonName, aiRemaining, aiTotal, aiPct, topupUrl);
            const subject = aiPct <= CRITICAL_PCT
                ? `🚨 CRITICAL: Only ${aiRemaining} AI minutes left — ${salonName}`
                : `⚠️ Low AI Balance: ${aiRemaining} minutes remaining — ${salonName}`;
            await sendEmail(alertEmail, subject, html);
            await supabase.from('tenants').update({ low_balance_alert_sent: true }).eq('id', tenant_id);
            actions.push('low_balance_email_sent');
        }

        // ===== SMS Low Balance =====
        if (smsPct <= LOW_BALANCE_PCT && smsRemaining > 0) {
            const html = lowSmsEmail(salonName, smsRemaining, smsTotal, topupUrl);
            await sendEmail(alertEmail, `📱 Low SMS Credits: ${smsRemaining} remaining — ${salonName}`, html);
            actions.push('sms_low_email_sent');
        }

        // Reset sent flags when balance is restored (after top-up)
        if (aiRemaining > 0 && aiPct > LOW_BALANCE_PCT && (tenant.low_balance_alert_sent || tenant.ai_paused_alert_sent)) {
            await supabase.from('tenants').update({ low_balance_alert_sent: false, ai_paused_alert_sent: false }).eq('id', tenant_id);
            actions.push('flags_reset_after_topup');
        }

        return jsonResponse({
            tenant_id,
            alert_email: alertEmail,
            ai_minutes_remaining: aiRemaining,
            ai_pct_remaining: Number(aiPct.toFixed(1)),
            sms_remaining: smsRemaining,
            actions: actions.length > 0 ? actions : ['no_action_needed'],
        });

    } catch (e: any) {
        console.error('send-low-balance-alert error:', e.message);
        return errorResponse(`Server error: ${e.message}`, 500);
    }
});
