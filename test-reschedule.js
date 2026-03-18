const fetch = require('node-fetch');

async function testGateway() {
    const gatewayUrl = "https://sjzxgjimbcoqsylrglkm.supabase.co/functions/v1/vapi-tools-gateway";

    // Mock Vapi Payload for reschedule_booking
    const payload = {
        message: {
            type: "tool-calls",
            call: { id: "call_abc123" },
            toolWithToolCallList: [
                {
                    tool: {
                        type: "function",
                        function: { name: "reschedule_booking" }
                    },
                    toolCall: {
                        id: "tool_call_xyz890",
                        type: "function",
                        function: {
                            name: "reschedule_booking",
                            arguments: {
                                tenant_id: "51dbb250-fe0b-41be-9d46-76d0b7b528e7",
                                client_name: "Shan",
                                client_phone: "+923313616722",
                                new_date: "2026-03-12",
                                new_time: "13:00"
                            }
                        }
                    }
                }
            ]
        }
    };

    try {
        console.log("Sending reschedule payload to Gateway...");
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
