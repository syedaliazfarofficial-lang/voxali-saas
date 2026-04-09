const fs = require('fs');
const filePath = 'c:/Users/syeda/OneDrive/Desktop/Voxali New/dashboard/src/components/Settings.tsx';
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(
    /body: JSON\.stringify\(\{ tenant_id: tenantId, action: 'create' \}\),/,
    `body: JSON.stringify({ tenant_id: tenantId, action: 'create', return_url: window.location.href + '?stripe=success', refresh_url: window.location.href + '?stripe=refresh' }),`
);

fs.writeFileSync(filePath, code, 'utf8');
console.log("Stripe return_url fix applied");
