const https = require('https');
const data = JSON.stringify({});

const options = {
    hostname: 'api.elevenlabs.io',
    port: 443,
    path: '/v1/convai/phone-numbers',
    method: 'POST',
    headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY || 'sk_c86f89506a8dd4d121803d4fe8888d424765a9d65600990d',
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, res => {
    console.log(`statusCode: ${res.statusCode}`);
    res.on('data', d => {
        process.stdout.write(d);
    });
});

req.on('error', error => {
    console.error(error);
});

req.write(data);
req.end();
