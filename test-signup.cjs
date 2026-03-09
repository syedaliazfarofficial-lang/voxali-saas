const fetch = require('node-fetch');

async function checkSignupError() {
    const supabaseUrl = "https://sjzxgjimbcoqsylrglkm.supabase.co"; // Valid Production URL based on previous successful logs

    // We get this session id from the user's latest screenshot
    const payload = {
        session_id: "cs_test_b1E7CHgOsbieuJhfrsPxGlzflIWQzWpOHUxxBShff5YCNn3REvtZhkKe3W",
        fullName: "kali",
        salonName: "kali salon",
        email: "kali@salon.com",
        password: "Pak@545537?"
    };

    try {
        console.log("Sending manual signup request...");
        const response = await fetch(`${supabaseUrl}/functions/v1/setup-account`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
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

checkSignupError();
