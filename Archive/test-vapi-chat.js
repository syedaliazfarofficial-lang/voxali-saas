const VAPI_KEY = "1b228f41-b847-497d-acf6-da9bc31fcd06"; // The key from previous sessions
const ASSISTANT_ID = "2f08157a-4223-4030-ae2c-76b2450718e8"; // The one from the user's screenshot

async function testChat() {
    try {
        const response = await fetch("https://api.vapi.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${VAPI_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                assistantId: ASSISTANT_ID,
                messages: [{ role: "user", content: "Hi, I need to book an appointment." }]
            })
        });

        const data = await response.json();
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}

testChat();
