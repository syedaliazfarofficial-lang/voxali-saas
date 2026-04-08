const fetch = require('node-fetch');

async function testVapiSignup() {
    const supabaseUrl = "https://sjzxgjimbcoqsylrglkm.supabase.co";

    // Mimic the payload structure that setup-account expects
    const payload = {
        session_id: "test_" + Date.now().toString(), // fake session ID
        fullName: "Vapi Tester",
        salonName: "Vapi Test Salon",
        email: "vapi.test" + Date.now().toString() + "@voxali.com",
        password: "Password123!"
    };

    console.log("Mocking a Signup Request to Voxali Backend...");
    console.log("Payload:", payload);

    try {
        const response = await fetch(`${supabaseUrl}/functions/v1/setup-account`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' // Add authorization if edge function requires it, but looks like it handles auth itself.
            },
            body: JSON.stringify(payload)
        });

        const status = response.status;
        console.log(`\nResponse Status: ${status}`);

        const text = await response.text();
        console.log(`Response Body:\n${text}`);

        if (status === 200) {
            console.log("\n✅ SUCCESS: The account setup function completed successfully.");
            console.log("\nPlease check your Supabase Dashboard -> Table Editor -> 'tenants' table to verify the new tenant has a 'vapi_assistant_id' and 'twilio_number'.");
        } else {
            console.log("\n❌ ERROR: The function failed. See the response body above for details.");
        }

    } catch (e) {
        console.error("\n❌ Fetch Error:", e.message);
    }
}

testVapiSignup();
