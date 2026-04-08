const fs = require('fs');
const path = require('path');

const indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
let pricingHtml = fs.readFileSync(path.join(__dirname, 'pricing.html'), 'utf8');

// The <head> from index.html
const indexHeadStart = indexHtml.indexOf('<head>');
const indexHeadEnd = indexHtml.indexOf('</head>');

if (indexHeadStart === -1 || indexHeadEnd === -1) {
    console.error('Could not find head in index.html');
    process.exit(1);
}

let headContent = indexHtml.substring(indexHeadStart, indexHeadEnd + 7);

// Replace title and description in head
headContent = headContent.replace(
    '<title>Voxali | AI Receptionist and Salon Booking Software</title>',
    '<title>Pricing - Voxali AI Receptionist & Salon Dashboard</title>'
);
headContent = headContent.replace(
    '<meta name="description"\n        content="Voxali is a salon-focused platform with an AI receptionist, booking software, reminders, and CRM. Never miss another booking call again.">',
    '<meta name="description" content="View pricing and plans for Voxali\'s AI salon receptionist and full-suite management dashboard. From basic booking to enterprise AI automation.">'
);

// We want the final file to start with <!DOCTYPE html>\n<html...>\n and the head!
const docTypeHtml = `<!DOCTYPE html>\n<html lang="en" class="scroll-smooth">\n`;

const bodyTag = `\n<body class="antialiased overflow-x-hidden selection:bg-luxe-gold selection:text-black bg-luxe-obsidian text-white">\n`;

// Where does the original pricing.html's nav start?
const navStart = pricingHtml.indexOf('<!-- NAVBAR -->');
if (navStart === -1) {
    console.error('Could not find nav in pricing.html');
    process.exit(1);
}

const restOfPricing = pricingHtml.substring(navStart);

const finalHtml = docTypeHtml + headContent + bodyTag + restOfPricing;
fs.writeFileSync(path.join(__dirname, 'pricing.html'), finalHtml, 'utf8');
console.log('Fixed pricing head and styling.');
