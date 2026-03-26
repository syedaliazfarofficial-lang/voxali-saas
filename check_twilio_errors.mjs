import fetch from 'node-fetch';

const SID = 'AC01168f5c2415b22040d8cd4687a1ed4e';
const AUTH = '6f5b3a6b449ecee1c416aa267614d38b';

const authString = Buffer.from(`${SID}:${AUTH}`).toString('base64');
const headers = {
    'Authorization': `Basic ${authString}`
};

async function checkErrors() {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Notifications.json`, { headers });
    const data = await res.json();
    if (data.notifications && data.notifications.length > 0) {
        console.log(data.notifications[0].message_text);
        console.log(data.notifications[0].more_info);
    } else {
        console.log("No recent notifications found.");
    }
}

checkErrors().catch(console.error);
