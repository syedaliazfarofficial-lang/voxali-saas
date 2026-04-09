const fs = require('fs');
const filePath = 'c:/Users/syeda/OneDrive/Desktop/Voxali New/dashboard/src/components/Settings.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Remove basic plan object
const targetPlanStr = `        {
            id: 'basic', name: 'Essentials', price: '$49', subtitle: 'For salons that just need software',
            features: [
                'Up to 2 staff members', 'Online booking page', 'Payment & Deposits', 'Basic CRM & Calendar',
                { text: 'AI Receptionist not included', strike: true }, { text: 'SMS reminders not included', strike: true }
            ]
        },`;
code = code.replace(targetPlanStr, '');

// 2. Change grid layout
code = code.replace(
    'className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start"', 
    'className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start max-w-6xl mx-auto"'
);

// 3. Change fallback active tier
code = code.replace(
    /const isActive = \(planTier \|\| 'basic'\)\.toLowerCase\(\) === p\.id;/g,
    `const isActive = (planTier || 'starter').toLowerCase() === p.id;`
);

fs.writeFileSync(filePath, code, 'utf8');
console.log("Settings.tsx robust refactor complete.");
