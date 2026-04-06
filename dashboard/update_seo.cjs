const fs = require('fs');
const path = require('path');

const seoData = {
    'pricing.html': {
        title: 'Pricing | Voxali AI Receptionist & Salon Software',
        desc: 'Compare Voxali pricing plans. Get a 24/7 AI Receptionist, booking software, reminders, and CRM starting at just $99/mo.'
    },
    'features.html': {
        title: 'Features | Voxali Salon Software & AI Receptionist',
        desc: 'Explore the full suite of Voxali features. From automated Bella AI calls to smart booking, email reminders, and revenue analytics for your salon.'
    },
    'how-it-works.html': {
        title: 'How It Works | Set Up Voxali AI Receptionist',
        desc: 'Learn how easy it is to set up Voxali. Configure your salon hours, services, and staff, and let Bella handle the booking calls.'
    },
    'privacy.html': {
        title: 'Privacy Policy | Voxali Data Protection',
        desc: 'Read the Voxali privacy policy to understand how we protect salon owners and their clients.'
    },
    'terms.html': {
        title: 'Terms of Service | Voxali Salon Software',
        desc: 'Read the Terms of Service for using the Voxali platform, AI Receptionist, and Salon CRM.'
    }
};

Object.entries(seoData).forEach(([file, data]) => {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace Title
    content = content.replace(
        /<title>.*?<\/title>/s,
        `<title>${data.title}</title>`
    );
    // Replace Meta Description
    content = content.replace(
        /<meta name="description"[\s\S]*?>/s,
        `<meta name="description"\n        content="${data.desc}">`
    );

    fs.writeFileSync(filePath, content);
    console.log(`Updated SEO for ${file}`);
});
