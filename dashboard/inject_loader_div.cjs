const fs = require('fs');
const path = require('path');

const targetPage = path.join(__dirname, 'pricing.html');
let html = fs.readFileSync(targetPage, 'utf8');

const regex = /<body(.*?)>\s*<!-- NAVBAR -->/;
const loaderHtml = `<body$1>
    <!-- CHECKOUT LOADER -->
    <div id="checkout-loader" class="fixed inset-0 z-[9999] bg-luxe-obsidian/90 backdrop-blur-sm items-center justify-center flex-col gap-4">
        <div class="w-10 h-10 border-4 border-white/10 border-t-luxe-gold rounded-full animate-spin"></div>
        <p class="text-white/80 font-medium tracking-wide">Connecting to secure gateway...</p>
    </div>

    <!-- NAVBAR -->`;

const updatedHtml = html.replace(regex, loaderHtml);
fs.writeFileSync(targetPage, updatedHtml, 'utf8');
console.log("Injected checkout loader div successfully.");
