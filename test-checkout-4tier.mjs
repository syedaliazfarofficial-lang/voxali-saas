const SUPABASE_URL = "https://sjzxgjimbcoqsylrglkm.supabase.co";

async function testFetch() {
    console.log("Testing create-checkout-session with plan 'elite'...");
    try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan: 'elite', email: 'test_elite@example.com' }),
        });

        const data = await res.json();
        console.log("Status:", res.status);
        console.log("Response:", data);
    } catch (e) {
        console.error("Error:", e);
    }
}

testFetch();
