const PRIVATE_KEY = "1b228f41-b847-497d-acf6-da9bc31fcd06";
const PUBLIC_KEY = "280c3ea6-32d8-49bb-b421-cd2fddb377fd";
const ASSISTANT_ID = "2f08157a-4223-4030-ae2c-76b2450718e8";

async function testChat(key, name) {
    console.log(`Testing with ${name}...`);
    try {
        const response = await fetch("https://api.vapi.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${key}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                assistantId: ASSISTANT_ID,
                messages: [{ role: "user", content: "Hi, I need to book an appointment." }]
            })
        });

        if (!response.ok) {
            const txt = await response.text();
            console.log("Error:", response.status, txt);
            return;
        }
        const data = await response.json();
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}

async function run() {
    await testChat(PRIVATE_KEY, "PRIVATE_KEY");
    await testChat(PUBLIC_KEY, "PUBLIC_KEY");
}
run();
