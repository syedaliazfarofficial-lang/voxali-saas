// Edge Function: setup-account
// Called from signup.html to finalize onboarding after a successful Stripe payment.
import { getSupabase, jsonResponse, errorResponse, corsHeaders } from '../_shared/utils.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import Stripe from 'https://esm.sh/stripe@14.14.0';

Deno.serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { session_id, fullName, salonName, email, password, countryCode } = body;

    if (!session_id || !fullName || !salonName || !email || !password) {
      return errorResponse('Missing required fields for signup.', 400);
    }

    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
    if (!STRIPE_SECRET_KEY) return errorResponse('Stripe integration missing', 500);

    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16', httpClient: Stripe.createFetchHttpClient() });

    // Step 1: Verify the session with Stripe
    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(session_id);
    } catch (e: any) {
      return errorResponse(`Invalid Stripe session: ${e.message}`, 400);
    }

    if (session.payment_status !== 'paid') {
      return errorResponse('Payment has not been completed securely.', 400);
    }

    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;
    const plan = session.metadata?.plan || 'starter';
    let limits = { staff: 3, ai_minutes: 150, sms: 200, emails: 500, coins: 0 };

    try {
      if (session.metadata?.limits) {
        limits = JSON.parse(session.metadata.limits);
      }
    } catch (e) { console.error('Could not parse limits metadata:', e); }

    console.log(`Setting up account for ${email} (Plan: ${plan})`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Prevention check: Make sure this stripe session hasn't been used to create a tenant already
    const { data: existingTenant } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('stripe_subscription_id', subscriptionId)
      .single();

    if (existingTenant) {
      return errorResponse('An account has already been created for this subscription.', 400);
    }

    // Step 2: Create Tenant
    const baseSlug = salonName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const slug = `${baseSlug}-${randomSuffix}`;

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
      return errorResponse(`Failed to create tenant: ${JSON.stringify(tenantErr)}`, 500);
    }

    const tenantId = newTenant.id;

    // Step 3: Create Auth User (Owner)
    const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        tenant_id: tenantId,
        role: 'owner'
      }
    });

    if (authErr || !authUser.user) {
      console.error("Auth User creation failed:", authErr);
      return errorResponse(`Failed to create auth user: ${authErr?.message}`, 500);
    }

    // Step 4: Ensure profiles block has the tenant_id and role set
    // A database trigger creates this row, we must wait and then update it.
    await new Promise(resolve => setTimeout(resolve, 500)); // give trigger a moment
    await supabaseAdmin.from('profiles').update({
      tenant_id: tenantId,
      full_name: fullName,
      role: 'owner'
    }).eq('id', authUser.user.id);

    // Step 5: Seed Default Services
    await supabaseAdmin.from('services').insert([
      { tenant_id: tenantId, name: "Women's Haircut", duration_minutes: 60, price: 65.00 },
      { tenant_id: tenantId, name: "Men's Haircut", duration_minutes: 30, price: 35.00 },
      { tenant_id: tenantId, name: "Color & Highlights", duration_minutes: 120, price: 150.00 }
    ]);

    // Await the provisioning APIs to ensure Deno doesn't cancel them
    // when this main function returns. We use allSettled so one failure 
    // doesn't block the other or crash the whole signup process.
    const TOOLS_KEY = Deno.env.get('TOOLS_KEY') || 'LUXE-AUREA-SECRET-2026';

    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

    console.log(`Starting auto-provisioning for tenant ${tenantId}...`);

    // Step A: Provision Vapi Agent First to get the Assistant ID
    let createdAssistantId = null;
    try {
      const agentRes = await fetch(`${supabaseUrl}/functions/v1/provision-vapi-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-TOOLS-KEY': TOOLS_KEY, 'Authorization': `Bearer ${anonKey}` },
        body: JSON.stringify({ tenantId: tenantId, salonName: salonName, countryCode: countryCode || 'US' })
      });
      const agentData = await agentRes.json();
      createdAssistantId = agentData.assistantId;
    } catch (err) {
      console.error("Vapi Init background error: ", err);
    }

    // Step B: Provision Twilio Number and link it to the new Vapi Assistant ID
    // IMPORTANT: Always pass 'US' to bypass Twilio KYC restrictions globally
    if (plan !== 'basic' && plan !== 'Essentials') {
      try {
        await fetch(`${supabaseUrl}/functions/v1/provision-twilio-number`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-TOOLS-KEY': TOOLS_KEY, 'Authorization': `Bearer ${anonKey}` },
          body: JSON.stringify({ tenant_id: tenantId, country_code: 'US', vapi_assistant_id: createdAssistantId })
        });
      } catch (err) {
        console.error("Twilio Init background error: ", err);
      }
    } else {
      console.log(`Skipping Twilio Number Provisioning for ${plan} plan tenant ${tenantId}`);
    }

    console.log(`Auto-provisioning completed for tenant ${tenantId}.`);

    return jsonResponse({
      success: true,
      message: "Account created successfully.",
      tenant_id: tenantId
    });

  } catch (e: any) {
    console.error("Setup account unhandled error:", e);
    return errorResponse(`Server error: ${e.message}`, 500);
  }
});
