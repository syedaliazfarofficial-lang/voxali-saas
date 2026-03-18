const fetch = require('node-fetch');

async function testGateway() {
    const gatewayUrl = "https://sjzxgjimbcoqsylrglkm.supabase.co/functions/v1/vapi-tools-gateway";

    // Mock Vapi Payload
    const payload = {
        message: {
            type: "tool-calls",
            call: { id: "call_abc123" },
            toolWithToolCallList: [
                {
                    tool: {
                        type: "function",
                        function: { name: "get_salon_info" }
                    },
                    toolCall: {
                        id: "tool_call_xyz890",
                        type: "function",
                        function: {
                            name: "get_salon_info",
                            arguments: { tenant_id: "67244f82-65ae-44cf-8ca8-63017b60789d" }
                        }
                    }
                }
            ]
        }
    };

    try {
        console.log("Sending payload to Gateway...");
        const response = await fetch(gatewayUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-vapi-secret': 'LUXE-AUREA-SECRET-2026'
            },
            body: JSON.stringify(payload)
        });

        const status = response.status;
        console.log(`Status: ${status}`);
        const text = await response.text();
        console.log(`Response Body:\n${text}`);

    } catch (e) {
        console.error("Fetch Error:", e.message);
    }
}

testGateway();
