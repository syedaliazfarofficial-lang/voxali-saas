import fetch from 'node-fetch';

async function run() {
    try {
        const res = await fetch('https://sjzxgjimbcoqsylrglkm.supabase.co/functions/v1/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                plan: 'starter',
                email: 'test@example.com',
                salon_name: 'Test Salon'
            })
        });
        
        console.log('Status:', res.status);
        console.log('Text:', await res.text());
    } catch (e) {
        console.error(e);
    }
}
run();
