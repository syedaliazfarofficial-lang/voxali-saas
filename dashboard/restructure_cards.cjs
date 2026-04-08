const fs = require('fs');
const path = require('path');

const targetPage = path.join(__dirname, 'pricing.html');

let html = fs.readFileSync(targetPage, 'utf8');

// I will extract the layout from pricing.html: top is before <!-- PRICING CARDS -->, bottom is after <!-- INCLUDED IN EVERY PLAN -->
const cardsStart = html.indexOf('<!-- PRICING CARDS -->');
const includedStart = html.indexOf('<!-- INCLUDED IN EVERY PLAN -->');

if (cardsStart === -1 || includedStart === -1) {
    console.error("Tags not found");
    process.exit(1);
}

const headChunk = html.substring(0, cardsStart);
const tailChunk = html.substring(includedStart);

const newCards = `<!-- PRICING CARDS -->
    <section class="max-w-[1400px] mx-auto px-6 pb-24 relative z-10 animate-[slideUp_0.8s_ease-out_0.4s_both]">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            
            <!-- PLAN 1: ESSENTIALS -->
            <div class="glass-card rounded-2xl p-8 flex flex-col hover:-translate-y-2 transition-transform duration-300 border-t-2 border-t-white/10 group h-full">
                <div class="mb-6 h-20">
                    <h3 class="text-xl font-bold text-white mb-2">ESSENTIALS</h3>
                    <p class="text-sm text-luxe-muted leading-snug">For salons that need booking software without AI</p>
                </div>
                <div class="mb-8 font-black flex items-baseline gap-1">
                    <span class="text-4xl text-white">$49</span><span class="text-lg text-luxe-muted font-normal">/mo</span>
                </div>
                <ul class="space-y-4 mb-8 flex-1 text-sm text-white/90">
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Up to 2 staff members</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Custom online booking page</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Clients can choose stylist</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Stripe payments and deposits</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Email reminders</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Basic CRM and reporting</li>
                    <li class="flex items-start gap-3 text-white/30"><svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg> No AI receptionist</li>
                    <li class="flex items-start gap-3 text-white/30"><svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg> No SMS reminders</li>
                </ul>
                <div class="mt-auto">
                    <div class="mb-5 p-3 bg-transparent rounded-lg border border-transparent invisible">
                        <p class="text-xs text-white/80 font-medium whitespace-nowrap">Monthly AI & messaging credits</p>
                        <p class="text-[11px] text-luxe-muted mt-1">(Approx. 100 AI minutes or 400 SMS)</p>
                    </div>
                    <button onclick="startCheckout('price_basic')" class="w-full py-3.5 px-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all mb-4 outline-none border border-white/20">
                        Start with Essentials
                    </button>
                    <div class="pt-4 mt-2 border-t border-white/5 flex gap-2 items-start justify-center text-center">
                        <p class="text-[11px] text-luxe-muted font-medium px-2 leading-relaxed">Link this plan's booking page on your Instagram or Maps.</p>
                    </div>
                </div>
            </div>

            <!-- PLAN 2: AI STARTER -->
            <div class="glass-card rounded-2xl p-8 flex flex-col hover:-translate-y-2 transition-transform duration-300 border-t-2 border-t-luxe-gold/40 shadow-[0_4px_30px_rgba(212,175,55,0.03)] group h-full">
                <div class="mb-6 h-20">
                    <h3 class="text-xl font-bold text-white mb-2 flex items-center gap-2">AI STARTER</h3>
                    <p class="text-sm text-luxe-muted leading-snug">For salons ready to automate missed calls</p>
                </div>
                <div class="mb-8 font-black flex items-baseline gap-1">
                    <span class="text-4xl text-white">$99</span><span class="text-lg text-luxe-muted font-normal">/mo</span>
                </div>
                <ul class="space-y-4 mb-8 flex-1 text-sm text-white/90">
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Up to 5 staff members</li>
                    <li class="flex items-start gap-3 font-semibold text-luxe-gold"><svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Bella AI Receptionist</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Dedicated local phone number</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Call forwarding support</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Custom online booking page</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Stripe payments & deposits</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Email & SMS reminders</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Basic CRM and calendar</li>
                </ul>
                <div class="mt-auto">
                    <div class="mb-5 p-3 bg-white/[0.03] rounded-lg border border-white/5">
                        <p class="text-xs text-white/80 font-medium whitespace-nowrap">Monthly AI & messaging credits</p>
                        <p class="text-[11px] text-luxe-muted mt-1">(Approx. 100 AI minutes or 400 SMS)</p>
                    </div>
                    <button onclick="startCheckout('price_ai_starter')" class="w-full py-3.5 px-4 bg-gradient-gold hover:opacity-90 hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] text-black font-bold rounded-xl transition-all mb-4 outline-none">
                        Start AI Starter
                    </button>
                    <div class="pt-4 mt-2 border-t border-white/5 flex gap-2 items-start justify-center text-center">
                        <p class="text-[11px] text-luxe-muted font-medium px-2 leading-relaxed">Let Bella answer calls and book directly on your calendar.</p>
                    </div>
                </div>
            </div>

            <!-- PLAN 3: AI GROWTH (POPULAR) -->
            <div class="glass-card rounded-2xl p-8 flex flex-col hover:-translate-y-2 transition-transform duration-300 border border-luxe-gold shadow-[0_0_50px_rgba(212,175,55,0.15)] relative h-full bg-luxe-gold/[0.02]">
                <div class="absolute -top-[14px] inset-x-0 mx-auto w-max bg-gradient-gold text-black text-[10px] font-black tracking-widest uppercase px-5 py-1.5 rounded-full shadow-lg">
                    MOST POPULAR
                </div>
                <div class="mb-6 h-20">
                    <h3 class="text-xl font-bold text-white mb-2 pt-1">AI GROWTH</h3>
                    <p class="text-sm text-luxe-gold/70 leading-snug">For salons accelerating their revenue</p>
                </div>
                <div class="mb-8 font-black flex items-baseline gap-1">
                    <span class="text-4xl text-luxe-gold">$199</span><span class="text-lg text-luxe-muted font-normal">/mo</span>
                </div>
                <ul class="space-y-4 mb-8 flex-1 text-sm text-white/90">
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Up to 15 staff members</li>
                    <li class="flex items-start gap-3 font-semibold text-luxe-gold"><svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Bella AI Receptionist</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Dedicated local phone number</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Custom online booking page</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Stripe payments & deposits</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Email & SMS reminders</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Advanced CRM & Loyalty program</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> SMS and email campaigns</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Revenue analytics & Waitlist</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> White-glove onboarding</li>
                </ul>
                <div class="mt-auto">
                    <div class="mb-5 p-3 bg-luxe-gold/10 rounded-lg border border-luxe-gold/20">
                        <p class="text-xs text-white font-medium whitespace-nowrap">Monthly AI & messaging credits</p>
                        <p class="text-[11px] text-luxe-gold mt-1">(Approx. 250 AI minutes or 1,000 SMS)</p>
                    </div>
                    <button onclick="startCheckout('price_ai_growth')" class="w-full py-3.5 px-4 bg-gradient-gold hover:opacity-90 hover:shadow-[0_0_25px_rgba(212,175,55,0.4)] text-black font-black rounded-xl transition-all mb-4 shadow-lg outline-none">
                        Choose Growth
                    </button>
                    <div class="pt-4 mt-2 border-t border-luxe-gold/20 flex gap-2 items-start justify-center text-center">
                        <p class="text-[11px] text-luxe-gold/80 font-medium px-2 leading-relaxed">Full automation designed to multiply your revenue.</p>
                    </div>
                </div>
            </div>

            <!-- PLAN 4: ENTERPRISE -->
            <div class="glass-card rounded-2xl p-8 flex flex-col hover:-translate-y-2 transition-transform duration-300 border-t-2 border-t-purple-500/50 group h-full">
                <div class="mb-6 h-20">
                    <h3 class="text-xl font-bold text-white mb-2">ENTERPRISE</h3>
                    <p class="text-sm text-luxe-muted leading-snug">For large teams needing advanced permissions</p>
                </div>
                <div class="mb-8">
                    <span class="block text-[10px] uppercase tracking-widest text-luxe-muted mb-[3px] font-bold">Starting from</span>
                    <div class="font-black flex items-baseline gap-1 leading-none">
                        <span class="text-4xl text-white">$349</span><span class="text-lg text-luxe-muted font-normal">/mo</span>
                    </div>
                </div>
                <ul class="space-y-4 mb-8 flex-1 text-sm text-white/90">
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Unlimited staff members</li>
                    <li class="flex items-start gap-3 font-semibold text-luxe-gold"><svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Bella AI Receptionist</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Call forwarding support</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Custom online booking page</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Advanced CRM and analytics</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> SMS and email campaigns</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Custom branding</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Advanced roles and permissions</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-purple-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Priority support & Onboarding</li>
                </ul>
                <div class="mt-auto">
                    <div class="mb-5 p-3 bg-white/[0.03] rounded-lg border border-white/5">
                        <p class="text-xs text-white/80 font-medium whitespace-nowrap">Monthly AI & messaging credits</p>
                        <p class="text-[11px] text-luxe-muted mt-1">(Custom volume or ~500 AI mins)</p>
                    </div>
                    <a href="/contact.html" class="w-full text-center block py-3.5 px-4 bg-white/5 hover:bg-white/10 text-white border border-white/20 font-bold rounded-xl transition-all mb-4 outline-none">
                        Talk to Sales
                    </a>
                    <div class="pt-4 mt-2 border-t border-white/5 flex gap-2 items-start justify-center text-center">
                        <p class="text-[11px] text-luxe-muted font-medium px-2 leading-relaxed">Need higher AI volume or a tailored setup? Contact sales.</p>
                    </div>
                </div>
            </div>

        </div>
    </section>
`;

fs.writeFileSync(targetPage, headChunk + newCards + "\n    " + tailChunk, 'utf8');
console.log("Restructured pricing cards successfully.");
