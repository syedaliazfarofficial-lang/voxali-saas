async function testEdge() {
    const url = 'https://sjzxgjimbcoqsylrglkm.supabase.co/functions/v1/check-availability';
    
    const res25 = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-TOOLS-KEY': 'LUXE-AUREA-SECRET-2026' },
        body: JSON.stringify({ tenant_id: 'e3c9b32f-7f4c-44b9-b0b6-97b00b7c0288', date: '2026-03-25' })
    });
    console.log("March 25th:", await res25.json());

    const res24 = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-TOOLS-KEY': 'LUXE-AUREA-SECRET-2026' },
        body: JSON.stringify({ tenant_id: 'e3c9b32f-7f4c-44b9-b0b6-97b00b7c0288', date: '2026-03-24' })
    });
    const d24 = await res24.json();
    console.log("March 24th DEBUG:", JSON.stringify(d24, null, 2));
}
testEdge();
