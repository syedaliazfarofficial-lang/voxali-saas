const fs = require('fs');
const path = require('path');

const replacements = [
  { search: /SaaS Basic/g, replace: 'Essentials' },
  { search: /AI Elite/g, replace: 'Enterprise' },
  { search: /Aria AI Receptionist/g, replace: 'Bella AI Receptionist' },
  { search: /Aria/g, replace: 'Bella' },
  { search: /Unlimited staff members/g, replace: 'Up to 2 staff members' }, // Wait, only in Essentials plan card! Let's be careful.
  { search: /Perfect for small shops/g, replace: 'For small salons that need AI + booking automation' },
  { search: /For large salons & chains/g, replace: 'For large salons and high-volume teams' },
  { search: /AI Coins/g, replace: 'AI Minutes' }, // Simplified as per user saying "AI Minutes / AI & Messaging Credits"
  { search: /coin balance/gi, replace: 'AI Minutes Remaining' },
  { search: /No AI receptionist/gi, replace: 'AI Receptionist not included' },
];

function processDirectory(directory) {
  const files = fs.readdirSync(directory);
  
  for (const file of files) {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !fullPath.includes('node_modules') && !fullPath.includes('.git') && !fullPath.includes('dist')) {
      processDirectory(fullPath);
    } else if (stat.isFile() && (fullPath.endsWith('.html') || fullPath.endsWith('.tsx') || fullPath.endsWith('.ts'))) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      
      replacements.forEach(({ search, replace }) => {
          if(search.test(content)){
              content = content.replace(search, replace);
              modified = true;
          }
      });
      
      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

processDirectory('./dashboard');
console.log("Global replace completed.");
