const fs = require('fs');
const filePath = 'c:/Users/syeda/OneDrive/Desktop/Voxali New/dashboard/src/components/Settings.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// Replace status fetch
code = code.replace(
    /const r = await fetch\('https:\/\/sjzxgjimbcoqsylrglkm\.supabase\.co\/functions\/v1\/stripe-connect-onboard', \{\s*method: 'POST',\s*headers: \{ 'Content-Type': 'application\/json', 'X-TOOLS-KEY': 'LUXE-AUREA-SECRET-2026' \},\s*body: JSON\.stringify\(\{ tenant_id: tenantId, action: 'status' \}\),\s*\}\);/,
    `const { data: { session } } = await supabase.auth.getSession();
                    const r = await fetch('https://sjzxgjimbcoqsylrglkm.supabase.co/functions/v1/stripe-connect-onboard', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json', 
                            'X-TOOLS-KEY': 'LUXE-AUREA-SECRET-2026',
                            'Authorization': \`Bearer \${session?.access_token}\`
                        },
                        body: JSON.stringify({ tenant_id: tenantId, action: 'status' }),
                    });`
);

// Replace create fetch
code = code.replace(
    /const r = await fetch\('https:\/\/sjzxgjimbcoqsylrglkm\.supabase\.co\/functions\/v1\/stripe-connect-onboard', \{\s*method: 'POST',\s*headers: \{ 'Content-Type': 'application\/json', 'X-TOOLS-KEY': 'LUXE-AUREA-SECRET-2026' \},\s*body: JSON\.stringify\(\{ tenant_id: tenantId, action: 'create' \}\),\s*\}\);/,
    `const { data: { session } } = await supabase.auth.getSession();
            const r = await fetch('https://sjzxgjimbcoqsylrglkm.supabase.co/functions/v1/stripe-connect-onboard', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'X-TOOLS-KEY': 'LUXE-AUREA-SECRET-2026',
                    'Authorization': \`Bearer \${session?.access_token}\`
                },
                body: JSON.stringify({ tenant_id: tenantId, action: 'create' }),
            });`
);

fs.writeFileSync(filePath, code, 'utf8');
console.log("Stripe onboard auth fix applied");
