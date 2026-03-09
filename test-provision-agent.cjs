const fetch = require('node-fetch');

async function testProvisionAgent() {
    console.log("Testing ElevenLabs Provisioning Endpoint...");

    // Test data from a recent user
    const payload = {
        tenant_id: "67244f82-65ae-44cf-8ca8-63017b60789d",
        salon_name: "Luxe Aurea"
    };

    const supabaseUrl = "https://sjzxgjimbcoqsylrglkm.supabase.co";
    const toolsKey = "LUXE-AUREA-SECRET-2026";
    const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MzAyOTAsImV4cCI6MjA4NTAwNjI5MH0.Az1hO8pFJcVIpeJJiSMe3MGEu5_u8oHaNqLW2gpBQn4";

    try {
        const response = await fetch(`${supabaseUrl}/functions/v1/provision-elevenlabs-agent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${anonKey}`,
                'X-TOOLS-KEY': toolsKey
            },
            body: JSON.stringify(payload)
        });

        const text = await response.text();
        console.log("Status:", response.status);
        console.log("Body:", text);
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

testProvisionAgent();
