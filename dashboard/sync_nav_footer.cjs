const fs = require('fs');
const path = require('path');
const { NAV_CONTENT, FOOTER_CONTENT } = require('./layout_template.cjs');

const allPages = [
    'index.html', 'pricing.html', 'features.html', 'how-it-works.html',
    'privacy.html', 'terms.html', 'about.html', 'contact.html',
    'security.html', 'compliance.html', 'faq.html', 'demo.html',
    'setup-guide.html', 'markets.html'
];

allPages.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf8');

    // Regex to accurately find and replace the ENTIRE existing <nav>...</nav>
    // Note: <nav> could span multiple lines.
    content = content.replace(/<nav[^>]*>[\s\S]*?<\/nav>/, NAV_CONTENT.trim());

    // Because I may have used multiple <script> toggles over time for mobile menu,
    // let's make sure the SCRIPT_CONTENT is there but not duplicated.
    if (!content.includes('function toggleMobileMenu()')) {
        content = content.replace(/<\/body>/, `
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
</body>`);
    }

    // Regex to replace ENTIRE <footer>...</footer>
    content = content.replace(/<footer[^>]*>[\s\S]*?<\/footer>/, FOOTER_CONTENT.trim());

    // The user also mentioned "Booking Page included" is missing entirely from features.
    // Let's add it dynamically to index.html and features.html if it exists.
    if (file === 'index.html' || file === 'features.html') {
        if (!content.includes('Custom Booking Page')) {
            const bookingFeatureHTML = `
            <div class="glass-card p-8 rounded-2xl border-t-4 border-t-purple-500/50 hover:-translate-y-1 transition-transform">
                <h3 class="text-xl font-bold text-white mb-4">Custom Booking Page Included</h3>
                <p class="text-sm text-luxe-muted leading-relaxed">Stop paying separate fees for booking links. Every Voxali plan includes a hosted, Stripe-integrated online booking page for your salon.</p>
            </div>
            `;
            // For index.html, inject into Use Cases grid if 'For Barbershops' exists
            if (content.includes('For Barbershops')) {
                // To keep it balanced, we'll swap the 3-col grid into a 4-col grid and insert the feature.
                content = content.replace('md:grid-cols-3', 'md:grid-cols-2 lg:grid-cols-4');
                content = content.replace(/<\/div>\s*<\/div>\s*<\/section>/, `</div>\n${bookingFeatureHTML}\n</div>\n</section>`);
            }
        }
    }

    fs.writeFileSync(filePath, content);
    console.log(`Synced Global Nav & Footer for ${file}`);
});
