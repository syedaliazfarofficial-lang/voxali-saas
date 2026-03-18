async function run() {
    console.log("Testing Twilio Number Provisioning with Valid JWT...");

    // UUID v4 format
    const dummyTenantId = "11111111-2222-3333-4444-555555555555";
    const vapiAssistantId = "71343b95-5a4f-4b5a-898d-603f1f408237";

    const validJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MzAyOTAsImV4cCI6MjA4NTAwNjI5MH0.Az1hO8pFJcVIpeJJiSMe3MGEu5_u8oHaNqLW2gpBQn4";

    const res = await fetch("https://sjzxgjimbcoqsylrglkm.supabase.co/functions/v1/provision-twilio-number", {
        method: 'POST',
        headers: {
            "Authorization": `Bearer ${validJwt}`,
            "Content-Type": "application/json",
            "X-TOOLS-KEY": "LUXE-AUREA-SECRET-2026"
        },
        body: JSON.stringify({
            tenant_id: dummyTenantId,
            country_code: "US",
            vapi_assistant_id: vapiAssistantId
        })
    });

    console.log("Status:", res.status);
    console.log("Body:", await res.text());
}
run();
