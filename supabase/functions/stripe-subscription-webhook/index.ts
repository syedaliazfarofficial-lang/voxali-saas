// Edge Function: stripe-subscription-webhook
// Handles: checkout.session.completed (for subscriptions)
// Auto-creates a new Tenant, Admin User, and seeds default services.

import { getSupabase, jsonResponse, errorResponse, corsHeaders } from '../_shared/utils.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const rawBody = await req.text();
        let body: any;
        try { body = JSON.parse(rawBody); } catch {
            return errorResponse('Invalid JSON payload', 400);
        }

        const eventType = body.type;
        const obj = body.data?.object;
        if (!obj) return errorResponse('Invalid webhook payload');

        // We need the SERVICE_ROLE key directly to use auth.admin
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // ===== CHECKOUT COMPLETED (New Subscription) =====
        if (eventType === 'checkout.session.completed' && obj.mode === 'subscription') {

            const customerEmail = obj.customer_details?.email || obj.customer_email;
            const customerName = obj.customer_details?.name || 'New Salon Owner';
            const customerId = obj.customer;
            const subscriptionId = obj.subscription;

            const plan = obj.metadata?.plan || 'starter';
            let limits = { staff: 3, ai_minutes: 150, sms: 200, emails: 500 };

            // In checkout session, limits might be stringified in subscription_data or metadata
            try {
                if (obj.metadata?.limits) {
                    limits = JSON.parse(obj.metadata.limits);
                }
            } catch (e) { console.error('Could not parse limits metadata:', e); }

            if (!customerEmail) {
                return errorResponse('No email found in checkout session', 400);
            }

            console.log(`Processing new subscription for: ${customerEmail} (Plan: ${plan})`);

            // ===== ARCHIVED FLOW =====
            // Tenant, User, and default services are now created inside 'setup-account'
            // after the user provides their custom password and salon name on /signup.html
            console.log(`Webhook received for ${customerEmail}. Awaiting user to complete /signup.html.`);

            return jsonResponse({ received: true, message: "Webhook acknowledged. User must complete manual onboarding." });

            // 6. Automatically Provision a Twilio Number
            try {
                const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
                const functionUrl = supabaseUrl.replace('.supabase.co', '.supabase.co/functions/v1/provision-twilio-number');
                const toolsKey = Deno.env.get('TOOLS_KEY') || 'LUXE-AUREA-SECRET-2026'; // Match your util key

                console.log('Initiating Twilio number provisioning for tenant:', tenantId);
                const twilioRes = await fetch(functionUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-TOOLS-KEY': toolsKey
                    },
                    body: JSON.stringify({ tenant_id: tenantId, areaCode: '310' })
                });

                if (!twilioRes.ok) {
                    const errTxt = await twilioRes.text();
                    console.error('Failed to provision Twilio number:', errTxt);
                } else {
                    console.log('Successfully provisioned Twilio number assigned to tenant.');
                }
            } catch (twilioErr) {
                console.error('Network error triggering Twilio provisioning:', twilioErr);
            }

            // 7. Automatically Provision an ElevenLabs Agent
            try {
                const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
                const agentFunctionUrl = supabaseUrl.replace('.supabase.co', '.supabase.co/functions/v1/provision-elevenlabs-agent');
                const toolsKey = Deno.env.get('TOOLS_KEY') || 'LUXE-AUREA-SECRET-2026';

                console.log('Initiating ElevenLabs agent creation for tenant:', tenantId);
                const agentRes = await fetch(agentFunctionUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-TOOLS-KEY': toolsKey },
                    body: JSON.stringify({ tenant_id: tenantId })
                });

                if (!agentRes.ok) console.error('Failed to provision ElevenLabs agent');
                else console.log('Successfully configured ElevenLabs AI Agent.');
            } catch (agentErr) {
                console.error('Network error triggering agent provisioning:', agentErr);
            }

            return jsonResponse({
                received: true,
                message: 'Tenant and Admin User created successfully. Welcome email sent & onboarding automated.',
                tenant_id: tenantId
            });
        }

        return jsonResponse({ received: true, message: `Unhandled event: ${eventType}` });

    } catch (e: any) {
        console.error("Webhook unexpected error:", e);
        return errorResponse('Webhook error: ' + e.message, 500);
    }
});
