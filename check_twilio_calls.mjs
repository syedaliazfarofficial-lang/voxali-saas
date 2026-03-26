import fetch from 'node-fetch';

const SID = 'AC01168f5c2415b22040d8cd4687a1ed4e';
const AUTH = '6f5b3a6b449ecee1c416aa267614d38b';

const authString = Buffer.from(`${SID}:${AUTH}`).toString('base64');
const headers = {
    'Authorization': `Basic ${authString}`
};

async function checkCalls() {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Calls.json?PageSize=3`, { headers });
    const data = await res.json();
    if (data.calls && data.calls.length > 0) {
        data.calls.forEach(c => {
            console.log(`Call to: ${c.to}, from: ${c.from}, status: ${c.status}, duration: ${c.duration}, callerId: ${c.caller_name}`);
        });
    } else {
        console.log("No recent calls found.");
    }
}

checkCalls().catch(console.error);
