import fetch from 'node-fetch';

const SID = 'AC01168f5c2415b22040d8cd4687a1ed4e';
const AUTH = '6f5b3a6b449ecee1c416aa267614d38b';
const BASE_URL = `https://api.twilio.com/2010-04-01/Accounts/${SID}`;

const authString = Buffer.from(`${SID}:${AUTH}`).toString('base64');
const headers = {
    'Authorization': `Basic ${authString}`,
    'Content-Type': 'application/x-www-form-urlencoded'
};

const SUPABASE_PROJECT_URL = 'https://sjzxgjimbcoqsylrglkm.supabase.co'; // Known from earlier deploy logs

async function run() {
    console.log('1. Creating Credential List...');
    let res = await fetch(`${BASE_URL}/SIP/CredentialLists.json`, {
        method: 'POST',
        headers,
        body: new URLSearchParams({ FriendlyName: 'Voxali Zoiper Auth' })
    });
    const credList = await res.json();
    console.log('Credential List:', credList.sid);

    console.log('2. Adding User to Credential List...');
    res = await fetch(`${BASE_URL}/SIP/CredentialLists/${credList.sid}/Credentials.json`, {
        method: 'POST',
        headers,
        body: new URLSearchParams({
            Username: 'syed_voxali',
            Password: 'Password123!'
        })
    });
    console.log('User created:', (await res.json()).sid);

    console.log('3. Creating SIP Domain...');
    const domainName = `voxali-${Date.now().toString().slice(-6)}.sip.us1.twilio.com`;
    // We point voice routing to our new Edge function
    res = await fetch(`${BASE_URL}/SIP/Domains.json`, {
        method: 'POST',
        headers,
        body: new URLSearchParams({
            DomainName: domainName,
            FriendlyName: 'Voxali App Outbound',
            VoiceUrl: `${SUPABASE_PROJECT_URL}/functions/v1/sip-outbound`,
            VoiceMethod: 'POST',
            SipRegistration: 'true'
        })
    });
    const domain = await res.json();
    console.log('SIP Domain created:', domain.domain_name, 'SID:', domain.sid);

    console.log('4. Connecting Credential List to SIP Domain for Auth...');
    res = await fetch(`${BASE_URL}/SIP/Domains/${domain.sid}/Auth/Registrations/CredentialListMappings.json`, {
        method: 'POST',
        headers,
        body: new URLSearchParams({ CredentialListSid: credList.sid })
    });
    res = await fetch(`${BASE_URL}/SIP/Domains/${domain.sid}/Auth/Calls/CredentialListMappings.json`, {
        method: 'POST',
        headers,
        body: new URLSearchParams({ CredentialListSid: credList.sid })
    });

    console.log('DONE!');
    console.log('------------------------------------------------');
    console.log(`SIP DOMAIN: ${domain.domain_name}`);
    console.log(`USERNAME:   syed_voxali`);
    console.log(`PASSWORD:   Password123!`);
    console.log('------------------------------------------------');
}

run().catch(console.error);
