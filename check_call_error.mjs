import fetch from 'node-fetch';

const SID = 'AC01168f5c2415b22040d8cd4687a1ed4e';
const AUTH = '6f5b3a6b449ecee1c416aa267614d38b';

const authString = Buffer.from(`${SID}:${AUTH}`).toString('base64');
const headers = {
    'Authorization': `Basic ${authString}`
};

async function checkSpecificCall() {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Calls.json?PageSize=1`, { headers });
    const data = await res.json();
    if (data.calls && data.calls.length > 0) {
        const c = data.calls[0];
        console.log(`Call SID: ${c.sid}`);
        console.log(`Status: ${c.status}`);
        console.log(`Duration: ${c.duration}`);
        
        // Fetch call notifications to see if there is an error code
        const notifRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${SID}/Calls/${c.sid}/Notifications.json`, { headers });
        const notifData = await notifRes.json();
        
        console.log("Notifications for Call:", notifData.notifications?.length || 0);
        if (notifData.notifications) {
            notifData.notifications.forEach(n => {
                console.log(`Error Code: ${n.error_code}`);
                console.log(`Message: ${n.message_text}`);
            });
        }
    }
}

checkSpecificCall().catch(console.error);
