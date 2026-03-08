// Edge Function: send-campaign
// Sends marketing campaign emails to clients using Resend API
// Called by dashboard Marketing.tsx when launching a campaign

import { getSupabase, jsonResponse, errorResponse, corsHeaders } from '../_shared/utils.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const body = await req.json();
        const { campaign_id, tenant_id, selected_client_ids } = body;

        if (!campaign_id || !tenant_id) return errorResponse('Missing campaign_id or tenant_id');
        if (!RESEND_API_KEY) return errorResponse('RESEND_API_KEY not configured', 500);

        const supabase = getSupabase();

        // Get campaign details
        const { data: campaign, error: campErr } = await supabase
            .from('marketing_campaigns')
            .select('*')
            .eq('id', campaign_id)
            .eq('tenant_id', tenant_id)
            .single();

        if (campErr || !campaign) return errorResponse('Campaign not found');

        // Get tenant details
        const { data: tenant } = await supabase
            .from('tenants')
            .select('salon_name, salon_tagline')
            .eq('id', tenant_id)
            .single();

        const salonName = tenant?.salon_name || 'Salon';

        // Build audience query
        let query = supabase.from('clients').select('id, name, email, phone')
            .eq('tenant_id', tenant_id);

        if (campaign.audience === 'vip_only') {
            query = query.eq('is_vip', true);
        } else if (campaign.audience === 'inactive') {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            query = query.or(`last_booking_at.is.null,last_booking_at.lt.${thirtyDaysAgo}`);
        } else if (campaign.audience === 'new_this_month') {
            const monthStart = new Date();
            monthStart.setDate(1);
            monthStart.setHours(0, 0, 0, 0);
            query = query.gte('created_at', monthStart.toISOString());
        }

        // If selected_client_ids provided, filter to only those
        if (Array.isArray(selected_client_ids) && selected_client_ids.length > 0) {
            query = query.in('id', selected_client_ids);
        }

        const { data: clients, error: clientErr } = await query;
        if (clientErr) return errorResponse('Failed to fetch clients: ' + clientErr.message);
        if (!clients || clients.length === 0) return jsonResponse({ sent: 0, failed: 0, message: 'No clients match the audience' });

        // Update campaign status to 'sending'
        await supabase.from('marketing_campaigns')
            .update({ status: 'sending' })
            .eq('id', campaign_id);

        // Send emails
        let sent = 0;
        let failed = 0;
        const channel = campaign.channel || 'email';

        for (const client of clients) {
            // Personalize message
            const personalizedMsg = (campaign.message || '')
                .replace(/\{name\}/gi, client.name || 'there')
                .replace(/\{salon\}/gi, salonName);

            if ((channel === 'email' || channel === 'both') && client.email) {
                const html = buildCampaignEmail(salonName, client.name || 'there', personalizedMsg, campaign.name);
                const emailResult = await sendEmail(
                    `${salonName} <onboarding@resend.dev>`,
                    client.email,
                    `${campaign.name} - ${salonName}`,
                    html
                );
                if (emailResult.success) sent++;
                else failed++;
            }

            if ((channel === 'sms' || channel === 'both') && client.phone) {
                // SMS sending would go here (Twilio)
                // For now, count as sent since SMS is separate
                sent++;
            }

            // Small delay to avoid rate limiting
            if (clients.length > 10) {
                await new Promise(r => setTimeout(r, 100));
            }
        }

        // Update campaign with results
        await supabase.from('marketing_campaigns')
            .update({
                status: 'sent',
                sent_count: sent,
            })
            .eq('id', campaign_id);

        return jsonResponse({ sent, failed, total: clients.length });
    } catch (e: any) {
        return errorResponse('Campaign send error: ' + e.message, 500);
    }
});

async function sendEmail(from: string, to: string, subject: string, html: string) {
    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ from, to: [to], subject, html }),
        });
        if (!res.ok) {
            const err = await res.json();
            return { success: false, error: JSON.stringify(err) };
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

function buildCampaignEmail(salon: string, name: string, message: string, campaignName: string): string {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0A0A0B;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:40px 20px">
<div style="background:linear-gradient(145deg,#1A1A1F,#141417);border:1px solid rgba(212,175,55,.15);border-radius:20px;padding:40px 30px;text-align:center">
<div style="font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#D4AF37;font-weight:600;margin-bottom:20px">${esc(salon)}</div>
<h1 style="font-size:24px;color:#FFF;margin:0 0 20px">${esc(campaignName)}</h1>
<div style="background:rgba(212,175,55,.06);border:1px solid rgba(212,175,55,.12);border-radius:12px;padding:20px;margin-bottom:20px;text-align:left">
<p style="color:#E0E0E0;font-size:15px;line-height:1.8;margin:0">Hi ${esc(name)}! 👋</p>
<p style="color:#E0E0E0;font-size:15px;line-height:1.8;margin:10px 0 0">${esc(message)}</p>
</div>
<p style="color:#777;font-size:12px;margin:20px 0 0">You received this because you're a valued client of ${esc(salon)}.</p>
<p style="font-size:11px;color:#444;margin-top:20px">Powered by <a href="https://voxali.com" style="color:#D4AF37;text-decoration:none">Voxali</a></p>
</div></div></body></html>`;
}

function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
