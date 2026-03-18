async function testWaitlist() {
    const url = 'https://sjzxgjimbcoqsylrglkm.supabase.co/functions/v1/vapi-tools-gateway';
    const secret = 'LUXE-AUREA-SECRET-2026';
    const tenantId = 'e3c9b32f-7f4c-44b9-b0b6-97b00b7c0288';
    
    // Helper to send tool calls the way VAPI does it
    const callTool = async (name, args) => {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-vapi-secret': secret
            },
            body: JSON.stringify({
                message: {
                    type: "tool-calls",
                    toolWithToolCallList: [{
                        toolCall: {
                            id: "test_" + Date.now(),
                            function: { name, arguments: args }
                        }
                    }]
                }
            })
        });
        const d = await res.json();
        return d.results?.[0]?.result || d;
    };

    console.log("1. Creating dummy waitlist entry...");
    const waitlistRes = await callTool("add_to_waitlist", {
        tenant_id: tenantId,
        client_name: "Test Ali",
        client_phone: "03001234567",
        client_email: "test.ali.azfar@gmail.com",
        preferred_date: "2026-04-10"
    });
    console.log("Waitlist Res:", waitlistRes);
    
    console.log("\n2. Getting Services...");
    const svcData = await callTool("list_services", { tenant_id: tenantId });
    
    const serviceId = svcData?.services?.[0]?.id;
    
    if (!serviceId) {
        console.log("Could not find a service ID");
        return;
    }
    
    console.log("\n3. Creating Booking...");
    const bookRes = await callTool("create_booking", {
        tenant_id: tenantId,
        client_name: "Cancel Test User",
        client_phone: "03009998888",
        client_email: "cancel@test.com",
        service_ids: serviceId,
        date: "2026-04-10",
        time: "10:00"
    });
    console.log("Booking Res:", bookRes);
    
    console.log("\n4. Cancelling Booking...");
    const cancelRes = await callTool("cancel_booking", {
        tenant_id: tenantId,
        client_name: "Cancel Test User",
        client_phone: "03009998888"
    });
    console.log("Cancel Res:", cancelRes);
    
    console.log("\nTest Flow Complete.");
}

testWaitlist().catch(console.error);
