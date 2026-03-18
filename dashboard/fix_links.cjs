const fs = require('fs');
const path = require('path');

const files = ['index.html', 'features.html', 'how-it-works.html', 'pricing.html'];

files.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Find the navbar links container. We look for the div containing the links.
    const navStartRegex = /<div class="hidden md:flex items-center gap-8">[\s\S]*?<\/div>/;
    
    // Determine which item should be styled as active (white) vs inactive (muted)
    const isHomeActive = file === 'index.html';
    const isFeaturesActive = file === 'features.html';
    const isPricingActive = file === 'pricing.html';
    const isHowItWorksActive = file === 'how-it-works.html';
    
    const navLinksHTML = `<div class="hidden md:flex items-center gap-8">
                <a href="/" class="text-sm font-medium ${isHomeActive ? 'text-white' : 'text-luxe-muted hover:text-white'} transition-colors">Home</a>
                <a href="/features.html" class="text-sm font-medium ${isFeaturesActive ? 'text-white' : 'text-luxe-muted hover:text-white'} transition-colors">Features</a>
                <a href="/pricing" class="text-sm font-medium ${isPricingActive ? 'text-white' : 'text-luxe-muted hover:text-white'} transition-colors">Pricing</a>
                <a href="/how-it-works.html" class="text-sm font-medium ${isHowItWorksActive ? 'text-white' : 'text-luxe-muted hover:text-white'} transition-colors">How it Works</a>
            </div>`;
            
    if (content.match(navStartRegex)) {
        content = content.replace(navStartRegex, navLinksHTML);
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${file}`);
    } else {
        console.log(`Could not find nav block in ${file}`);
    }
});
console.log('Nav fixed universally.');
