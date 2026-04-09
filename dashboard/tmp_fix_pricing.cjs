const fs = require('fs');
const filePath = 'c:/Users/syeda/OneDrive/Desktop/Voxali New/dashboard/pricing.html';
if (!fs.existsSync(filePath)) {
    console.log("pricing.html not found");
    process.exit(0);
}
let code = fs.readFileSync(filePath, 'utf8');

// The pricing.html layout has a grid for cards. Let's find grid-cols-4 and replace with grid-cols-3 and max-w-6xl
code = code.replace(/grid-cols-1 md:grid-cols-2 lg:grid-cols-4/g, 'grid-cols-1 md:grid-cols-3 lg:grid-cols-3 max-w-6xl mx-auto');
// there is also a feature table header: md:grid-cols-[2fr_1fr_1fr_1fr_1fr] -> md:grid-cols-[2fr_1fr_1fr_1fr]
code = code.replace(/md:grid-cols-\[2fr_1fr_1fr_1fr_1fr\]/g, 'md:grid-cols-[2fr_1fr_1fr_1fr] max-w-6xl mx-auto');

// Delete the Essentials Card block. We look for a div containing "Essentials" and "$49/mo".
// Actually deleting complex nested HTML blocks via regex is hard. Let's use cheerio if available, or just write a sophisticated regex.
// Wait, Node.js might not have Cheerio installed. Let's just write a script that finds the line index of `Essentials` and deletes the enclosing tag.

const lines = code.split('\n');

// 1. Remove the Pricing Card
let startIdx = -1;
let endIdx = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Start with Essentials')) {
        // Walk back to find the parent <div class="relative ... rounded-3xl" or similar
        for (let j = i; j >= 0; j--) {
            if (lines[j].includes('div class=') && lines[j].includes('p-8') && lines[j].includes('rounded-3xl')) {
                startIdx = j;
                break;
            }
        }
        // Walk forward to find the end of this div hierarchy. Simple balance counter
        let depth = 0;
        let started = false;
        for (let j = startIdx; j < lines.length; j++) {
            if (lines[j].includes('<div')) depth += (lines[j].match(/<div/g) || []).length;
            if (lines[j].includes('</div')) depth -= (lines[j].match(/<\/div/g) || []).length;
            started = true;
            if (started && depth === 0) {
                endIdx = j;
                break;
            }
        }
        break;
    }
}

if (startIdx !== -1 && endIdx !== -1) {
    lines.splice(startIdx, endIdx - startIdx + 1);
}

// 2. Remove the Essentials Column from the Feature Comparison Table
// Top headers
let thIdx = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('<th>') && lines[i].includes('Essentials')) {
        thIdx = i;
        break;
    }
    if (lines[i].includes('<th>') && lines[i+1] && lines[i+1].includes('Essentials')) {
        thIdx = i; // the th spans multiple lines
        lines.splice(i, 3);
        break;
    }
    // single line <th>
    if (lines[i].includes('<th class="py-6 px-4 font-bold text-white text-center">Essentials<br/><span class="text-sm font-normal text-luxe-muted">$49/mo</span></th>')) {
        lines.splice(i, 1);
        break;
    }
}

// 3. For each row in the feature comparison table, we need to remove the FIRST data col (after the label).
// In grid layout, it's <div class="row..."> <div label> <div essentials> <div starter> <div growth> <div enterprise> </div>
// It's a grid. We must find `md:grid-cols-[2fr_1fr_1fr_1fr_1fr]`.
let inTable = false;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('md:grid-cols-[2fr_1fr_1fr_1fr]')) {
        inTable = true;
    }
    if (inTable && lines[i].includes('hover:bg-zinc-800/20')) {
        // We found a row container limit. Wait, the structure is usually `<div class="grid grid-cols-2 md:grid-cols-[...]">`
        // We need to delete the SECOND div child (the first feature col).
        let divCount = 0;
        let pStart = -1;
        let pEnd = -1;
        for (let j = i + 1; j < i + 15; j++) {
            if (lines[j].includes('<div') && !lines[j].includes('class="grid')) {
                divCount++;
                if (divCount === 2) {
                    pStart = j;
                } else if (divCount === 3 && pStart !== -1) {
                    pEnd = j - 1;
                    break;
                }
            }
        }
        if (pStart !== -1 && pEnd !== -1) {
            lines.splice(pStart, pEnd - pStart + 1);
        }
    }
}

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log("pricing.html Essentials block removed.");
