const https = require('https');

const expectedAgentId = '12345'; // dummy
const options = {
    hostname: 'api.elevenlabs.io',
    port: 443,
    path: `/v1/convai/agents/${expectedAgentId}/twilio`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
    }
};

const req = https.request(options, res => {
    console.log(`statusCode: ${res.statusCode}`);
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => console.log(data));
});

req.on('error', error => console.error(error));
req.write('CallSid=CA123&From=+123&To=+456');
req.end();
