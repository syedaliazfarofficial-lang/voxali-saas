const fs = require('fs');
const path = require('path');

const targetPage = path.join(__dirname, 'pricing.html');
let html = fs.readFileSync(targetPage, 'utf8');

const regex = /<!-- INCLUDED IN EVERY PLAN -->(.|\n)*?<!-- COMPARISON TABLE -->/;

const newSection = `<!-- INCLUDED IN EVERY PLAN -->
    <section class="max-w-6xl mx-auto px-6 py-24 relative z-10 border-t border-white/5">
        <div class="glass-card p-10 md:p-16 rounded-[2.5rem] text-center relative overflow-hidden border border-luxe-gold/20 shadow-[0_0_50px_rgba(212,175,55,0.05)]">
            
            <!-- Background Glow -->
            <div class="absolute inset-x-0 top-0 h-full bg-gradient-gold opacity-[0.03] blur-3xl pointer-events-none"></div>
            
            <span class="inline-block px-5 py-2 rounded-full bg-luxe-gold/10 border border-luxe-gold/20 text-luxe-gold text-[10px] uppercase tracking-widest font-black mb-8 relative z-10 shadow-lg">
                INCLUDED STANDARD
            </span>
            
            <h2 class="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 relative z-10 max-w-4xl mx-auto leading-tight">
                Every Voxali plan includes a <br class="hidden md:block" /> <span class="text-gradient">custom booking page</span>
            </h2>
            
            <p class="text-luxe-muted text-lg mb-12 max-w-2xl mx-auto relative z-10 leading-relaxed font-medium">
                Stop paying for third-party booking tools. Your custom Voxali booking link handles services, staff selection, and Stripe deposits effortlessly.
            </p>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 relative z-10 text-left">
                
                <div class="bg-black/40 border border-white/5 hover:border-luxe-gold/30 rounded-2xl p-6 hover:-translate-y-1 transition-all duration-300 group">
                    <div class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:bg-luxe-gold/10 transition-colors">
                        <svg class="w-5 h-5 text-luxe-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                    </div>
                    <h4 class="text-white font-bold text-base mb-2">Service Menus</h4>
                    <p class="text-xs text-luxe-muted leading-relaxed">Display your salon's services with transparent pricing and exact durations.</p>
                </div>
                
                <div class="bg-black/40 border border-white/5 hover:border-luxe-gold/30 rounded-2xl p-6 hover:-translate-y-1 transition-all duration-300 group">
                    <div class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:bg-luxe-gold/10 transition-colors">
                        <svg class="w-5 h-5 text-luxe-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                    </div>
                    <h4 class="text-white font-bold text-base mb-2">Stylist Selection</h4>
                    <p class="text-xs text-luxe-muted leading-relaxed">Clients can seamlessly choose their preferred staff member based on live schedules.</p>
                </div>
                
                <div class="bg-black/40 border border-white/5 hover:border-luxe-gold/30 rounded-2xl p-6 hover:-translate-y-1 transition-all duration-300 group">
                    <div class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:bg-luxe-gold/10 transition-colors">
                        <svg class="w-5 h-5 text-luxe-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2z"></path></svg>
                    </div>
                    <h4 class="text-white font-bold text-base mb-2">Live Calendar</h4>
                    <p class="text-xs text-luxe-muted leading-relaxed">Say goodbye to double bookings. Real-time availability sync directly with your dashboard.</p>
                </div>
                
                <div class="bg-black/40 border border-white/5 hover:border-luxe-gold/30 rounded-2xl p-6 hover:-translate-y-1 transition-all duration-300 group">
                    <div class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:bg-luxe-gold/10 transition-colors">
                        <svg class="w-5 h-5 text-luxe-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
                    </div>
                    <h4 class="text-white font-bold text-base mb-2">Stripe Deposits</h4>
                    <p class="text-xs text-luxe-muted leading-relaxed">Protect your revenue. Automatically collect secure card deposits for every appointment booked.</p>
                </div>

            </div>
            
            <div class="mt-12 inline-block relative z-10 px-8 py-3 bg-white/5 border border-white/10 rounded-full">
                <p class="text-xs font-medium text-white/70">
                    <strong class="text-white">Pro Tip:</strong> Link your Voxali booking page directly on your Instagram bio, Google Maps, or TikTok so clients book instantly. 
                </p>
            </div>

        </div>
    </section>

    <!-- COMPARISON TABLE -->`;

const updatedHtml = html.replace(regex, newSection);
fs.writeFileSync(targetPage, updatedHtml, 'utf8');
console.log("Replaced ugly mockup with stunning grid section.");
