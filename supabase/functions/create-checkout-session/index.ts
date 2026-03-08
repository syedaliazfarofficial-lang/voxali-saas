// Edge Function: create-checkout-session
// Creates a Stripe Checkout Session for SaaS subscription

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const PLAN_CONFIG: Record<string, { name: string; priceAmount: number; trialDays: number; limits: any }> = {
    starter: {
        name: 'Voxali Starter',
        priceAmount: 9900, // $99 in cents
        trialDays: 14,
        limits: { staff: 3, ai_minutes: 150, sms: 200, emails: 500 },
    },
    growth: {
        name: 'Voxali Growth',
        priceAmount: 19900, // $199
        trialDays: 14,
        limits: { staff: 10, ai_minutes: 400, sms: 1000, emails: 5000 },
    },
    enterprise: {
        name: 'Voxali Enterprise',
        priceAmount: 34900, // $349
        trialDays: 14,
        limits: { staff: -1, ai_minutes: 1000, sms: 5000, emails: -1 }, // -1 = unlimited
    },
};

Deno.serve(async (req) => {
    // CORS
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });
    }

    const corsHeaders = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
    };

    try {
        const body = await req.json();
        const { plan, email, salon_name } = body;

        if (!plan || !PLAN_CONFIG[plan]) {
            return new Response(JSON.stringify({ error: 'Invalid plan. Choose: starter, professional, or enterprise' }), {
                status: 400, headers: corsHeaders,
            });
        }

        const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY') || '';
        if (!STRIPE_KEY) {
            return new Response(JSON.stringify({ error: 'Payment system not configured' }), {
                status: 500, headers: corsHeaders,
            });
        }

        const config = PLAN_CONFIG[plan];
        const successUrl = `https://voxali-dashboard.pages.dev/signup.html?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`;
        const cancelUrl = `https://voxali-dashboard.pages.dev/pricing.html`;

        // Step 1: Create a Stripe Price (ad-hoc) for the subscription
        const priceRes = await fetch('https://api.stripe.com/v1/prices', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${STRIPE_KEY}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'unit_amount': String(config.priceAmount),
                'currency': 'usd',
                'recurring[interval]': 'month',
                'product_data[name]': config.name,
            }),
        });

        if (!priceRes.ok) {
            const err = await priceRes.json();
            return new Response(JSON.stringify({ error: `Stripe price error: ${err.error?.message}` }), {
                status: 500, headers: corsHeaders,
            });
        }

        const priceData = await priceRes.json();

        // Step 2: Create Checkout Session
        const checkoutParams: Record<string, string> = {
            'mode': 'subscription',
            'line_items[0][price]': priceData.id,
            'line_items[0][quantity]': '1',
            'success_url': successUrl,
            'cancel_url': cancelUrl,
            'subscription_data[trial_period_days]': String(config.trialDays),
            'subscription_data[metadata][plan]': plan,
            'subscription_data[metadata][limits]': JSON.stringify(config.limits),
            'metadata[plan]': plan,
            'allow_promotion_codes': 'true',
        };

        // Pre-fill email if provided
        if (email) {
            checkoutParams['customer_email'] = email;
        }

        const checkoutRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${STRIPE_KEY}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(checkoutParams),
        });

        if (!checkoutRes.ok) {
            const err = await checkoutRes.json();
            return new Response(JSON.stringify({ error: `Checkout error: ${err.error?.message}` }), {
                status: 500, headers: corsHeaders,
            });
        }

        const checkoutData = await checkoutRes.json();

        return new Response(JSON.stringify({
            success: true,
            checkout_url: checkoutData.url,
            session_id: checkoutData.id,
            plan: plan,
            trial_days: config.trialDays,
        }), { headers: corsHeaders });

    } catch (e: any) {
        return new Response(JSON.stringify({ error: `Server error: ${e.message}` }), {
            status: 500, headers: corsHeaders,
        });
    }
});
