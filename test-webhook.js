async function test() {
    console.log("Testing Stripe Subscription Webhook...");
    const url = "https://sjzxgjimbcoqsylrglkm.supabase.co/functions/v1/stripe-subscription-webhook";

    const payload = {
        type: "checkout.session.completed",
        data: {
            object: {
                mode: "subscription",
                customer_details: { email: "testuser123@example.com", name: "Test Salon" },
                customer: "cus_demo_123",
                subscription: "sub_demo_123",
                metadata: {
                    plan: "growth",
                    limits: JSON.stringify({ staff: 10, ai_minutes: 400, sms: 1000, emails: 5000 })
                }
            }
        }
    };

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    const status = res.status;
    const text = await res.text();
    console.log(`Status: ${status}`);
    console.log(`Response: ${text}`);
}

test();
