async function run() {
    const anonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MzAyOTAsImV4cCI6MjA4NTAwNjI5MH0.Az1hO8pFJcVIpeJJiSMe3MGEu5_u8oHaNqLW2gpBQn4';

    console.log("Testing Vapi Agent Creation...");
    const res = await fetch("https://sjzxgjimbcoqsylrglkm.supabase.co/functions/v1/provision-vapi-agent", {
        method: 'POST',
        headers: {
            "Authorization": `Bearer ${anonKey}`,
            "Content-Type": "application/json",
            "X-TOOLS-KEY": "LUXE-AUREA-SECRET-2026"
        },
        body: JSON.stringify({
            tenantId: "test-vapi-tenant-123",
            salonName: "Aurel Salon USA",
            countryCode: "US"
        })
    });

    console.log("Status:", res.status);
    console.log("Body:", await res.text());
}
run();
