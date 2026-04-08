import { ElevenLabsClient } from "https://esm.sh/@elevenlabs/elevenlabs-js@0.14.0";

const client = new ElevenLabsClient({ apiKey: 'dummy' });

console.log(Object.keys(client.conversationalAi));
console.log(Object.keys(client.conversationalAi.phoneNumbers || {}));
