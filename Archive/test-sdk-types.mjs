import fs from 'fs';
import https from 'https';

https.get('https://esm.sh/@elevenlabs/elevenlabs-js@0.14.0/api/resources/conversationalAi/client/Client.d.ts', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log(data));
});
