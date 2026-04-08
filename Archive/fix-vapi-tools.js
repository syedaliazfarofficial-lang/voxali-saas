const VAPI_KEY = "af3e29c7e1261f6efe8563a8b426b0614cb102a2de3baa5752da205aacde4afe";
const ASSISTANT_ID = "2f08157a-4223-4030-ae2c-76b2450718e8";
const GATEWAY_URL = "https://sjzxgjimbcoqsylrglkm.supabase.co/functions/v1/vapi-tools-gateway";
const SECRET = "LUXE-AUREA-SECRET-2026";

async function updateTools() {
    console.log("Fetching assistant details...");
    let res = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
        headers: { "Authorization": `Bearer ${VAPI_KEY}` }
    });

    if (!res.ok) {
        console.error("Failed to fetch assistant:", await res.text());
        return;
    }

    let assistant = await res.json();
    let tools = assistant.tools || [];

    console.log(`Found ${tools.length} tools. Patching URLs...`);
    let patchedCount = 0;

    let newTools = tools.map(t => {
        if (t.server && t.server.url) {
            t.server.url = GATEWAY_URL;
            t.server.secret = SECRET;
            patchedCount++;
        }
        return t;
    });

    console.log(`Updated ${patchedCount} tools. Sending PATCH request...`);

    let patchRes = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
        method: "PATCH",
        headers: {
            "Authorization": `Bearer ${VAPI_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ tools: newTools })
    });

    if (patchRes.ok) {
        console.log("Successfully updated assistant tools!");
    } else {
        console.error("Failed to update assistant:", await patchRes.text());
    }
}

updateTools();
