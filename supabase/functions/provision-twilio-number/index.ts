// Edge Function: provision-twilio-number
// Automatically searches for and purchases a local phone number via Twilio API,
// then assigns it to a tenant.

import { getSupabase, validateAuth, errorResponse, jsonResponse, corsHeaders } from '../_shared/utils.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    const auth = validateAuth(req);
    if (!auth.valid) return errorResponse(auth.error!, 401);

    try {
        const body = await req.json();
        const tenantId = body.tenant_id;
        const countryCode = (body.country_code || 'US').toUpperCase();

        if (!tenantId) {
            return errorResponse('Missing tenant_id', 400);
        }

        const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
        const twilioAuth = Deno.env.get('TWILIO_AUTH_TOKEN');

        if (!twilioSid || !twilioAuth) {
            console.warn('Twilio credentials missing. Simulating number provisioning.');
            // Update database with a fake number for demo/testing purposes
            const countryPrefix = countryCode === 'GB' ? '+44' : countryCode === 'AU' ? '+61' : '+1';
            const fakeNumber = `${countryPrefix}555${Math.floor(1000 + Math.random() * 9000)}`;

            const supabaseAdmin = createClient(
                Deno.env.get('SUPABASE_URL')!,
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
            );

            await supabaseAdmin.from('tenants').update({ twilio_number: fakeNumber, twilio_sid: 'fake_sid' }).eq('id', tenantId);

            return jsonResponse({
                success: true,
                simulated: true,
                message: 'Twilio credentials not found. Simulated number assignment.',
                phone_number: fakeNumber,
                tenant_id: tenantId
            });
        }

        const authString = btoa(`${twilioSid}:${twilioAuth}`);

        // Step 1: Search for an available number in the requested country
        let searchUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/AvailablePhoneNumbers/${countryCode}/Local.json`;

        const searchRes = await fetch(
            searchUrl,
            {
                method: 'GET',
                headers: { 'Authorization': `Basic ${authString}` }
            }
        );

        if (!searchRes.ok) {
            return errorResponse('Failed to search for available Twilio numbers', 500);
        }

        const searchData = await searchRes.json();
        const availableNumbers = searchData.available_phone_numbers;

        if (!availableNumbers || availableNumbers.length === 0) {
            return errorResponse(`No numbers available for country ${countryCode}`, 404);
        }

        const targetNumber = availableNumbers[0].phone_number;

        // Step 2: Purchase the number
        const purchaseParams = new URLSearchParams();
        purchaseParams.append('PhoneNumber', targetNumber);

        // Let's also attach standard SMS webhook for two-way messaging, pointing to our supabase backend
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        if (supabaseUrl) {
            const webhookUrl = supabaseUrl.replace('.supabase.co', '.supabase.co/functions/v1/twilio-webhook');
            purchaseParams.append('SmsUrl', webhookUrl);
            purchaseParams.append('SmsMethod', 'POST');
        }

        // Critical ElevenLabs integration: Route all incoming voice calls directly to the AI
        purchaseParams.append('VoiceUrl', 'https://api.us.elevenlabs.io/twilio/inbound_call');
        purchaseParams.append('VoiceMethod', 'POST');

        const purchaseRes = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/IncomingPhoneNumbers.json`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${authString}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: purchaseParams.toString()
            }
        );

        if (!purchaseRes.ok) {
            const errBody = await purchaseRes.text();
            console.error('Twilio purchase error:', errBody);
            return errorResponse('Failed to purchase Twilio number', 500);
        }

        const purchaseData = await purchaseRes.json();
        const newSid = purchaseData.sid;

        // Step 3: Save to tenant database
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        await supabaseAdmin.from('tenants').update({
            twilio_number: targetNumber,
            twilio_sid: newSid
        }).eq('id', tenantId);

        return jsonResponse({
            success: true,
            simulated: false,
            message: 'Successfully provisioned Twilio number',
            phone_number: targetNumber,
            sid: newSid,
            tenant_id: tenantId
        });

    } catch (e: any) {
        console.error("Number provisioning error:", e);
        return errorResponse(`Error provisioning number: ${e.message}`, 500);
    }
});
