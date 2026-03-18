const https = require('https');

const options = {
    hostname: 'api.elevenlabs.io',
    port: 443,
    path: `/v1/convai/phone-numbers`,
    method: 'GET',
    headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY || 'sk_c86f89506a8dd4d121803d4fe8888d424765a9d65600990d',
        'Content-Type': 'application/json'
    }
};

const req = https.request(options, res => {
    console.log(`GET statusCode: ${res.statusCode}`);
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => console.log('GET response:', body));
});
req.on('error', error => console.error(error));
req.end();

const postData = JSON.stringify({ provider: 'twilio', phone_number: '+1234567890' });
const postOptions = {
    hostname: 'api.elevenlabs.io',
    port: 443,
    path: `/v1/convai/phone-numbers`,
    method: 'POST',
    headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY || 'sk_c86f89506a8dd4d121803d4fe8888d424765a9d65600990d',
        'Content-Type': 'application/json',
        'Content-Length': postData.length
    }
};

const postReq = https.request(postOptions, res => {
    console.log(`\nPOST statusCode: ${res.statusCode}`);
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => console.log('POST response:', body));
});
postReq.on('error', error => console.error(error));
postReq.write(postData);
postReq.end();
