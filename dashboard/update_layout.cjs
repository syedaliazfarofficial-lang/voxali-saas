const fs = require('fs');
const path = require('path');
const { FOOTER_CONTENT } = require('./layout_template.cjs');

const filesToUpdate = ['index.html', 'pricing.html', 'features.html', 'how-it-works.html', 'privacy.html', 'terms.html'];

filesToUpdate.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) return;
    
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Update Navigation to include /about and /contact
    // We will find the Desktop Nav block
    const navStart = content.indexOf('<!-- Desktop Nav -->');
    if (navStart !== -1) {
        const navEnd = content.indexOf('</div>', navStart);
        if (navEnd !== -1) {
            const oldNav = content.substring(navStart, navEnd + 6);
            const newNav = `<!-- Desktop Nav -->
            <div class="hidden md:flex items-center gap-8">
                <a href="/" class="text-sm font-medium text-white transition-colors">Home</a>
                <a href="/features.html" class="text-sm font-medium text-luxe-muted hover:text-white transition-colors">Features</a>
                <a href="/pricing.html" class="text-sm font-medium text-luxe-muted hover:text-white transition-colors">Pricing</a>
                <a href="/how-it-works.html" class="text-sm font-medium text-luxe-muted hover:text-white transition-colors">How it Works</a>
                <a href="/about.html" class="text-sm font-medium text-luxe-muted hover:text-white transition-colors">About</a>
                <a href="/contact.html" class="text-sm font-medium text-luxe-muted hover:text-white transition-colors">Contact</a>
            </div>`;
            content = content.replace(oldNav, newNav);
        }
    }

    // 2. Update Mobile Nav drawer
    const mobileMenuStart = content.indexOf('<!-- Mobile Menu Drawer -->');
    if (mobileMenuStart !== -1) {
        const mobileMenuEnd = content.indexOf('</nav>', mobileMenuStart);
        if (mobileMenuEnd !== -1) {
            const oldMobileMenu = content.substring(mobileMenuStart, mobileMenuEnd);
            const newMobileMenu = `<!-- Mobile Menu Drawer -->
        <div id="mobile-menu" class="flex-col gap-2 pt-4 pb-6 border-t border-white/10 mt-4">
            <a href="/" class="block py-3 px-4 text-sm font-semibold text-white rounded-lg hover:bg-white/5 transition-all">Home</a>
            <a href="/features.html" class="block py-3 px-4 text-sm font-medium text-luxe-muted hover:text-white rounded-lg hover:bg-white/5 transition-all">Features</a>
            <a href="/pricing.html" class="block py-3 px-4 text-sm font-medium text-luxe-muted hover:text-white rounded-lg hover:bg-white/5 transition-all">Pricing</a>
            <a href="/how-it-works.html" class="block py-3 px-4 text-sm font-medium text-luxe-muted hover:text-white rounded-lg hover:bg-white/5 transition-all">How it Works</a>
            <a href="/about.html" class="block py-3 px-4 text-sm font-medium text-luxe-muted hover:text-white rounded-lg hover:bg-white/5 transition-all">About</a>
            <a href="/contact.html" class="block py-3 px-4 text-sm font-medium text-luxe-muted hover:text-white rounded-lg hover:bg-white/5 transition-all">Contact</a>
            <div class="mt-3 pt-3 border-t border-white/10 flex gap-3 px-4">
                <a href="/app/" class="flex-1 text-center text-sm font-semibold text-white border border-white/10 px-4 py-2.5 rounded-lg">Sign In</a>
                <a href="/pricing.html" class="flex-1 text-center text-sm font-bold text-black bg-gradient-gold px-4 py-2.5 rounded-lg">Get Started</a>
            </div>
        </div>
    `;
            content = content.replace(oldMobileMenu, newMobileMenu);
        }
    }

    // 3. Update Footer
    const footerStart = content.indexOf('<!-- FOOTER -->');
    if (footerStart !== -1) {
        const bodyEnd = content.indexOf('</body>', footerStart);
        if (bodyEnd !== -1) {
            // Find script tags after footer, preserve them if possible
            const scriptStart = content.indexOf('<script>', footerStart);
            let preservedScripts = '';
            if (scriptStart !== -1 && scriptStart < bodyEnd) {
                preservedScripts = content.substring(scriptStart, bodyEnd);
            }

            const oldFooterBlock = content.substring(footerStart, bodyEnd);
            const newFooterBlock = FOOTER_CONTENT.replace('</body>\\n</html>', '') + '\\n' + preservedScripts;
            content = content.replace(oldFooterBlock, newFooterBlock);
        }
    }

    fs.writeFileSync(filePath, content);
    console.log(`Updated layout for ${file}`);
});
