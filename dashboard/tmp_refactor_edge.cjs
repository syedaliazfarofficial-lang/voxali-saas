const fs = require('fs');
const filePath = 'c:/Users/syeda/OneDrive/Desktop/Voxali New/supabase/functions/setup-account/index.ts';
let code = fs.readFileSync(filePath, 'utf8');

// The original logic string matching
const step2start = "    // Step 2: Create Tenant";
const step4start = "    // Step 4: Ensure profiles block has the tenant_id and role set";

// We need to extract what's between these two, rewrite it and replace it.
let idxStart = code.indexOf(step2start);
let idxEnd = code.indexOf(step4start);

if (idxStart !== -1 && idxEnd !== -1) {
    const replacement = `    // Step 2: Create Auth User (Owner) FIRST to block duplicates cleanly
    const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: 'owner'
      }
    });

    if (authErr || !authUser?.user) {
      console.error("Auth User creation failed:", authErr);
      // Custom translated error for duplicate emails
      if (authErr && authErr.message.toLowerCase().includes('already registered')) {
        return errorResponse('Yeh email pehle se majood hai! Bara-e-meharbani koi doosri email try karein.', 400);
      }
      return errorResponse(\`Failed to create auth user: \${authErr?.message}\`, 500);
    }

    // Step 3: Create Tenant
    const baseSlug = salonName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const slug = \`\${baseSlug}-\${randomSuffix}\`;

    // Map country code to currency and timezone
    let currencyStr = 'USD';
    let timezoneStr = 'UTC';

    switch (countryCode) {
      case 'GB': currencyStr = 'GBP'; timezoneStr = 'Europe/London'; break;
      case 'AU': currencyStr = 'AUD'; timezoneStr = 'Australia/Sydney'; break;
      case 'CA': currencyStr = 'CAD'; timezoneStr = 'America/Toronto'; break;
      case 'AE': currencyStr = 'AED'; timezoneStr = 'Asia/Dubai'; break;
      case 'SA': currencyStr = 'SAR'; timezoneStr = 'Asia/Riyadh'; break;
      case 'DE': currencyStr = 'EUR'; timezoneStr = 'Europe/Berlin'; break;
      case 'FR': currencyStr = 'EUR'; timezoneStr = 'Europe/Paris'; break;
      case 'ES': currencyStr = 'EUR'; timezoneStr = 'Europe/Madrid'; break;
      case 'IT': currencyStr = 'EUR'; timezoneStr = 'Europe/Rome'; break;
      case 'NZ': currencyStr = 'NZD'; timezoneStr = 'Pacific/Auckland'; break;
      case 'PK': currencyStr = 'PKR'; timezoneStr = 'Asia/Karachi'; break;
      case 'US': currencyStr = 'USD'; timezoneStr = 'America/New_York'; break;
      default: currencyStr = 'USD'; timezoneStr = 'UTC'; break;
    }

    const { data: newTenant, error: tenantErr } = await supabaseAdmin
      .from('tenants')
      .insert({
        name: salonName,
        slug: slug,
        plan_tier: plan,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        plan_ai_minutes_limit: limits.ai_minutes,
        plan_sms_limit: limits.sms,
        plan_email_limit: limits.emails,
        coin_balance: limits.coins || 0,
        subscription_status: 'active',
        currency: currencyStr,
        timezone: timezoneStr
      })
      .select('id')
      .single();

    if (tenantErr || !newTenant) {
      console.error("Tenant creation failed:", tenantErr);
      // Rollback user if tenant fails
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return errorResponse(\`Failed to create tenant: \${JSON.stringify(tenantErr)}\`, 500);
    }

    const tenantId = newTenant.id;

    // Update user metadata with tenant_id now that we have it
    await supabaseAdmin.auth.admin.updateUserById(authUser.user.id, {
      user_metadata: { tenant_id: tenantId }
    });

`;

    code = code.substring(0, idxStart) + replacement + code.substring(idxEnd);
    fs.writeFileSync(filePath, code, 'utf8');
    console.log('setup-account index.ts refactored successfully.');
} else {
    console.log('Could not find markers in setup-account.');
}
