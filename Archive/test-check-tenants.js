const SUPABASE_URL = "https://sjzxgjimbcoqsylrglkm.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Y-F9X2U0bC12z58P0-k_sQhS-3p7Bq7kK2p4Xz_8qY";

async function run() {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/tenants?select=id,name,timezone,currency,vapi_assistant_id,twilio_number,created_at&order=created_at.desc&limit=3`, {
            headers: {
                "Authorization": `Bearer ${SERVICE_KEY}`,
                "apikey": SERVICE_KEY
            }
        });
        const data = await res.json();
        console.log("Recent Tenants:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}
run();
