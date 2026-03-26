import fetch from 'node-fetch';

const SID = 'AC01168f5c2415b22040d8cd4687a1ed4e';
const AUTH = '6f5b3a6b449ecee1c416aa267614d38b';

const authString = Buffer.from(`${SID}:${AUTH}`).toString('base64');
const headers = {
    'Authorization': `Basic ${authString}`
};

async function checkNums() {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/IncomingPhoneNumbers.json`, { headers });
    const data = await res.json();
    if (data.incoming_phone_numbers && data.incoming_phone_numbers.length > 0) {
        data.incoming_phone_numbers.forEach(n => {
            console.log(`Owned Number: ${n.phone_number}`);
        });
    } else {
        console.log("No numbers owned on this account.");
    }
}

checkNums().catch(console.error);
