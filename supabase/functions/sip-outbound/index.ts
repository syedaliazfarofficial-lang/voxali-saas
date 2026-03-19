import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
    try {
        const text = await req.text();
        const params = new URLSearchParams(text);
        
        let toParam = params.get('To') || '';
        const calledParam = params.get('Called') || '';
        
        let destination = calledParam || toParam;
        
        // Extract number from sip: uri if needed
        const match = destination.match(/sip:(.*?)(@|$)/);
        if (match && match[1]) {
            destination = match[1];
        }

        // Clean up the number just in case
        if (!destination.startsWith('+')) {
            // Assume US format if someone dials without +1
            if (destination.length === 10) destination = '+1' + destination;
            else if (destination.length === 11 && destination.startsWith('1')) destination = '+' + destination;
        }

        const CALLER_ID = "+15014346760"; // The user's caller ID

        const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial callerId="+15014346760">
        <Number>${destination}</Number>
    </Dial>
</Response>`;

        return new Response(twiml, {
            headers: { "Content-Type": "text/xml" }
        });
    } catch (e: any) {
        return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Connection Error. ${e.message}</Say></Response>`, {
            headers: { "Content-Type": "text/xml" }
        });
    }
});
