const fs = require('fs');
const path = require('path');
const { FOOTER_CONTENT } = require('./layout_template.cjs');

const filesToUpdate = ['index.html', 'pricing.html', 'features.html', 'how-it-works.html', 'privacy.html', 'terms.html', 'about.html', 'contact.html', 'security.html', 'compliance.html'];

filesToUpdate.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf8');

    // Update Footer Emails
    content = content.replace(
        /<div class="mt-6">\s*<a href="mailto:support@voxali\.net"[\s\S]*?<\/div>/g,
        `<div class="mt-6">
                    <a href="mailto:support@voxali.net" class="text-sm text-luxe-gold hover:text-white transition-colors block mb-1">support@voxali.net</a>
                    <a href="mailto:hello@voxali.net" class="text-sm text-luxe-gold hover:text-white transition-colors block mb-1">hello@voxali.net</a>
                    <a href="mailto:info@voxali.net" class="text-sm text-luxe-gold hover:text-white transition-colors block">info@voxali.net</a>
                </div>`
    );

    // Update sales@voxali.net anywhere else
    content = content.replace(/sales@voxali\.net/g, 'hello@voxali.net');

    fs.writeFileSync(filePath, content);
    console.log(`Updated emails in ${file}`);
});
