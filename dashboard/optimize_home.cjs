const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'index.html');
let content = fs.readFileSync(indexPath, 'utf8');

// 1. Update Title and Meta Description
content = content.replace(
    /<title>.*?<\/title>/s,
    `<title>Voxali | AI Receptionist and Salon Booking Software</title>`
);
content = content.replace(
    /<meta name="description"[\s\S]*?>/s,
    `<meta name="description"
        content="Voxali is a salon-focused platform with an AI receptionist, booking software, reminders, and CRM. Never miss another booking call again.">`
);

// 2. Update Hero Copy (Option C)
content = content.replace(
    /Stop Overpaying for<br>[\s\S]*?<\/h1>/,
    `Never miss another salon booking call with<br>
                <span class="text-gradient">Bella, your 24/7 AI receptionist.</span>
            </h1>`
);
content = content.replace(
    /Get an AI Receptionist, Booking, Reminders, and CRM in one platform[\s\S]*?<\/p>/,
    `Bella is your salon’s 24/7 AI receptionist, booking software, reminders, and CRM in one platform.</p>`
);

// 3. Add Trust Bar under Hero (Before Dashboard Mockup)
const trustBarContent = `
            <!-- Trust Bar -->
            <div class="flex flex-wrap items-center justify-center gap-6 sm:gap-12 mt-12 animate-[slideUp_0.8s_ease-out_400ms_both]">
                <div class="flex items-center gap-2 text-sm text-luxe-muted font-medium"><svg class="w-5 h-5 text-luxe-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Email reminders in every plan</div>
                <div class="flex items-center gap-2 text-sm text-luxe-muted font-medium"><svg class="w-5 h-5 text-luxe-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> SMS reminders in AI plans</div>
                <div class="flex items-center gap-2 text-sm text-luxe-muted font-medium"><svg class="w-5 h-5 text-luxe-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Secure payments via Stripe</div>
                <div class="flex items-center gap-2 text-sm text-luxe-muted font-medium"><svg class="w-5 h-5 text-luxe-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Call forwarding supported</div>
            </div>
`;
content = content.replace(
    /<!-- Dashboard Mockup Display -->/,
    trustBarContent + '\n            <!-- Dashboard Mockup Display -->'
);

// 4. Add Demo Section & Use Cases (Social Proof) right after the Dashboard Mockup
// Dashboard ends at: "</div>" then "</div>" then "</div>" wait, it ends with `</div>` inside `<main>` and then `</main>`
const demoAndUseCases = `
    <!-- DEMO & USE CASES SECTION -->
    <section class="py-24 px-6 relative border-t border-white/5 bg-luxe-charcoal">
        <div class="max-w-7xl mx-auto">
            <!-- Audio Demo -->
            <div class="max-w-4xl mx-auto text-center mb-20 animate-[slideUp_0.8s_ease-out]">
                <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-luxe-gold/30 bg-luxe-gold/10 text-luxe-gold text-xs font-bold uppercase tracking-widest mb-6">Hear the AI</div>
                <h2 class="text-3xl md:text-5xl font-black mb-6">Hear Bella handle real salon booking calls.</h2>
                <p class="text-lg text-luxe-muted mb-10">Bella sounds like a real human. She negotiates times, answers standard questions, and books directly into your calendar.</p>
                <div class="glass-card p-6 rounded-2xl md:w-2/3 mx-auto flex flex-col md:flex-row items-center gap-6">
                    <button class="w-16 h-16 rounded-full bg-gradient-gold text-black flex items-center justify-center shrink-0 hover:scale-105 transition-transform shadow-[0_0_20px_rgba(212,175,55,0.4)]">
                        <svg class="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </button>
                    <div class="text-left">
                        <h4 class="text-white font-bold text-lg">Live Booking Call Example</h4>
                        <p class="text-sm text-luxe-muted mt-1">Client booking a Balayage on Saturday. (1m 14s)</p>
                        <div class="w-full bg-white/10 h-1.5 rounded-full mt-3 overflow-hidden">
                            <div class="w-1/3 h-full bg-luxe-gold rounded-full"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Use Cases -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                <div class="glass-card p-8 rounded-2xl border-t-4 border-t-pink-500/50 hover:-translate-y-1 transition-transform">
                    <h3 class="text-xl font-bold text-white mb-4">For Hair Salons</h3>
                    <p class="text-sm text-luxe-muted leading-relaxed">Handle booking calls automatically even when stylists are busy with clients on the floor.</p>
                </div>
                <div class="glass-card p-8 rounded-2xl border-t-4 border-t-emerald-500/50 hover:-translate-y-1 transition-transform">
                    <h3 class="text-xl font-bold text-white mb-4">For Spas</h3>
                    <p class="text-sm text-luxe-muted leading-relaxed">Send reminders automatically, manage complex multi-service bookings, and reduce no-shows.</p>
                </div>
                <div class="glass-card p-8 rounded-2xl border-t-4 border-t-blue-500/50 hover:-translate-y-1 transition-transform">
                    <h3 class="text-xl font-bold text-white mb-4">For Barbershops</h3>
                    <p class="text-sm text-luxe-muted leading-relaxed">Keep client details organized, track daily revenue efficiently, and keep the calendar packed.</p>
                </div>
            </div>
        </div>
    </section>
`;

content = content.replace(
    /<\/main>\s*<!-- FAQ -->/,
    `</main>\n${demoAndUseCases}\n    <!-- FAQ -->`
);

// 5. Update FAQ on Homepage
const oldFaqRegex = /<details class="group glass-card.*?<\/details>\s*<\/div>\s*<\/div>\s*<\/section>/s;
const newFaq = `<details class="group glass-card rounded-xl px-6 py-4 cursor-pointer" open>
                    <summary class="flex justify-between items-center font-semibold text-lg list-none text-white">
                        Can I keep my current salon number?
                        <span class="transition group-open:rotate-180 text-luxe-gold">
                             <svg fill="none" height="24" shape-rendering="geometricPrecision" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                        </span>
                    </summary>
                    <p class="text-luxe-muted mt-4 text-sm leading-relaxed">Yes! We provide you with a new Voxali number. You simply set up Call Forwarding with your current provider so missed calls automatically route to Bella.</p>
                </details>

                <details class="group glass-card rounded-xl px-6 py-4 cursor-pointer">
                    <summary class="flex justify-between items-center font-semibold text-lg list-none text-white">
                        Does Bella handle rescheduling?
                        <span class="transition group-open:rotate-180 text-luxe-gold">
                             <svg fill="none" height="24" shape-rendering="geometricPrecision" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                        </span>
                    </summary>
                    <p class="text-luxe-muted mt-4 text-sm leading-relaxed">Yes! If a client calls to change their appointment, Bella deletes the old slot, finds new available times based on your calendar rules, and books the new one securely.</p>
                </details>

                <details class="group glass-card rounded-xl px-6 py-4 cursor-pointer">
                    <summary class="flex justify-between items-center font-semibold text-lg list-none text-white">
                        Are reminders included?
                        <span class="transition group-open:rotate-180 text-luxe-gold">
                             <svg fill="none" height="24" shape-rendering="geometricPrecision" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                        </span>
                    </summary>
                    <p class="text-luxe-muted mt-4 text-sm leading-relaxed">Email reminders are included in every single plan to prevent no-shows. SMS reminders are unlocked securely in our AI Starter, Growth, and Enterprise plans.</p>
                </details>
                
                <details class="group glass-card rounded-xl px-6 py-4 cursor-pointer">
                    <summary class="flex justify-between items-center font-semibold text-lg list-none text-white">
                        Is there a free trial?
                        <span class="transition group-open:rotate-180 text-luxe-gold">
                             <svg fill="none" height="24" shape-rendering="geometricPrecision" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                        </span>
                    </summary>
                    <p class="text-luxe-muted mt-4 text-sm leading-relaxed">Since onboarding involves assigning phone numbers and configuring AI telephony specifically for your salon, we don't offer free trials. However, we offer full demos and easy cancellations if it isn't a fit.</p>
                </details>
            </div>
        </div>
    </section>`;
content = content.replace(oldFaqRegex, newFaq);

fs.writeFileSync(indexPath, content);
console.log('Successfully updated index.html with copy, demo, use-cases, and FAQ!');
