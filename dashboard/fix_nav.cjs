const fs = require('fs');
const path = require('path');

const files = ['index.html', 'features.html', 'how-it-works.html', 'pricing.html'];

files.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Add Home Link
    if (!content.includes('>Home</a>')) {
        content = content.replace(
            /<a href="\/features\.html"/,
            '<a href="/" class="text-sm font-medium text-luxe-muted hover:text-white transition-colors">Home</a>\n                <a href="/features.html"'
        );
    }

    // 2. Change View Pricing to Get Started in Nav
    let navParts = content.split('</nav>');
    if (navParts.length > 1) {
        let navHtml = navParts[0];
        navHtml = navHtml.replace(/>\s*View Pricing\s*<\/a>/, '>\n                    Get Started\n                </a>');
        content = navHtml + '</nav>' + navParts[1];
    }
    
    // For pricing.html it says 'View Plans'. Let's change it to Get Started too.
    if (file === 'pricing.html') {
        let pNavParts = content.split('</nav>');
        if (pNavParts.length > 1) {
            let pNavHtml = pNavParts[0];
            pNavHtml = pNavHtml.replace(/>\s*View Plans\s*<\/a>/, '>\n                    Get Started\n                </a>');
            content = pNavHtml + '</nav>' + pNavParts[1];
        }
    }

    // 3. Fix Marquee Overlap (only on index.html)
    if (file === 'index.html' && content.includes('animate-marquee2')) {
        const startMarker = '<div class="relative flex overflow-hidden gap-6 group">';
        let startIdx = content.indexOf(startMarker);
        
        if (startIdx !== -1) {
            const reviewMatches = content.match(/<!-- Review \d+ -->[\s\S]*?(?=<!-- Review \d+ -->|<\/div>\s*<\/div>\s*<\/div>\s*<\/section>)/g);
            
            if (reviewMatches && reviewMatches.length === 14) {
                const all14Reviews = reviewMatches.join('\n');
                
                const newMarqueeBlock = `
            <div class="relative flex overflow-hidden gap-6 group">
                <div class="flex animate-marquee gap-6 whitespace-nowrap shrink-0">
                    \${all14Reviews}
                </div>
                <!-- Marquee Duplicate for infinite scroll -->
                <div class="flex animate-marquee gap-6 whitespace-nowrap shrink-0" aria-hidden="true">
                    \${all14Reviews}
                </div>
            </div>
`;
                
                const oldSectionEnd = content.indexOf('</section>', startIdx);
                content = content.substring(0, startIdx) + newMarqueeBlock + content.substring(oldSectionEnd - 16);
            }
        }
    }

    fs.writeFileSync(filePath, content);
});

console.log("Done updating layout.");
