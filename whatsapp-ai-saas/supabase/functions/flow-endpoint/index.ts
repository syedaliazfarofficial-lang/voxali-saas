import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { decode as decodeBase64, encode as encodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const FLOW_PRIVATE_KEY = Deno.env.get("FLOW_PRIVATE_KEY") || ""; // RSA Private Key in PEM format

// --- Crypto Helpers for WhatsApp Flows Encryption ---

async function importPrivateKey(pem: string) {
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = pem.substring(
    pem.indexOf(pemHeader) + pemHeader.length,
    pem.indexOf(pemFooter)
  ).replace(/\s/g, "");
  
  const binaryDer = decodeBase64(pemContents);
  
  return await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["decrypt"]
  );
}

async function decryptAESKey(encryptedAesKeyBase64: string, privateKey: CryptoKey) {
  const encryptedAesKey = decodeBase64(encryptedAesKeyBase64);
  const decryptedAesKeyBytes = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    encryptedAesKey
  );
  return await crypto.subtle.importKey(
    "raw",
    decryptedAesKeyBytes,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt", "encrypt"]
  );
}

async function decryptFlowData(encryptedFlowDataBase64: string, ivBase64: string, aesKey: CryptoKey) {
  const encryptedFlowData = decodeBase64(encryptedFlowDataBase64);
  const iv = decodeBase64(ivBase64);
  
  // Decrypt data
  const decryptedBytes = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv, tagLength: 128 },
    aesKey,
    encryptedFlowData
  );
  
  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(decryptedBytes));
}

async function encryptFlowResponse(responseData: any, aesKey: CryptoKey) {
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(JSON.stringify(responseData));
  
  // Generate a random 12-byte IV for the response
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt
  const encryptedBytes = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv, tagLength: 128 },
    aesKey,
    dataBytes
  );
  
  return {
    encrypted_flow_data: encodeBase64(new Uint8Array(encryptedBytes)),
    initial_vector: encodeBase64(iv)
  };
}

// --- Main Endpoint ---

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.json();
    const { encrypted_flow_data, encrypted_aes_key, initial_vector } = body;

    if (!FLOW_PRIVATE_KEY) {
       console.error("FLOW_PRIVATE_KEY is not set.");
       return new Response("Server error", { status: 500 });
    }

    // 1. Initialize keys and decrypt request
    const privateKey = await importPrivateKey(FLOW_PRIVATE_KEY);
    const aesKey = await decryptAESKey(encrypted_aes_key, privateKey);
    const decryptedData = await decryptFlowData(encrypted_flow_data, initial_vector, aesKey);

    console.log("📥 Decrypted Flow Request:", JSON.stringify(decryptedData, null, 2));

    const action = decryptedData.action;
    const data = decryptedData.data;

    let responsePayload = {
        version: "3.0",
        screen: "ERROR",
        data: { error_message: "Unknown action" }
    };

    // 2. Handle Flow Actions (data_exchange, ping, etc.)
    if (action === "ping") {
        responsePayload = {
            version: "3.0",
            data: { status: "active" }
        };
    } else if (action === "data_exchange") {
        // Here we handle the dynamic data fetching (e.g., getting the menu for the specific restaurant)
        // For now, returning a static response for testing
        responsePayload = {
            version: "3.0",
            screen: "MENU_SELECTION",
            data: {
               restaurant_name: "Desi Dhaba",
               menu_items: [
                 { id: "item_1", title: "Chicken Karahi", price: 1200 },
                 { id: "item_2", title: "Beef Biryani", price: 800 }
               ]
            }
        };
    } else if (action === "INIT") {
       // First action when flow opens
       responsePayload = {
           version: "3.0",
           screen: "WELCOME",
           data: {
              greeting: "Welcome to Voxali Orders!"
           }
       };
    }

    // 3. Encrypt the response and send it back to Meta
    const encryptedResponse = await encryptFlowResponse(responsePayload, aesKey);
    return new Response(JSON.stringify(encryptedResponse), {
        headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("Error processing flow:", err);
    return new Response("Invalid request or decryption failed", { status: 400 });
  }
});
