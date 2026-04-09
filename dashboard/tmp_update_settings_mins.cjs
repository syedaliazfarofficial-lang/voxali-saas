const fs = require('fs');

const file = 'c:/Users/syeda/OneDrive/Desktop/Voxali New/dashboard/src/components/Settings.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replacements for Top-Up UI
content = content.replace("handleTopUp('ai_minutes', 50)", "handleTopUp('ai_minutes', 100)");
content = content.replace("chargingType === 'ai_minutes_50' ? '...' : 'Quick Refill (50 Min) - $35'", "chargingType === 'ai_minutes_100' ? '...' : 'Quick Refill (100 Min) - $35'");

content = content.replace("handleTopUp('ai_minutes', 100)", "handleTopUp('ai_minutes', 250)");
content = content.replace("chargingType === 'ai_minutes_100' ? '...' : 'Standard (100 Min) - $65'", "chargingType === 'ai_minutes_250' ? '...' : 'Standard (250 Min) - $65'");

content = content.replace("handleTopUp('ai_minutes', 250)", "handleTopUp('ai_minutes', 600)");
content = content.replace("chargingType === 'ai_minutes_250' ? 'REDIRECTING...' : 'High Volume (250 Min) - $150'", "chargingType === 'ai_minutes_600' ? 'REDIRECTING...' : 'High Volume (600 Min) - $150'");

// Replacements for the Info Boxes inside Settings plans config
content = content.replace("creditsBox: { title: 'Monthly AI & messaging credits', desc: '(Approx. 100 AI minutes or 400 SMS)' }", "creditsBox: { title: 'Monthly AI & messaging credits', desc: '(Approx. 250 AI minutes or 500 SMS)' }");
content = content.replace("creditsBox: { title: 'Monthly AI & messaging credits', desc: '(Approx. 250 AI minutes or 1,000 SMS)', highlight: true }", "creditsBox: { title: 'Monthly AI & messaging credits', desc: '(Approx. 600 AI minutes or 1,500 SMS)', highlight: true }");

fs.writeFileSync(file, content);
console.log('Done!');
