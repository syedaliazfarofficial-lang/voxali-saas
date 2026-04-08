async function run() {
    console.log("Testing Vapi Agent Creation with Valid UUID...");

    // UUID v4 format
    const dummyTenantId = "11111111-2222-3333-4444-555555555555";

    const res = await fetch("https://sjzxgjimbcoqsylrglkm.supabase.co/functions/v1/provision-vapi-agent", {
        method: 'POST',
        headers: {
            "Authorization": `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MzAyOTAsImV4cCI6MjA4NTAwNjI5MH0.Az1hO8pFJcVIpeJJiSMe3MGEu5_u8oHaNqLW2gpBQn4`,
            "Content-Type": "application/json",
            "X-TOOLS-KEY": "LUXE-AUREA-SECRET-2026"
        },
        body: JSON.stringify({
            tenantId: dummyTenantId,
            salonName: "Aurel Salon USA Testing",
            countryCode: "US"
        })
    });

    console.log("Status:", res.status);
    console.log("Body:", await res.text());
}
run();
