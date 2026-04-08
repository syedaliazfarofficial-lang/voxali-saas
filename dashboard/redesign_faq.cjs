const fs = require('fs');
const path = require('path');

const targetPage = path.join(__dirname, 'pricing.html');
let html = fs.readFileSync(targetPage, 'utf8');

const regex = /<!-- PRICING FAQ -->(.|\n)*?<!-- FINAL CTA -->/;

const newSection = `<!-- PRICING FAQ -->
    <section class="max-w-3xl mx-auto px-6 py-24 relative z-10 border-t border-white/5 mt-10">
        <div class="text-center mb-12">
            <h2 class="text-3xl md:text-4xl font-black text-white mb-4">Frequently Asked Questions</h2>
            <p class="text-luxe-muted text-lg">Everything you need to know about the product and billing.</p>
        </div>
        
        <div class="space-y-4">
            
            <details class="group bg-black/40 hover:bg-white/[0.04] border border-white/5 hover:border-white/10 rounded-2xl transition-all duration-300 cursor-pointer open:bg-white/[0.04] open:border-white/10 overflow-hidden shadow-sm">
                <summary class="flex justify-between items-center font-bold text-white px-6 py-5 outline-none select-none">
                    <span class="pr-6">Do all plans include an online booking page?</span>
                    <span class="text-luxe-gold transition-transform duration-300 group-open:-rotate-180 shrink-0">
                        <svg fill="none" height="20" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="20"><path d="M19 9l-7 7-7-7"></path></svg>
                    </span>
                </summary>
                <div class="px-6 pb-6 text-luxe-muted text-sm leading-relaxed border-t border-white/5 pt-4">
                    Yes. Every Voxali plan includes a custom booking page where clients can view services, choose a stylist, pick an available time, and book online.
                </div>
            </details>

            <details class="group bg-black/40 hover:bg-white/[0.04] border border-white/5 hover:border-white/10 rounded-2xl transition-all duration-300 cursor-pointer open:bg-white/[0.04] open:border-white/10 overflow-hidden shadow-sm">
                <summary class="flex justify-between items-center font-bold text-white px-6 py-5 outline-none select-none">
                    <span class="pr-6">Can clients choose different stylists?</span>
                    <span class="text-luxe-gold transition-transform duration-300 group-open:-rotate-180 shrink-0">
                        <svg fill="none" height="20" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="20"><path d="M19 9l-7 7-7-7"></path></svg>
                    </span>
                </summary>
                <div class="px-6 pb-6 text-luxe-muted text-sm leading-relaxed border-t border-white/5 pt-4">
                    Yes. Clients can choose their preferred stylist based on live availability directly from your booking page.
                </div>
            </details>

            <details class="group bg-black/40 hover:bg-white/[0.04] border border-white/5 hover:border-white/10 rounded-2xl transition-all duration-300 cursor-pointer open:bg-white/[0.04] open:border-white/10 overflow-hidden shadow-sm">
                <summary class="flex justify-between items-center font-bold text-white px-6 py-5 outline-none select-none">
                    <span class="pr-6">Are reminders included?</span>
                    <span class="text-luxe-gold transition-transform duration-300 group-open:-rotate-180 shrink-0">
                        <svg fill="none" height="20" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="20"><path d="M19 9l-7 7-7-7"></path></svg>
                    </span>
                </summary>
                <div class="px-6 pb-6 text-luxe-muted text-sm leading-relaxed border-t border-white/5 pt-4">
                    Email reminders are included in all plans. SMS reminders are instantly available starting with our AI plans.
                </div>
            </details>

            <details class="group bg-black/40 hover:bg-white/[0.04] border border-white/5 hover:border-white/10 rounded-2xl transition-all duration-300 cursor-pointer open:bg-white/[0.04] open:border-white/10 overflow-hidden shadow-sm">
                <summary class="flex justify-between items-center font-bold text-white px-6 py-5 outline-none select-none">
                    <span class="pr-6">Can I keep my current salon phone number?</span>
                    <span class="text-luxe-gold transition-transform duration-300 group-open:-rotate-180 shrink-0">
                        <svg fill="none" height="20" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="20"><path d="M19 9l-7 7-7-7"></path></svg>
                    </span>
                </summary>
                <div class="px-6 pb-6 text-luxe-muted text-sm leading-relaxed border-t border-white/5 pt-4">
                    Absolutely. Voxali supports full call forwarding from your existing salon number, so Bella can start answering calls without changing how clients naturally reach you.
                </div>
            </details>

            <details class="group bg-black/40 hover:bg-white/[0.04] border border-white/5 hover:border-white/10 rounded-2xl transition-all duration-300 cursor-pointer open:bg-white/[0.04] open:border-white/10 overflow-hidden shadow-sm">
                <summary class="flex justify-between items-center font-bold text-white px-6 py-5 outline-none select-none">
                    <span class="pr-6">What are AI & Messaging credits?</span>
                    <span class="text-luxe-gold transition-transform duration-300 group-open:-rotate-180 shrink-0">
                        <svg fill="none" height="20" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="20"><path d="M19 9l-7 7-7-7"></path></svg>
                    </span>
                </summary>
                <div class="px-6 pb-6 text-luxe-muted text-sm leading-relaxed border-t border-white/5 pt-4">
                    These credits are exclusively used for Bella's AI call minutes and SMS messaging fees. Each AI plan automatically includes a generous monthly allowance.
                </div>
            </details>
            
            <details class="group bg-black/40 hover:bg-white/[0.04] border border-white/5 hover:border-white/10 rounded-2xl transition-all duration-300 cursor-pointer open:bg-white/[0.04] open:border-white/10 overflow-hidden shadow-sm">
                <summary class="flex justify-between items-center font-bold text-white px-6 py-5 outline-none select-none">
                    <span class="pr-6">What happens if I exceed my credits?</span>
                    <span class="text-luxe-gold transition-transform duration-300 group-open:-rotate-180 shrink-0">
                        <svg fill="none" height="20" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="20"><path d="M19 9l-7 7-7-7"></path></svg>
                    </span>
                </summary>
                <div class="px-6 pb-6 text-luxe-muted text-sm leading-relaxed border-t border-white/5 pt-4">
                    Additional usage is cleanly billed at simple, transparent overage rates shown natively on the pricing page. There are no sudden service cutoffs.
                </div>
            </details>

            <details class="group bg-black/40 hover:bg-white/[0.04] border border-white/5 hover:border-white/10 rounded-2xl transition-all duration-300 cursor-pointer open:bg-white/[0.04] open:border-white/10 overflow-hidden shadow-sm">
                <summary class="flex justify-between items-center font-bold text-white px-6 py-5 outline-none select-none">
                    <span class="pr-6">Does Voxali support multiple locations?</span>
                    <span class="text-luxe-gold transition-transform duration-300 group-open:-rotate-180 shrink-0">
                        <svg fill="none" height="20" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24" width="20"><path d="M19 9l-7 7-7-7"></path></svg>
                    </span>
                </summary>
                <div class="px-6 pb-6 text-luxe-muted text-sm leading-relaxed border-t border-white/5 pt-4">
                    This feature is planned for a future release, but is not currently available fully automated in the system.
                </div>
            </details>

        </div>

        <div class="mt-8 text-center bg-white/[0.02] border border-white/5 py-4 px-6 rounded-xl font-medium text-white/50 text-xs tracking-wide">
            No hidden fees. Upgrade anytime. Overage billing only applies if you exceed included usage.
        </div>
    </section>

    <!-- FINAL CTA -->`;

const updatedHtml = html.replace(regex, newSection);
fs.writeFileSync(targetPage, updatedHtml, 'utf8');
console.log("Replaced bulky FAQ cards with sleek Accordion layout.");
