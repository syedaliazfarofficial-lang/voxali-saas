const fs = require('fs');
const path = require('path');
const { HEAD_CONTENT, FOOTER_CONTENT, NAV_CONTENT, SCRIPT_CONTENT } = require('./layout_template.cjs');

// 1. FIX VITE CONFIG
const viteConfigPath = path.join(__dirname, 'vite.config.ts');
let viteConfig = fs.readFileSync(viteConfigPath, 'utf8');

const additionalPages = `
        // Trust & Info Pages
        about: resolve(__dirname, 'about.html'),
        contact: resolve(__dirname, 'contact.html'),
        security: resolve(__dirname, 'security.html'),
        compliance: resolve(__dirname, 'compliance.html'),
        faq: resolve(__dirname, 'faq.html'),
        demo: resolve(__dirname, 'demo.html'),
        markets: resolve(__dirname, 'markets.html'),
        setupGuide: resolve(__dirname, 'setup-guide.html'),`;

if (!viteConfig.includes('about: resolve(__dirname')) {
    viteConfig = viteConfig.replace(
        /paymentSuccess: resolve\(__dirname, 'payment-success\.html'\),/,
        `paymentSuccess: resolve(__dirname, 'payment-success.html'),${additionalPages}`
    );
    fs.writeFileSync(viteConfigPath, viteConfig);
    console.log('Fixed vite.config.ts');
}

// 2. ENFORCE <HEAD> WITH TAILWIND ON ALL FILES
const allPages = [
    'index.html', 'pricing.html', 'features.html', 'how-it-works.html',
    'privacy.html', 'terms.html', 'about.html', 'contact.html',
    'security.html', 'compliance.html', 'faq.html', 'demo.html',
    'setup-guide.html', 'markets.html'
];
const titles = {
    'privacy.html': 'Privacy Policy | Voxali',
    'terms.html': 'Terms of Service | Voxali',
    'features.html': 'Features | Voxali',
    'pricing.html': 'Pricing | Voxali',
    'how-it-works.html': 'How it Works | Voxali',
    'index.html': 'Voxali | AI Receptionist'
};

allPages.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf8');

    // Extract title to preserve it
    const titleMatch = content.match(/<title>(.*?)<\/title>/);
    const title = titleMatch ? titleMatch[1] : (titles[file] || 'Voxali');

    const descMatch = content.match(/<meta name="description"[\s\S]*?content=["']([^"']*)["']/);
    const desc = descMatch ? descMatch[1] : 'Voxali the ultimate AI salon booking platform.';

    const pageHead = HEAD_CONTENT.replace('__TITLE__', title).replace('__DESC__', desc);

    // Some pages like privacy and terms have raw <head> ... </head>
    content = content.replace(/<head>[\s\S]*?<\/head>/, pageHead.substring(pageHead.indexOf('<head>'), pageHead.indexOf('</head>') + 7));
    
    // Privacy and terms might have old container CSS that we need to keep for the text format, if so, append it back
    if (file === 'privacy.html' || file === 'terms.html') {
        const customStyle = `<style>
        .container {
            max-width: 800px;
            margin: 4rem auto;
            padding: 2rem;
            background-color: var(--bg-surface, #1E1E1E);
            border-radius: 16px;
            border: 1px solid rgba(255,255,255,0.05);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            color: #A1A1AA;
        }
        h1 { color: #D4AF37; font-size: 2.5rem; margin-bottom: 0.5rem; font-weight: 900;}
        h2 { font-size: 1.5rem; margin-top: 2.5rem; margin-bottom: 1rem; color: #ffffff; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem; font-weight: 700;}
        .last-updated { color: #A1A1AA; font-size: 0.9rem; margin-bottom: 2.5rem; }
        p { margin-bottom: 1rem; }
        li { margin-bottom: 0.5rem; }
        ul { padding-left: 1.5rem; list-style-type: disc; margin-bottom: 1rem; }
        </style>`;
        content = content.replace('</head>', `${customStyle}\n</head>`);
    }

    fs.writeFileSync(filePath, content);
    console.log(`Enforced Head on ${file}`);
});
