const fs = require('fs');
const path = require('path');
const { NAV_CONTENT, FOOTER_CONTENT } = require('./layout_template.cjs');

const bodyFile = path.join(__dirname, 'pricing_body.txt');
const targetPage = path.join(__dirname, 'pricing.html');
const body = fs.readFileSync(bodyFile, 'utf8');

const head = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pricing - Voxali AI Receptionist & Salon Dashboard</title>
    <meta name="description" content="View pricing and plans for Voxali's AI salon receptionist and full-suite management dashboard. From basic booking to enterprise AI automation.">
    
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="tailwind.config.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <link href="index.css" rel="stylesheet">
</head>
<body class="antialiased overflow-x-hidden selection:bg-luxe-gold selection:text-black">
`;

const tail = `
    <script>
        function toggleMobileMenu() {
            const menu = document.getElementById('mobile-menu');
            const h1 = document.getElementById('ham-1');
            const h3 = document.getElementById('ham-3');
            menu.classList.toggle('hidden');
            menu.classList.toggle('flex');
            h1.classList.toggle('rotate-45');
            h1.classList.toggle('translate-y-2');
            h3.classList.toggle('opacity-0');
        }
    </script>
</body>
</html>`;

const customizedNav = NAV_CONTENT.replace(/>\s*Get Started\s*<\/a>/g, '>Talk to Sales</a>');

const fullHtml = head + customizedNav + "\n" + body + "\n" + FOOTER_CONTENT + "\n" + tail;
fs.writeFileSync(targetPage, fullHtml, 'utf8');
console.log("Successfully generated clean HTML for pricing.html");
