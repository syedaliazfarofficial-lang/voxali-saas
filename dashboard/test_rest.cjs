const url = 'https://sjzxgjimbcoqsylrglkm.supabase.co/rest/v1/rpc/get_available_slots';
const headers = {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0',
    'Content-Type': 'application/json'
};

async function test() {
    console.log("March 24th:");
    const res24 = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ p_tenant_id: 'e3c9b32f-7f4c-44b9-b0b6-97b00b7c0288', p_date: '2026-03-24' })
    });
    console.log(res24.status, res24.statusText);
    console.log(await res24.text());
    
    console.log("\nMarch 25th:");
    const res25 = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ p_tenant_id: 'e3c9b32f-7f4c-44b9-b0b6-97b00b7c0288', p_date: '2026-03-25' })
    });
    console.log(await res25.text());
}
test();
