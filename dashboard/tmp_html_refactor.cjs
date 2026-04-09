const fs = require('fs');

// ==== 1. FIX SIGNUP.HTML ====
const signupPath = 'c:/Users/syeda/OneDrive/Desktop/Voxali New/dashboard/signup.html';
let signupCode = fs.readFileSync(signupPath, 'utf8');

const oldCountryDropdown = `<select id="countryCode" required
                        class="input-field w-full rounded-xl py-3 pl-10 pr-4 appearance-none cursor-pointer">
                        <option value="US">United States (+1)</option>
                        <option value="GB">United Kingdom (+44)</option>
                        <option value="CA">Canada (+1)</option>
                        <option value="AU">Australia (+61)</option>
                        <option value="NZ">New Zealand (+64)</option>
                        <option value="AE">United Arab Emirates (+971)</option>
                        <option value="SA">Saudi Arabia (+966)</option>
                        <option value="DE">Germany (+49)</option>
                        <option value="FR">France (+33)</option>
                        <option value="ES">Spain (+34)</option>
                        <option value="IT">Italy (+39)</option>
                        <option value="PK">Pakistan (+92)</option>
                    </select>`;

const newCountryDropdown = `<select id="countryCode" required
                        class="input-field w-full rounded-xl py-3 pl-10 pr-4 appearance-none cursor-pointer">
                        <option value="US">United States (+1)</option>
                        <option value="CA">Canada (+1)</option>
                    </select>`;

signupCode = signupCode.replace(oldCountryDropdown, newCountryDropdown);
fs.writeFileSync(signupPath, signupCode, 'utf8');
console.log("Signup updated.");

// ==== 2. FIX PRICING.HTML ====
const pricingPath = 'c:/Users/syeda/OneDrive/Desktop/Voxali New/dashboard/pricing.html';
let pricingCode = fs.readFileSync(pricingPath, 'utf8');

// 2a. Update grid
pricingCode = pricingCode.replace(
    'class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"', 
    'class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-8 max-w-6xl mx-auto"'
);

// 2b. Delete Essentials Card
// We will look for <!-- PLAN 1: ESSENTIALS --> down to <!-- PLAN 2: AI STARTER -->
let idxStart = pricingCode.indexOf('<!-- PLAN 1: ESSENTIALS -->');
let idxEnd = pricingCode.indexOf('<!-- PLAN 2: AI STARTER -->');
if (idxStart !== -1 && idxEnd !== -1) {
    pricingCode = pricingCode.substring(0, idxStart) + pricingCode.substring(idxEnd);
}

// 2c. Update Feature Table Headers
// Remove Essentials Header
pricingCode = pricingCode.replace(
    `<th class="py-6 px-4 font-bold text-white text-center">Essentials<br/><span class="text-sm font-normal text-luxe-muted">$49/mo</span></th>\n`,
    ''
);

// 2d. Remove the first table column in the <tbody> under "Features"
const beforeTbodyRows = pricingCode.split('<tr class="border-b border-white/5 hover:bg-white/5 transition-colors">');
// the first block is everything before the first <tr>
let newTbody = beforeTbodyRows[0];

for (let i = 1; i < beforeTbodyRows.length; i++) {
    let block = beforeTbodyRows[i];
    // Find the first <td> that has `text-center` inside this block, and remove it.
    // It usually looks like `\n                        <td class="text-center text-white">✓</td>`
    // or `<td class="text-center text-white/20">—</td>`
    // It's always directly after the `<td class="py-4 px-4 text-white/90">...</td>`
    
    // We regex match the first `<td ...>...</td>` that comes after the first </td>
    let firstTdEnd = block.indexOf('</td>');
    if (firstTdEnd !== -1) {
        let secondTdStart = block.indexOf('<td', firstTdEnd + 5);
        let secondTdEnd = block.indexOf('</td>', secondTdStart);
        if (secondTdStart !== -1 && secondTdEnd !== -1) {
            // Cut out the second <td>
            let withoutSecond = block.substring(0, secondTdStart) + block.substring(secondTdEnd + 5);
            newTbody += '<tr class="border-b border-white/5 hover:bg-white/5 transition-colors">' + withoutSecond;
            continue;
        }
    }
    
    newTbody += '<tr class="border-b border-white/5 hover:bg-white/5 transition-colors">' + block;
}
pricingCode = newTbody;

// 2e. Remove 49 from JsonLd
pricingCode = pricingCode.replace(/"price": "49.00"/g, '"price": "99.00"');

fs.writeFileSync(pricingPath, pricingCode, 'utf8');
console.log("Pricing updated.");

