// Edge Function: report-overage-to-stripe
// Connects to Supabase, checks tenants for overage usage (AI mins, SMS, Emails),
// and pushes usage records to Stripe for metered billing.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
    try {
        const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        // Allow secure invocation only via internal CRON or Super Admin
        const authHeader = req.headers.get('Authorization');
        if (!authHeader || authHeader !== `Bearer ${Deno.env.get('TOOLS_KEY')}`) {
            return new Response('Unauthorized', { status: 401 });
        }

        if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey) {
            return new Response('Missing Envs', { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data: tenants, error } = await supabase
            .from('tenants')
            .select('*')
            .not('stripe_subscription_id', 'is', null);

        if (error) throw error;

        let processed = 0;
        let errors = 0;

        for (const tenant of tenants) {
            try {
                // Determine overage
                const aiOverage = Math.max(0, (tenant.ai_minutes_used || 0) - (tenant.plan_ai_minutes_limit || 0));
                const smsOverage = Math.max(0, (tenant.sms_used || 0) - (tenant.plan_sms_limit || 0));
                const emailOverage = Math.max(0, (tenant.emails_used || 0) - (tenant.plan_email_limit || 0));

                if (aiOverage > 0 || smsOverage > 0 || emailOverage > 0) {
                    // Look up subscription items from Stripe to get the Metered PRICING IDs
                    const subsRes = await fetch(`https://api.stripe.com/v1/subscriptions/${tenant.stripe_subscription_id}`, {
                        headers: { 'Authorization': `Bearer ${stripeSecretKey}` }
                    });

                    if (!subsRes.ok) continue;

                    const subsData = await subsRes.json();

                    // Note: This logic assumes the subscription contains metered items for ai, sms, emails.
                    // A proper implementation loops through subsData.items.data to find the exact subscription_item_id
                    // corresponding to the overage prices.
                    const items = subsData.items.data;

                    for (const item of items) {
                        const priceId = item.price.id;
                        let usageToReport = 0;

                        // Example Mapping based on Stripe setups (you should map actual Stripe Price IDs here)
                        // This logic should ideally match Stripe price metadata.
                        // Assuming metadata { type: 'ai_overage' }
                        if (item.price.metadata?.type === 'ai_overage') usageToReport = aiOverage;
                        if (item.price.metadata?.type === 'sms_overage') usageToReport = smsOverage;
                        if (item.price.metadata?.type === 'email_overage') usageToReport = emailOverage;

                        if (usageToReport > 0) {
                            // Deduplicate report by using tenant_id and timestamp
                            const idempotencyKey = `${tenant.id}-${item.id}-${new Date().toISOString().split('T')[0]}`;

                            await fetch(`https://api.stripe.com/v1/subscription_items/${item.id}/usage_records`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${stripeSecretKey}`,
                                    'Content-Type': 'application/x-www-form-urlencoded',
                                    'Idempotency-Key': idempotencyKey
                                },
                                body: new URLSearchParams({
                                    quantity: usageToReport.toString(),
                                    timestamp: Math.floor(Date.now() / 1000).toString(),
                                    action: 'set'
                                })
                            });
                        }
                    }
                }
                processed++;
            } catch (err) {
                console.error(`Error processing tenant ${tenant.id}:`, err);
                errors++;
            }
        }

        return new Response(JSON.stringify({ success: true, processed, errors }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
    }
});
