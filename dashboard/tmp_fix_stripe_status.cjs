const fs = require('fs');
const filePath = 'c:/Users/syeda/OneDrive/Desktop/Voxali New/supabase/functions/stripe-connect-onboard/index.ts';
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(
    /return jsonResponse\(\{\s*connected: true,\s*charges_enabled: acct\.charges_enabled,\s*payouts_enabled: acct\.payouts_enabled,\s*onboarding_complete: acct\.charges_enabled && acct\.payouts_enabled,\s*account_id: tenant\.stripe_account_id,\s*\}\);/,
    `const isCompleted = acct.details_submitted || (acct.charges_enabled && acct.payouts_enabled);
            
            // Auto sync to DB if completed
            if (isCompleted && !tenant.stripe_onboarding_complete) {
                await supabase.from('tenants').update({ stripe_onboarding_complete: true }).eq('id', tenantId);
            }

            return jsonResponse({
                connected: true,
                charges_enabled: acct.charges_enabled,
                payouts_enabled: acct.payouts_enabled,
                details_submitted: acct.details_submitted,
                onboarding_complete: isCompleted,
                account_id: tenant.stripe_account_id,
            });`
);

fs.writeFileSync(filePath, code, 'utf8');
console.log("Stripe connect edge function updated for details_submitted");
