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

        // ===== CHECKOUT COMPLETED (Payment for Coins) =====
        if (eventType === 'checkout.session.completed' && obj.mode === 'payment' && obj.metadata?.payment_type === 'coin_topup') {
            const tenantId = obj.metadata.tenant_id;
            const amountCoins = parseInt(obj.metadata.amount_coins || '0', 10);

            if (!tenantId || !amountCoins) {
                return errorResponse('Missing tenant_id or amount_coins in metadata', 400);
            }

            console.log(`Processing coin topup: ${amountCoins} coins for tenant ${tenantId}`);

            // Fetch current balance
            const { data: tenant, error: fetchErr } = await supabaseAdmin
                .from('tenants')
                .select('coin_balance')
                .eq('id', tenantId)
                .single();

            if (fetchErr || !tenant) {
                return errorResponse('Tenant not found', 404);
            }

            const newBalance = (tenant.coin_balance || 0) + amountCoins;

            // Update balance
            const { error: updateErr } = await supabaseAdmin
                .from('tenants')
                .update({ coin_balance: newBalance })
                .eq('id', tenantId);

            if (updateErr) {
                console.error("Failed to update coin balance:", updateErr);
                return errorResponse('Failed to update balance', 500);
            }

            // Log transaction
            await supabaseAdmin.from('coin_transactions').insert({
                tenant_id: tenantId,
                amount: amountCoins,
                transaction_type: 'topup',
                description: `Purchased ${amountCoins} coins via Stripe`
            });

            console.log(`Successfully credited ${amountCoins} coins. New balance: ${newBalance}`);
            return jsonResponse({ received: true, message: `Credited ${amountCoins} coins to tenant ${tenantId}` });
        }

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

        // ===== INVOICE PAYMENT SUCCEEDED (Recurring Monthly Reset) =====
        if (eventType === 'invoice.payment_succeeded' && obj.subscription) {
            const customerEmail = obj.customer_email || '';
            const customerId = obj.customer;
            const billingReason = obj.billing_reason; 

            // Extract period from the invoice lines
            const periodStart = obj.lines?.data?.[0]?.period?.start;
            const periodEnd = obj.lines?.data?.[0]?.period?.end;

            if (!customerEmail) {
                return jsonResponse({ received: true, message: 'No customer email found, skipping.' });
            }

            console.log(`Processing recurring payment for ${customerEmail}. Reason: ${billingReason}`);

            // Find the tenant by email
            const { data: tenant, error: fetchErr } = await supabaseAdmin
                .from('tenants')
                .select('id, plan_tier')
                .eq('stripe_customer_id', customerId)
                .single();

            if (tenant) {
                // If it's a new subscription or recurring cycle
                if (billingReason === 'subscription_cycle' || billingReason === 'subscription_create') {
                    const updatePayload: any = {
                        ai_minutes_used: 0,
                        sms_used: 0,
                        ai_access_paused: false,
                        sms_sending_paused: false,
                        subscription_status: 'active'
                    };

                    // Add proper billing cycles if stripe provided them
                    if (periodStart) updatePayload.current_period_start = new Date(periodStart * 1000).toISOString();
                    if (periodEnd) updatePayload.current_period_end = new Date(periodEnd * 1000).toISOString();

                    const { error: updateErr } = await supabaseAdmin
                        .from('tenants')
                        .update(updatePayload)
                        .eq('id', tenant.id);

                    if (!updateErr) {
                        console.log(`Successfully reset included monthly quota for ${tenant.id}. Unused balances expired, Top-ups preserved.`);
                    } else {
                        console.error("Failed to reset quota on payment success:", updateErr);
                    }
                }
            } else {
                 console.log("Tenant not found via stripe_customer_id, skipping quota reset.");
            }

            return jsonResponse({ received: true, message: 'Recurring payment processed & quotas reset.' });
        }

        // ===== SUBSCRIPTION UPDATED (Upgrade/Downgrade via Portal) =====
        if (eventType === 'customer.subscription.updated') {
            const customerId = obj.customer;
            const status = obj.status; // 'active', 'past_due', etc.
            const subscriptionId = obj.id;
            
            // Extract the new plan from metadata or the Stripe Product
            // The product ID or metadata should tell us if it's starter, growth, elite.
            // For simplicity, assuming metadata.plan is passed when portal modifies it,
            // or we fall back to a default active status.
            let newTier = obj.metadata?.plan || null;
            
            // If the portal didn't pass metadata to the sub, we might need to look at the product
            if (!newTier && obj.plan && obj.plan.product) {
                // In a real environment, you'd map the Stripe Product ID to your plans here.
                // For now, we trust metadata or leave it as it was if missing.
            }

            console.log(`Processing subscription update for customer ${customerId}. Status: ${status}`);

            const updateData: any = { 
                subscription_status: status,
                stripe_subscription_id: subscriptionId 
            };
            
            if (newTier) {
                updateData.plan_tier = newTier;
                updateData.subscription_tier = newTier;
                console.log(`Upgrading/Downgrading tenant to ${newTier}`);
            }

            const { data: updatedTenant, error: updateErr } = await supabaseAdmin
                .from('tenants')
                .update(updateData)
                .eq('stripe_customer_id', customerId)
                .select('id, twilio_number, vapi_assistant_id')
                .single();

            if (updateErr) {
                console.error("Failed to update tenant subscription status:", updateErr);
                return errorResponse('Failed to update tenant', 500);
            }

            // Auto-provision Twilio number if upgrading from basic
            if (newTier && newTier !== 'basic' && newTier !== 'Essentials' && updatedTenant && !updatedTenant.twilio_number && updatedTenant.vapi_assistant_id) {
                try {
                    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
                    const functionUrl = supabaseUrl.replace('.supabase.co', '.supabase.co/functions/v1/provision-twilio-number');
                    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
                    const toolsKey = Deno.env.get('TOOLS_KEY') || 'LUXE-AUREA-SECRET-2026';
                    
                    console.log(`Auto-provisioning Twilio number for upgraded tenant: ${updatedTenant.id}`);
                    fetch(functionUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-TOOLS-KEY': toolsKey, 'Authorization': `Bearer ${anonKey}` },
                        body: JSON.stringify({ tenant_id: updatedTenant.id, country_code: 'US', vapi_assistant_id: updatedTenant.vapi_assistant_id })
                    }).catch(err => console.error("Twilio Init background error on upgrade: ", err));

                } catch(e) {
                    console.error("Failed to trigger twilio provisioning:", e);
                }
            }

            return jsonResponse({ received: true, message: 'Subscription update processed.' });
        }

        // ===== INVOICE PAYMENT FAILED (Grace Period Logic) =====
        if (eventType === 'invoice.payment_failed') {
            const customerId = obj.customer;
            console.log(`Payment failed for customer ${customerId}. Entering Grace Period.`);

            const graceUntil = new Date();
            graceUntil.setDate(graceUntil.getDate() + 3); // 3 Days Grace Period

            const { data: tenant, error: fetchErr } = await supabaseAdmin
                .from('tenants')
                .select('id')
                .eq('stripe_customer_id', customerId)
                .single();

            if (tenant) {
                await supabaseAdmin
                    .from('tenants')
                    .update({
                        subscription_status: 'past_due',
                        billing_grace_until: graceUntil.toISOString()
                    })
                    .eq('id', tenant.id);
                console.log(`Set grace period for tenant ${tenant.id} until ${graceUntil.toISOString()}`);
            }
            return jsonResponse({ received: true, message: 'Grace period applied.' });
        }

        // ===== CHECKOUT SESSION COMPLETED (Top-Up Purchases) =====
        if (eventType === 'checkout.session.completed') {
            const mode = obj.mode;
            const metadata = obj.metadata || {};
            
            // If this was a one-time payment for a top-up
            if (mode === 'payment' && metadata.is_topup === 'true') {
                const customerId = obj.customer;
                const topupType = metadata.topup_type; // 'ai_minutes' or 'sms'
                const amount = parseInt(metadata.amount || '0', 10);
                
                const { data: tenant } = await supabaseAdmin
                    .from('tenants')
                    .select('id, ai_minutes_topup_balance, sms_topup_balance, ai_access_paused, sms_sending_paused')
                    .eq('stripe_customer_id', customerId)
                    .single();
                    
                if (tenant && amount > 0) {
                    const updates: any = {};
                    
                    if (topupType === 'ai_minutes') {
                        updates.ai_minutes_topup_balance = (tenant.ai_minutes_topup_balance || 0) + amount;
                        if (tenant.ai_access_paused) updates.ai_access_paused = false;
                    } else if (topupType === 'sms') {
                        updates.sms_topup_balance = (tenant.sms_topup_balance || 0) + amount;
                        if (tenant.sms_sending_paused) updates.sms_sending_paused = false;
                    }
                    
                    if (Object.keys(updates).length > 0) {
                        await supabaseAdmin.from('tenants').update(updates).eq('id', tenant.id);
                        
                        await supabaseAdmin.from('topup_purchases').insert({
                            tenant_id: tenant.id,
                            type: topupType,
                            quantity: amount,
                            amount_paid_cents: obj.amount_total,
                            stripe_session_id: obj.id
                        });
                        console.log(`Topped up ${amount} ${topupType} for tenant ${tenant.id}`);
                    }
                }
            }
            return jsonResponse({ received: true, message: 'Checkout session processed.' });
        }

        return jsonResponse({ received: true, message: `Unhandled event: ${eventType}` });

    } catch (e: any) {
        console.error("Webhook unexpected error:", e);
        return errorResponse('Webhook error: ' + e.message, 500);
    }
});
