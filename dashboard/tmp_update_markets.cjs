const fs = require('fs');

// ==== 3. FIX MARKETS.HTML ====
const marketsPath = 'c:/Users/syeda/OneDrive/Desktop/Voxali New/dashboard/markets.html';
let marketsCode = fs.readFileSync(marketsPath, 'utf8');

marketsCode = marketsCode.replace(
    '<li>🇬🇧 United Kingdom</li>', ''
).replace(
    '<li>🇦🇺 Australia</li>', ''
).replace(
    '<li>🇮🇪 Ireland</li>', ''
).replace(
    '<li>🇳🇿 New Zealand</li>', ''
).replace(
    '<li>🇪🇺 Select EU Regions</li>', ''
);

// We can just keep it as North America only:
const origSection = `<div class="max-w-4xl mx-auto flex flex-col md:flex-row gap-12 justify-center text-left">
            <div class="glass-card p-8 rounded-2xl flex-1 text-center border-t-2 border-emerald-500/50">
                <h3 class="text-2xl font-bold text-white mb-6">Fully Supported</h3>
                <ul class="text-luxe-muted space-y-4">
                    <li>🇺🇸 United States</li>
                    
                    <li>🇨🇦 Canada</li>
                    
                </ul>
            </div>
            <div class="glass-card p-8 rounded-2xl flex-1 text-center border-t-2 border-yellow-500/50">
                <h3 class="text-2xl font-bold text-white mb-6">Beta / Rolling Out</h3>
                <ul class="text-luxe-muted space-y-4">
                    
                    
                    
                </ul>
            </div>
        </div>`;

const newSection = `<div class="max-w-xl mx-auto w-full text-center">
            <div class="glass-card p-8 rounded-2xl bg-white/5 border-t-2 border-luxe-gold">
                <h3 class="text-2xl font-bold text-white mb-6">Primary Markets</h3>
                <p class="text-luxe-muted mb-6">Voxali is exclusively available for salons and spas operating in North America.</p>
                <ul class="text-white space-y-4 text-lg font-medium flex justify-center gap-12">
                    <li class="flex items-center gap-2">🇺🇸 United States</li>
                    <li class="flex items-center gap-2">🇨🇦 Canada</li>
                </ul>
            </div>
        </div>`;

// Apply directly if the string matches loosely. Since I mutated it above, let's just do a brutal replace of from <div class="max-w-4xl to </div>\n        </div>
const mLines = marketsCode.split('\n');
let sIdx = -1;
let eIdx = -1;
for(let i=0; i<mLines.length; i++) {
    if (mLines[i].includes('max-w-4xl mx-auto flex flex-col md:flex-row gap-12 justify-center text-left')) {
        sIdx = i;
    }
    if (sIdx !== -1 && i > sIdx && mLines[i].includes('</div>') && mLines[i+1] && mLines[i+1].includes('</div>')) {
        eIdx = i + 1;
        break;
    }
}
if (sIdx !== -1 && eIdx !== -1) {
    mLines.splice(sIdx, eIdx - sIdx + 1, newSection);
}

fs.writeFileSync(marketsPath, mLines.join('\n'), 'utf8');
console.log("Markets updated.");

// ==== 4. INDEX.HTML ====
const indexPath = 'c:/Users/syeda/OneDrive/Desktop/Voxali New/dashboard/index.html';
let indexCode = fs.readFileSync(indexPath, 'utf8');

// The MVP is US/CA. We might have some text saying "trusted by salons in UK, US, Dubai". Let's regex replace UK/Dubai
indexCode = indexCode.replace(/UK, /g, '').replace(/Dubai/g, '').replace(/Australia/g, '');

// Also I should ensure the pricing on homepage (if any) reflects 3 tiers. But we did this earlier with optimize scripts. I'll just save index.html.
fs.writeFileSync(indexPath, indexCode, 'utf8');
console.log("Index updated.");
