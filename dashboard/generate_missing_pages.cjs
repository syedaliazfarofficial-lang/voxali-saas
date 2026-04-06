const fs = require('fs');
const path = require('path');
const { HEAD_CONTENT, FOOTER_CONTENT, NAV_CONTENT, SCRIPT_CONTENT } = require('./layout_template.cjs');

function generatePage(filename, title, desc, bodyContent) {
    const head = HEAD_CONTENT.replace('__TITLE__', title).replace('__DESC__', desc);
    const content = head + NAV_CONTENT + SCRIPT_CONTENT + bodyContent + FOOTER_CONTENT;
    fs.writeFileSync(path.join(__dirname, filename), content);
    console.log(`Generated new page: ${filename}`);
}

const faqBody = `
    <!-- HEADER SECTION -->
    <main class="relative pt-40 pb-16 px-6 text-center">
        <div class="max-w-3xl mx-auto animate-[slideUp_0.8s_ease-out]">
            <h1 class="text-4xl md:text-5xl font-black tracking-tight mb-6">
                Frequently Asked Questions
            </h1>
            <p class="text-lg text-luxe-muted font-medium mb-10">
                Everything you need to know about Voxali, pricing, setup, and how Bella AI handles your salon's calls.
            </p>
        </div>
    </main>

    <section class="py-12 px-6 border-t border-white/5">
        <div class="max-w-4xl mx-auto space-y-6">
            <details class="group glass-card rounded-xl px-6 py-4 cursor-pointer" open>
                <summary class="flex justify-between items-center font-semibold text-lg list-none text-white">
                    Can I keep my current salon number?
                    <span class="transition group-open:rotate-180 text-luxe-gold">
                        <svg fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                    </span>
                </summary>
                <p class="text-luxe-muted mt-4 text-sm leading-relaxed">Yes! We provide you with a new Voxali number. You simply set up Call Forwarding with your current provider so missed calls automatically route to Bella.</p>
            </details>

            <details class="group glass-card rounded-xl px-6 py-4 cursor-pointer">
                <summary class="flex justify-between items-center font-semibold text-lg list-none text-white">
                    Does Bella handle rescheduling or cancellations?
                    <span class="transition group-open:rotate-180 text-luxe-gold">
                        <svg fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                    </span>
                </summary>
                <p class="text-luxe-muted mt-4 text-sm leading-relaxed">Yes. If a client calls to change their appointment, Bella verifies their details, deletes the old slot, finds new available times based on your calendar rules, and books the new one securely.</p>
            </details>

            <details class="group glass-card rounded-xl px-6 py-4 cursor-pointer">
                <summary class="flex justify-between items-center font-semibold text-lg list-none text-white">
                    Are reminders included in the price?
                    <span class="transition group-open:rotate-180 text-luxe-gold">
                        <svg fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                    </span>
                </summary>
                <p class="text-luxe-muted mt-4 text-sm leading-relaxed">Email reminders are included universally in every plan to prevent no-shows. SMS reminders are unlocked securely in our AI Starter, Growth, and Elite plans.</p>
            </details>

            <details class="group glass-card rounded-xl px-6 py-4 cursor-pointer">
                <summary class="flex justify-between items-center font-semibold text-lg list-none text-white">
                    Do you offer a free trial?
                    <span class="transition group-open:rotate-180 text-luxe-gold">
                        <svg fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                    </span>
                </summary>
                <p class="text-luxe-muted mt-4 text-sm leading-relaxed">Because onboarding involves provisioning dedicated AI telephony numbers and custom calendar setups, we don't offer standard free trials. However, we offer full demos to let you hear the system, and you can cancel anytime.</p>
            </details>

            <details class="group glass-card rounded-xl px-6 py-4 cursor-pointer">
                <summary class="flex justify-between items-center font-semibold text-lg list-none text-white">
                    Do you include a Booking Page?
                    <span class="transition group-open:rotate-180 text-luxe-gold">
                        <svg fill="none" height="24" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                    </span>
                </summary>
                <p class="text-luxe-muted mt-4 text-sm leading-relaxed">Absolutely! Every single Voxali plan includes a beautiful, custom online Booking Page where your clients can view services, book available slots, and pay deposits directly without having to call.</p>
            </details>
        </div>
    </section>
`;

const demoBody = `
    <!-- HEADER SECTION -->
    <main class="relative pt-40 pb-16 px-6 text-center">
        <div class="max-w-4xl mx-auto animate-[slideUp_0.8s_ease-out]">
            <h1 class="text-4xl md:text-5xl font-black tracking-tight mb-6">
                Hear Bella in Action
            </h1>
            <p class="text-lg text-luxe-muted font-medium mb-10">
                Experience the world's most advanced AI voice agent designed specifically for salons.
            </p>
        </div>
    </main>

    <!-- LIVE DEMO -->
    <section class="py-12 px-6 border-t border-white/5 bg-luxe-charcoal">
        <div class="max-w-3xl mx-auto text-center">
            <div class="glass-card p-10 rounded-2xl shadow-[0_0_50px_rgba(212,175,55,0.05)] border-luxe-gold/20">
                <button class="w-20 h-20 mx-auto rounded-full bg-gradient-gold text-black flex items-center justify-center hover:scale-105 transition-transform mb-6 shadow-[0_0_30px_rgba(212,175,55,0.5)]">
                    <svg class="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </button>
                <h3 class="text-2xl font-bold text-white mb-2">Live Salon Booking Call</h3>
                <p class="text-luxe-muted mb-8">Client inquiring about Balayage, negotiating time, and securing a deposit. (1m 45s)</p>
                <div class="w-full bg-black/40 h-2 rounded-full overflow-hidden mb-8 outline outline-1 outline-white/10">
                    <div class="w-1/4 h-full bg-luxe-gold rounded-full relative">
                        <div class="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
                    </div>
                </div>
                <div class="grid grid-cols-2 text-sm text-luxe-muted font-medium text-left">
                    <span><strong>Speaker 1:</strong> Bella (AI)</span>
                    <span class="text-right"><strong>Speaker 2:</strong> Client</span>
                </div>
            </div>

            <div class="mt-16">
                <h3 class="text-xl font-bold mb-6">Want to request a private live demo for your salon?</h3>
                <a href="/contact.html" class="inline-block px-8 py-4 bg-gradient-gold text-black font-bold rounded-xl hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] transition-all">Book Private Demo</a>
            </div>
        </div>
    </section>
`;

const setupGuideBody = `
    <!-- HEADER SECTION -->
    <main class="relative pt-40 pb-16 px-6 text-center">
        <div class="max-w-3xl mx-auto animate-[slideUp_0.8s_ease-out]">
            <h1 class="text-4xl md:text-5xl font-black tracking-tight mb-6">
                Voxali Setup Guide
            </h1>
            <p class="text-lg text-luxe-muted font-medium mb-10">
                A simple 4-step workflow to get your salon fully automated in under 15 minutes.
            </p>
        </div>
    </main>

    <section class="py-12 px-6 border-t border-white/5">
        <div class="max-w-4xl mx-auto space-y-12">
            
            <div class="glass-card p-8 rounded-2xl relative">
                <div class="absolute -top-4 -left-4 w-8 h-8 rounded-full bg-luxe-gold text-black flex items-center justify-center font-bold text-lg">1</div>
                <h3 class="text-2xl font-bold text-white mb-4">Add Your Services & Staff</h3>
                <p class="text-luxe-muted">First, log into the Voxali Dashboard. Add your salon's services, durations, and prices. Then, add your staff members and connect their availability so Bella knows exactly when slots are open.</p>
            </div>

            <div class="glass-card p-8 rounded-2xl relative">
                <div class="absolute -top-4 -left-4 w-8 h-8 rounded-full bg-luxe-gold text-black flex items-center justify-center font-bold text-lg">2</div>
                <h3 class="text-2xl font-bold text-white mb-4">Set Up Your Booking Page</h3>
                <p class="text-luxe-muted">Every Voxali plan includes a hosted Booking Page. Connect your Stripe account seamlessly so clients can pay deposits upfront. You can link this Booking Page directly on your Instagram or Website.</p>
            </div>

            <div class="glass-card p-8 rounded-2xl relative">
                <div class="absolute -top-4 -left-4 w-8 h-8 rounded-full bg-luxe-gold text-black flex items-center justify-center font-bold text-lg">3</div>
                <h3 class="text-2xl font-bold text-white mb-4">Activate Bella AI</h3>
                <p class="text-luxe-muted">Voxali provides you with a unique AI phone number. Toggle Bella ON in your settings. You can instruct Bella with basic conversational prompts if your salon has specific parking instructions or policies.</p>
            </div>

            <div class="glass-card p-8 rounded-2xl relative">
                <div class="absolute -top-4 -left-4 w-8 h-8 rounded-full bg-luxe-gold text-black flex items-center justify-center font-bold text-lg">4</div>
                <h3 class="text-2xl font-bold text-white mb-4">Enable Call Forwarding</h3>
                <p class="text-luxe-muted">Contact your current phone provider (e.g., Vodafone, AT&T) or log into your portal, and set "Forward Missed Calls" to your new Voxali AI number. Now, anytime you miss a call at the front desk, Bella answers it instantly!</p>
            </div>

        </div>
    </section>
`;

const marketsBody = `
    <!-- HEADER SECTION -->
    <main class="relative pt-40 pb-16 px-6 text-center">
        <div class="max-w-3xl mx-auto animate-[slideUp_0.8s_ease-out]">
            <h1 class="text-4xl md:text-5xl font-black tracking-tight mb-6">
                Supported Markets
            </h1>
            <p class="text-lg text-luxe-muted font-medium mb-10">
                Voxali is optimized for Stripe-certified countries with stable telephony infrastructure.
            </p>
        </div>
    </main>

    <section class="py-12 px-6 border-t border-white/5">
        <div class="max-w-4xl mx-auto flex flex-col md:flex-row gap-12 justify-center text-left">
            <div class="glass-card p-8 rounded-2xl flex-1 text-center border-t-2 border-emerald-500/50">
                <h3 class="text-2xl font-bold text-white mb-6">Fully Supported</h3>
                <ul class="text-luxe-muted space-y-4">
                    <li>🇺🇸 United States</li>
                    <li>🇬🇧 United Kingdom</li>
                    <li>🇨🇦 Canada</li>
                    <li>🇦🇺 Australia</li>
                </ul>
            </div>
            <div class="glass-card p-8 rounded-2xl flex-1 text-center border-t-2 border-yellow-500/50">
                <h3 class="text-2xl font-bold text-white mb-6">Beta / Rolling Out</h3>
                <ul class="text-luxe-muted space-y-4">
                    <li>🇮🇪 Ireland</li>
                    <li>🇳🇿 New Zealand</li>
                    <li>🇪🇺 Select EU Regions</li>
                </ul>
            </div>
        </div>
        <div class="max-w-2xl mx-auto mt-12 text-center text-sm text-white/50 leading-relaxed">
            Note: Bella AI is capable of speaking multiple languages, but telephony compliance and automated SMS reminders require strict adherence to local laws. Ensure you are operating within a globally supported Stripe region to accept booking deposits.
        </div>
    </section>
`;

generatePage('faq.html', 'FAQ | Voxali AI Receptionist & Salon Software', 'Frequently asked questions about Voxali setup, pricing, AI capabilities, and features.', faqBody);
generatePage('demo.html', 'Listen to Bella AI Demo | Voxali', 'Hear how Bella the AI Receptionist handles live salon booking calls entirely autonomously.', demoBody);
generatePage('setup-guide.html', 'Setup Guide | Voxali Onboarding', 'Step-by-step instructions on setting up your Voxali salon software and activating the AI receptionist.', setupGuideBody);
generatePage('markets.html', 'Supported Markets | Voxali Availability', 'Check global availability for Voxali AI Receptionist, software, and Stripe integrations.', marketsBody);
