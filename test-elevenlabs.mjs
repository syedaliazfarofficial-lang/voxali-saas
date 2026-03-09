const apiKey = 'sk_c86f89506a8dd4d121803d4fe8888d424765a9d65600990d';
const salonName = 'Test Salon';

const createAgentPayload = {
    name: `${salonName} AI Receptionist`,
    conversation_config: {
        agent: {
            prompt: {
                prompt: `You are the AI receptionist for ${salonName}. Your job is to assist clients by providing business hours, answering simple queries, and helping them book an appointment. Be polite, professional, and friendly. Always keep your responses concise.`
            },
            first_message: `Hello, thank you for calling ${salonName}. How can I help you book your appointment today?`,
            language: "en"
        }
    }
};

async function test() {
    const response = await fetch('https://api.elevenlabs.io/v1/convai/agents/create', {
        method: 'POST',
        headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(createAgentPayload)
    });

    const text = await response.text();
    console.log("Status:", response.status);
    console.log("Body:", text);
}

test();
