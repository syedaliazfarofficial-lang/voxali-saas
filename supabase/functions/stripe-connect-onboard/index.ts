// Edge Function: stripe-connect-onboard
// Creates a Stripe Express connected account for a salon owner
// Returns onboarding URL where owner fills bank/tax info

import { getSupabase, validateAuth, jsonResponse, errorResponse, handleCORS } from '../_shared/utils.ts';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return handleCORS();

    try {
        const auth = validateAuth(req);
        if (!auth.valid) return errorResponse(auth.error!, 401);

        let body: any = {};
        try { body = await req.json(); } catch { }
        const tenantId = body.tenant_id;
        if (!tenantId) return errorResponse('Missing tenant_id');

        const action = body.action || 'create'; // create | refresh | status

        const supabase = getSupabase();
        const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY') || '';
        if (!STRIPE_KEY) return errorResponse('Stripe not configured', 500);

        // Get tenant info
        const { data: tenant } = await supabase.from('tenants')
            .select('salon_name, salon_email, stripe_account_id, stripe_onboarding_complete')
            .eq('id', tenantId).single();
        if (!tenant) return errorResponse('Salon not found', 404);

        // ===== STATUS CHECK =====
        if (action === 'status') {
            if (!tenant.stripe_account_id) {
                return jsonResponse({ connected: false, message: 'No Stripe account linked' });
            }
            // Check Stripe for live status
            const acctRes = await fetch('https://api.stripe.com/v1/accounts/' + tenant.stripe_account_id, {
                headers: { 'Authorization': 'Bearer ' + STRIPE_KEY },
            });
            if (!acctRes.ok) return jsonResponse({ connected: false, message: 'Stripe account not found' });
            const acct = await acctRes.json();
            return jsonResponse({
                connected: true,
                charges_enabled: acct.charges_enabled,
                payouts_enabled: acct.payouts_enabled,
                onboarding_complete: acct.charges_enabled && acct.payouts_enabled,
                account_id: tenant.stripe_account_id,
            });
        }

        // ===== CREATE or REFRESH Onboarding =====
        let accountId = tenant.stripe_account_id;

        if (!accountId) {
            // Create new Express connected account
            const acctParams: Record<string, string> = {
                'type': 'express',
                'country': 'US',
                'business_type': 'individual',
                'capabilities[card_payments][requested]': 'true',
                'capabilities[transfers][requested]': 'true',
                'business_profile[name]': tenant.salon_name || 'Salon',
                'business_profile[product_description]': 'Salon & Spa services - booking deposits',
                'business_profile[mcc]': '7230',
                'metadata[tenant_id]': tenantId,
                'metadata[platform]': 'voxali',
            };
            if (tenant.salon_email) acctParams['email'] = tenant.salon_email;

            const createRes = await fetch('https://api.stripe.com/v1/accounts', {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + STRIPE_KEY,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(acctParams),
            });

            if (!createRes.ok) {
                const err = await createRes.json();
                return errorResponse('Failed to create Stripe account: ' + (err.error?.message || 'Unknown'), 500);
            }

            const acct = await createRes.json();
            accountId = acct.id;

            // Save to DB
            await supabase.from('tenants').update({
                stripe_account_id: accountId,
                stripe_onboarding_complete: false,
            }).eq('id', tenantId);
        }

        // Create Account Link for onboarding
        const returnUrl = body.return_url || 'https://voxali.com/dashboard/settings?stripe=success';
        const refreshUrl = body.refresh_url || 'https://voxali.com/dashboard/settings?stripe=refresh';

        const linkRes = await fetch('https://api.stripe.com/v1/account_links', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + STRIPE_KEY,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'account': accountId!,
                'refresh_url': refreshUrl,
                'return_url': returnUrl,
                'type': 'account_onboarding',
            }),
        });

        if (!linkRes.ok) {
            const err = await linkRes.json();
            return errorResponse('Failed to create onboarding link: ' + (err.error?.message || 'Unknown'), 500);
        }

        const link = await linkRes.json();

        return jsonResponse({
            success: true,
            onboarding_url: link.url,
            account_id: accountId,
            message: 'Redirect salon owner to onboarding_url to connect their Stripe account.',
        });
    } catch (e: any) {
        return errorResponse('Server error: ' + e.message, 500);
    }
});
