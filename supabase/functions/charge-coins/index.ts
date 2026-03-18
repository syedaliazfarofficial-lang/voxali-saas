// Edge Function: charge-coins
// Handles: Creating a Stripe Checkout session to purchase prepaid coins
// Rate: 1 Coin = $0.01 USD

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { validateAuth, jsonResponse, errorResponse, corsHeaders } from '../_shared/utils.ts';
import Stripe from 'https://esm.sh/stripe@14.18.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    // 1. Authenticate Request
    const auth = validateAuth(req);
    if (!auth.valid) return errorResponse(auth.error!, 401);

    try {
        const rawBody = await req.text();
        let body: any = {};
        try {
            if (rawBody) body = JSON.parse(rawBody);
        } catch (e) {
            console.warn("Could not parse JSON body", e);
        }

        const amountCoins = Number(body.amount_coins);
        const tenantId = body.tenantId || body.tenant_id;

        if (!tenantId) {
            console.error("No tenant_id available in request.");
            return errorResponse('Tenant ID required', 400);
        }

        if (!amountCoins || isNaN(amountCoins) || amountCoins < 500) {
            return errorResponse('Minimum purchase is 500 coins ($5.00).', 400);
        }

        // Initialize Supabase Admin to get tenant info
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // 1 Coin = 1 Cent. So amount_coins is exactly the unit_amount in cents.
        const unitAmountCents = Math.floor(amountCoins);

        const origin = req.headers.get('origin') || 'https://app.voxali.ai';
        const successUrl = `${origin}/settings?tab=billing`;
        const cancelUrl = `${origin}/settings?tab=billing`;

        console.log(`Creating Stripe Checkout Session for ${amountCoins} coins for tenant ${tenantId}.`);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `${amountCoins} Prepaid Voxali Coins`,
                            description: 'Prepaid credits for handling AI Receptionist calls and SMS.',
                        },
                        unit_amount: unitAmountCents,
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                payment_type: 'coin_topup',
                tenant_id: tenantId,
                amount_coins: amountCoins.toString(),
            },
            success_url: successUrl,
            cancel_url: cancelUrl,
        });

        if (!session.url) {
            throw new Error('Failed to create complete Stripe session');
        }

        return jsonResponse({ url: session.url });

    } catch (err: any) {
        console.error('Error creating coin charge session:', err);
        return errorResponse(err.message, 500);
    }
});
