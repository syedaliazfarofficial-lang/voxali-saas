import { ElevenLabsClient } from "https://esm.sh/@elevenlabs/elevenlabs-js@0.14.0"; // guessing version based on recent 2026 releases

async function test() {
    try {
        const elevenlabs = new ElevenLabsClient({
            apiKey: 'sk_c86f89506a8dd4d121803d4fe8888d424765a9d65600990d' // the key user provided earlier
        });

        const agent = await elevenlabs.conversationalAi.agents.create({
            name: "Luxe Aurea AI Receptionist",
            conversation_config: {
                agent: {
                    prompt: {
                        prompt: "You are a helpful assistant"
                    },
                    first_message: "Hello"
                }
            }
        });

        console.log("Success:", agent);
    } catch (e) {
        console.error("Error:", e);
    }
}

test();
