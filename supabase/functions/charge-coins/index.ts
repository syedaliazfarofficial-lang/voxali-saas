// Edge Function: charge-coins (Top-up logic)
// Handles: Creating a Stripe Checkout session to purchase AI Minutes or SMS Credits

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

        const tenantId = body.tenantId || body.tenant_id;
        const topupType = body.topup_type; // 'ai_minutes' or 'sms'
        const quantity = Number(body.quantity || body.amount_coins); // Fallback for amount_coins during transition

        if (!tenantId) {
            return errorResponse('Tenant ID required', 400);
        }

        if (!topupType || !['ai_minutes', 'sms'].includes(topupType)) {
            // Temporary fallback handler for legacy usage
            if (body.amount_coins && !topupType) {
                 return errorResponse('Missing topup_type (' + body.amount_coins + '), please refresh Dashboard to use new Top-up System.', 400);
            }
            return errorResponse('Invalid or missing topup_type. Must be ai_minutes or sms.', 400);
        }

        if (!quantity || isNaN(quantity) || quantity <= 0) {
            return errorResponse('Invalid purchase quantity.', 400);
        }

        let unitAmountCents = 0;
        let productName = '';
        let productDesc = '';

        if (topupType === 'ai_minutes') {
            // New Rates based on COGS (Vapi + ElevenLabs + Twilio + LLM + Stripe + Margin)
            // ~$0.15-0.20 raw cost -> retail at ~$0.60 to $0.70 per minute.
            if (quantity < 50) return errorResponse('Minimum purchase is 50 AI Minutes', 400);

            if (quantity === 100) {
                unitAmountCents = 3500; // $35.00 ($0.35 / min)
            } else if (quantity === 250) {
                unitAmountCents = 6500; // $65.00 ($0.26 / min)
            } else if (quantity >= 600) {
                unitAmountCents = Math.floor(quantity * 25); // 25 cents ($0.25) / min for bulk (e.g. 600 = $150, or fallback bulk)
            } else {
                unitAmountCents = Math.floor(quantity * 35); // fallback 35 cents
            }

            productName = `${quantity} Prepaid AI Voice Minutes`;
            productDesc = 'Rollover credits for the Aria AI Receptionist to answer and route inbound calls.';
        } else if (topupType === 'sms') {
            // Rates: Twilio ~$0.008 + Stripe -> retail at $0.02 to $0.03
             if (quantity < 500) return errorResponse('Minimum purchase is 500 SMS Credits', 400);
             
             if (quantity === 500) {
                 unitAmountCents = 1500; // $15.00 ($0.03 / SMS)
             } else if (quantity >= 1000) {
                 unitAmountCents = quantity * 2.5; // 2.5 cents ($0.025 / SMS)
             } else {
                 unitAmountCents = quantity * 3; // fallback 3 cents
             }

             productName = `${quantity} Prepaid SMS Credits`;
             productDesc = 'Rollover credits for sending automated booking reminders and SMS alerts.';
        }

        const origin = req.headers.get('origin') || 'https://app.voxali.ai';
        const successUrl = `${origin}/settings?tab=billing`;
        const cancelUrl = `${origin}/settings?tab=billing`;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: { name: productName, description: productDesc },
                        unit_amount: unitAmountCents,
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                is_topup: 'true',
                topup_type: topupType,
                tenant_id: tenantId,
                amount: quantity.toString(),
            },
            success_url: successUrl,
            cancel_url: cancelUrl,
        });

        if (!session.url) {
            throw new Error('Failed to create complete Stripe session');
        }

        return jsonResponse({ url: session.url });

    } catch (err: any) {
        console.error('Error creating charge session:', err);
        return errorResponse(err.message, 500);
    }
});
