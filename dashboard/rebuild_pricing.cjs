const fs = require('fs');
const path = require('path');
const { HEAD_CONTENT, FOOTER_CONTENT, NAV_CONTENT } = require('./layout_template.cjs');

const bodyStr = `
    <!-- CHECKOUT LOADER -->
    <div id="checkout-loader" class="fixed inset-0 z-[9999] bg-luxe-obsidian/90 backdrop-blur-md items-center justify-center flex-col gap-4">
        <div class="spinner"></div>
        <p class="text-luxe-muted font-medium">Setting up your secure checkout...</p>
    </div>

    <!-- HERO GLOW -->
    <div class="hero-glow animate-pulse-glow"></div>

    <!-- HEADER SECTION -->
    <main class="relative pt-40 pb-6 px-6 text-center z-10">
        <div class="max-w-4xl mx-auto animate-[slideUp_0.8s_ease-out]">
            <span class="inline-block text-luxe-gold font-bold tracking-widest text-sm uppercase mb-4">
                Simple pricing for modern salons
            </span>
            <h1 class="text-4xl md:text-5xl lg:text-7xl font-black tracking-tight mb-8">
                Choose the plan that fits <br /> <span class="text-gradient">your salon</span>
            </h1>
            <p class="text-lg text-luxe-muted font-medium max-w-3xl mx-auto mb-10 leading-relaxed">
                Every Voxali plan includes a custom online booking page, client CRM, email reminders, and Stripe payments. AI plans add Bella, your 24/7 AI receptionist, plus SMS reminders and automation.
            </p>
        </div>
    </main>

    <!-- TRUST STRIP -->
    <div class="max-w-6xl mx-auto px-6 mb-16 relative z-10 animate-[slideUp_0.8s_ease-out_0.2s_both]">
        <div class="flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm font-semibold text-white/70 bg-white/5 py-4 px-8 rounded-2xl border border-white/10 backdrop-blur-md">
            <span class="flex items-center gap-2"><svg class="w-4 h-4 text-luxe-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Booking page included</span>
            <span class="flex items-center gap-2"><svg class="w-4 h-4 text-luxe-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Email reminders in every plan</span>
            <span class="flex items-center gap-2"><svg class="w-4 h-4 text-luxe-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> SMS reminders in AI plans</span>
            <span class="flex items-center gap-2"><svg class="w-4 h-4 text-luxe-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Secure payments via Stripe</span>
            <span class="flex items-center gap-2"><svg class="w-4 h-4 text-luxe-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Cancel anytime</span>
        </div>
    </div>

    <!-- PRICING CARDS -->
    <section class="max-w-7xl mx-auto px-6 pb-20 relative z-10 animate-[slideUp_0.8s_ease-out_0.4s_both]">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            <!-- PLAN 1: ESSENTIALS -->
            <div class="glass-card rounded-2xl p-8 flex flex-col hover:-translate-y-2 transition-transform duration-300 border-t-2 border-t-white/10 group">
                <div class="mb-6">
                    <h3 class="text-xl font-bold text-white mb-2">ESSENTIALS</h3>
                    <p class="text-sm text-luxe-muted h-10">For salons that need booking software without AI</p>
                </div>
                <div class="mb-8">
                    <span class="text-4xl font-black text-white">$49</span><span class="text-luxe-muted">/mo</span>
                </div>
                <ul class="space-y-4 mb-8 flex-1 text-sm text-white/90">
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Up to 2 staff members</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Custom online booking page</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Clients can choose services and stylist</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Client CRM and calendar</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Stripe payments and deposits</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Email reminders</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Basic reporting</li>
                    <li class="flex items-start gap-3 text-white/40"><svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg> No AI receptionist</li>
                    <li class="flex items-start gap-3 text-white/40"><svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg> No SMS reminders</li>
                </ul>
                <button onclick="startCheckout('price_basic')" class="w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all mb-4">
                    Start with Essentials
                </button>
                <p class="text-[10px] text-luxe-muted text-center italic">Share your booking page on Instagram, Google Maps, or your website so clients can book anytime.</p>
            </div>

            <!-- PLAN 2: AI STARTER -->
            <div class="glass-card rounded-2xl p-8 flex flex-col hover:-translate-y-2 transition-transform duration-300 border-t-2 border-t-luxe-gold/50 shadow-[0_0_30px_rgba(212,175,55,0.05)] relative group">
                <div class="absolute -top-3 right-6 bg-luxe-gold text-black text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full shadow-lg">
                    AI Enabled
                </div>
                <div class="mb-6">
                    <h3 class="text-xl font-bold text-white mb-2 flex items-center gap-2">AI STARTER</h3>
                    <p class="text-sm text-luxe-muted h-10">For small salons ready to automate incoming calls</p>
                </div>
                <div class="mb-8">
                    <span class="text-4xl font-black text-white">$99</span><span class="text-luxe-muted">/mo</span>
                </div>
                <ul class="space-y-4 mb-8 flex-1 text-sm text-white/90">
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Up to 5 staff members</li>
                    <li class="flex items-start gap-3 font-semibold text-luxe-gold"><svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Bella AI Receptionist</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Dedicated local phone number</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Call forwarding from your existing number</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Custom online booking page</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Clients can choose services and stylist</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Stripe payments and deposits</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Email & SMS reminders</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Client CRM and calendar</li>
                </ul>
                <div class="mb-6 p-3 bg-white/5 rounded-lg border border-white/10">
                    <p class="text-xs text-white/80 font-medium">Monthly AI & messaging credits</p>
                    <p class="text-[11px] text-luxe-muted mt-1">(Approx. 100 AI minutes or 400 SMS)</p>
                </div>
                <button onclick="startCheckout('price_ai_starter')" class="w-full py-3 px-4 bg-gradient-gold hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] text-black font-bold rounded-xl transition-all">
                    Start AI Starter
                </button>
            </div>

            <!-- PLAN 3: AI GROWTH (POPULAR) -->
            <div class="glass-card rounded-2xl p-8 flex flex-col hover:-translate-y-2 transition-transform duration-300 border-2 border-luxe-gold shadow-[0_0_40px_rgba(212,175,55,0.15)] relative scale-105 z-10 group">
                <div class="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-gold text-black text-[10px] font-black tracking-widest uppercase px-4 py-1.5 rounded-full shadow-lg">
                    MOST POPULAR
                </div>
                <div class="mb-6 mt-2">
                    <h3 class="text-xl font-bold text-white mb-2">AI GROWTH</h3>
                    <p class="text-sm text-luxe-muted h-10">For busy salons and spas that want stronger automation</p>
                </div>
                <div class="mb-8">
                    <span class="text-4xl font-black text-luxe-gold">$199</span><span class="text-luxe-muted">/mo</span>
                </div>
                <ul class="space-y-4 mb-8 flex-1 text-sm text-white/90">
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Up to 15 staff members</li>
                    <li class="flex items-start gap-3 font-semibold text-luxe-gold"><svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Bella AI Receptionist</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Dedicated local phone number</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Call forwarding from existing number</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Custom online booking page</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Clients can choose services and stylist</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Stripe payments and deposits</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Email & SMS reminders</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Advanced CRM & Loyalty program</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> SMS and email campaigns</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Revenue analytics and reports</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Waitlist automation</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> White-glove onboarding included</li>
                </ul>
                <div class="mb-6 p-3 bg-luxe-gold/10 rounded-lg border border-luxe-gold/20">
                    <p class="text-xs text-white  font-medium">Monthly AI & messaging credits</p>
                    <p class="text-[11px] text-luxe-gold mt-1">(Approx. 250 AI minutes or 1,000 SMS)</p>
                </div>
                <button onclick="startCheckout('price_ai_growth')" class="w-full py-4 px-4 bg-gradient-gold hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] text-black font-black rounded-xl transition-all">
                    Choose Growth
                </button>
            </div>

            <!-- PLAN 4: ENTERPRISE -->
            <div class="glass-card rounded-2xl p-8 flex flex-col hover:-translate-y-2 transition-transform duration-300 border-t-2 border-t-purple-500/50 group">
                <div class="mb-6">
                    <h3 class="text-xl font-bold text-white mb-2">ENTERPRISE</h3>
                    <p class="text-sm text-luxe-muted h-10">For larger salon teams that need advanced support</p>
                </div>
                <div class="mb-8 flex items-baseline gap-1">
                    <span class="text-lg text-luxe-muted">From</span><span class="text-4xl font-black text-white">$349</span><span class="text-luxe-muted">/mo</span>
                </div>
                <ul class="space-y-4 mb-8 flex-1 text-sm text-white/90">
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Unlimited staff members</li>
                    <li class="flex items-start gap-3 font-semibold text-luxe-gold"><svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Bella AI Receptionist</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Dedicated local phone number</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Custom online booking page</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Advanced CRM and analytics</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> SMS and email campaigns</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Custom branding</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Advanced roles and permissions</li>
                    <li class="flex items-start gap-3"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Priority support & White-glove onboarding</li>
                </ul>
                <div class="mb-6 p-3 bg-white/5 rounded-lg border border-white/10">
                    <p class="text-xs text-white/80 font-medium">Monthly AI & messaging credits</p>
                    <p class="text-[11px] text-luxe-muted mt-1">(Approx. 500 AI minutes or 2,000 SMS)</p>
                </div>
                <a href="/contact.html" class="w-full text-center block py-3 px-4 bg-white/5 hover:bg-white/10 text-white border border-white/20 font-bold rounded-xl transition-all">
                    Talk to Sales
                </a>
            </div>

        </div>
    </section>

    <!-- INCLUDED IN EVERY PLAN -->
    <section class="max-w-5xl mx-auto px-6 py-20 relative z-10 border-t border-white/5">
        <div class="glass-card p-10 md:p-14 rounded-3xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
                <h2 class="text-3xl md:text-4xl font-black text-white mb-6">Every Voxali plan includes your salon’s online booking page</h2>
                <p class="text-luxe-muted text-lg mb-6">Each Voxali plan comes with a custom online booking page your clients can use to:</p>
                <ul class="space-y-3 text-white/80 font-medium mb-8">
                    <li class="flex items-center gap-3"><span class="w-2 h-2 rounded-full bg-luxe-gold"></span> View your services and pricing</li>
                    <li class="flex items-center gap-3"><span class="w-2 h-2 rounded-full bg-luxe-gold"></span> Choose their preferred stylist</li>
                    <li class="flex items-center gap-3"><span class="w-2 h-2 rounded-full bg-luxe-gold"></span> Pick an available date and time</li>
                    <li class="flex items-center gap-3"><span class="w-2 h-2 rounded-full bg-luxe-gold"></span> Pay deposits online through Stripe</li>
                    <li class="flex items-center gap-3"><span class="w-2 h-2 rounded-full bg-luxe-gold"></span> Receive instant booking confirmation by email</li>
                </ul>
                <div class="p-4 bg-luxe-gold/10 border-l-4 border-luxe-gold rounded-r-xl">
                    <p class="text-sm text-luxe-gold">Share your booking page link on Instagram, Google Maps, TikTok bio, or your website so clients can book without calling.</p>
                </div>
            </div>
            <div class="relative">
                <div class="absolute inset-0 bg-gradient-gold opacity-10 blur-3xl rounded-full"></div>
                <img src="/booking-preview.png" alt="Voxali Booking Page Preview" class="w-full h-auto rounded-xl border border-white/10 shadow-2xl relative z-10" onerror="this.src='https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=600'" />
            </div>
        </div>
    </section>


    <!-- COMPARISON TABLE -->
    <section class="max-w-7xl mx-auto px-6 py-20 relative z-10">
        <div class="text-center mb-16">
            <h2 class="text-3xl md:text-4xl font-black text-white mb-4">Compare all features</h2>
            <p class="text-luxe-muted text-lg">Find the perfect level of automation for your salon size.</p>
        </div>

        <div class="overflow-x-auto pb-8">
            <table class="w-full text-left border-collapse min-w-[800px]">
                <thead>
                    <tr class="border-b border-white/10">
                        <th class="py-6 px-4 font-bold text-white uppercase tracking-wider w-1/3">Features</th>
                        <th class="py-6 px-4 font-bold text-white text-center">Essentials<br/><span class="text-sm font-normal text-luxe-muted">$49/mo</span></th>
                        <th class="py-6 px-4 font-bold text-white text-center">AI Starter<br/><span class="text-sm font-normal text-luxe-muted">$99/mo</span></th>
                        <th class="py-6 px-4 font-bold text-luxe-gold text-center bg-white/5 rounded-t-xl">Growth<br/><span class="text-sm font-normal text-luxe-gold">$199/mo</span></th>
                        <th class="py-6 px-4 font-bold text-white text-center">Enterprise<br/><span class="text-sm font-normal text-luxe-muted">$349/mo</span></th>
                    </tr>
                </thead>
                <tbody class="text-sm">
                    <!-- Heading -->
                    <tr class="bg-black/50"><td colspan="5" class="py-4 px-4 font-bold text-luxe-gold text-xs uppercase tracking-widest border-b border-white/5">Booking & Client Management</td></tr>
                    <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td class="py-4 px-4 text-white/90">Online booking page</td>
                        <td class="text-center text-white">✓</td>
                        <td class="text-center text-white">✓</td>
                        <td class="text-center text-white bg-white/[0.02]">✓</td>
                        <td class="text-center text-white">✓</td>
                    </tr>
                    <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td class="py-4 px-4 text-white/90">Clients choose stylist</td>
                        <td class="text-center text-white">✓</td>
                        <td class="text-center text-white">✓</td>
                        <td class="text-center text-white bg-white/[0.02]">✓</td>
                        <td class="text-center text-white">✓</td>
                    </tr>
                    <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td class="py-4 px-4 text-white/90">Client CRM</td>
                        <td class="text-center text-white">✓</td>
                        <td class="text-center text-white">✓</td>
                        <td class="text-center text-white bg-white/[0.02]">Advanced</td>
                        <td class="text-center text-white">Advanced</td>
                    </tr>
                    <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td class="py-4 px-4 text-white/90">Email reminders</td>
                        <td class="text-center text-white">✓</td>
                        <td class="text-center text-white">✓</td>
                        <td class="text-center text-white bg-white/[0.02]">✓</td>
                        <td class="text-center text-white">✓</td>
                    </tr>
                    <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td class="py-4 px-4 text-white/90">SMS reminders</td>
                        <td class="text-center text-white/20">—</td>
                        <td class="text-center text-white">✓</td>
                        <td class="text-center text-white bg-white/[0.02]">✓</td>
                        <td class="text-center text-white">✓</td>
                    </tr>
                    <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td class="py-4 px-4 text-white/90">Stripe payments & deposits</td>
                        <td class="text-center text-white">✓</td>
                        <td class="text-center text-white">✓</td>
                        <td class="text-center text-white bg-white/[0.02]">✓</td>
                        <td class="text-center text-white">✓</td>
                    </tr>

                    <!-- Heading -->
                    <tr class="bg-black/50"><td colspan="5" class="py-4 px-4 font-bold text-luxe-gold text-xs uppercase tracking-widest border-b border-white/5">AI Reception</td></tr>
                    <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td class="py-4 px-4 text-white/90">Bella AI Receptionist</td>
                        <td class="text-center text-white/20">—</td>
                        <td class="text-center text-white">✓</td>
                        <td class="text-center text-white bg-white/[0.02]">✓</td>
                        <td class="text-center text-white">Custom limits</td>
                    </tr>
                    <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td class="py-4 px-4 text-white/90">Dedicated local number</td>
                        <td class="text-center text-white/20">—</td>
                        <td class="text-center text-white">✓</td>
                        <td class="text-center text-white bg-white/[0.02]">✓</td>
                        <td class="text-center text-white">✓</td>
                    </tr>
                    <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td class="py-4 px-4 text-white/90">Call forwarding support</td>
                        <td class="text-center text-white/20">—</td>
                        <td class="text-center text-white">✓</td>
                        <td class="text-center text-white bg-white/[0.02]">✓</td>
                        <td class="text-center text-white">✓</td>
                    </tr>
                    <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td class="py-4 px-4 text-white/90">Monthly AI & messaging credits</td>
                        <td class="text-center text-white/20">—</td>
                        <td class="text-center text-luxe-muted">~ 100 AI mins</td>
                        <td class="text-center text-luxe-gold bg-white/[0.02]">~ 250 AI mins</td>
                        <td class="text-center text-luxe-muted">~ 500 AI mins</td>
                    </tr>

                    <!-- Heading -->
                    <tr class="bg-black/50"><td colspan="5" class="py-4 px-4 font-bold text-luxe-gold text-xs uppercase tracking-widest border-b border-white/5">Growth Tools</td></tr>
                    <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td class="py-4 px-4 text-white/90">Campaigns</td>
                        <td class="text-center text-white/20">—</td>
                        <td class="text-center text-white/20">—</td>
                        <td class="text-center text-white bg-white/[0.02]">✓</td>
                        <td class="text-center text-white">✓</td>
                    </tr>
                    <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td class="py-4 px-4 text-white/90">Revenue analytics</td>
                        <td class="text-center text-white/20">—</td>
                        <td class="text-center text-white/20">—</td>
                        <td class="text-center text-white bg-white/[0.02]">✓</td>
                        <td class="text-center text-white">✓</td>
                    </tr>
                    <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td class="py-4 px-4 text-white/90">Loyalty program</td>
                        <td class="text-center text-white/20">—</td>
                        <td class="text-center text-white/20">—</td>
                        <td class="text-center text-white bg-white/[0.02]">✓</td>
                        <td class="text-center text-white">✓</td>
                    </tr>
                    <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td class="py-4 px-4 text-white/90">Waitlist automation</td>
                        <td class="text-center text-white/20">—</td>
                        <td class="text-center text-white/20">—</td>
                        <td class="text-center text-white bg-white/[0.02]">✓</td>
                        <td class="text-center text-white">✓</td>
                    </tr>

                    <!-- Heading -->
                    <tr class="bg-black/50"><td colspan="5" class="py-4 px-4 font-bold text-luxe-gold text-xs uppercase tracking-widest border-b border-white/5">Support</td></tr>
                    <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td class="py-4 px-4 text-white/90">White-glove onboarding</td>
                        <td class="text-center text-white/20">—</td>
                        <td class="text-center text-white/20">—</td>
                        <td class="text-center text-white bg-white/[0.02]">✓</td>
                        <td class="text-center text-white">✓</td>
                    </tr>
                    <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td class="py-4 px-4 text-white/90">Priority support</td>
                        <td class="text-center text-white/20">—</td>
                        <td class="text-center text-white/20">—</td>
                        <td class="text-center text-white bg-white/[0.02]">✓</td>
                        <td class="text-center text-white">✓</td>
                    </tr>
                    <tr class="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td class="py-4 px-4 text-white/90">Custom branding</td>
                        <td class="text-center text-white/20">—</td>
                        <td class="text-center text-white/20">—</td>
                        <td class="text-center text-white/20 bg-white/[0.02]">—</td>
                        <td class="text-center text-white">✓</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </section>

    <!-- PRICING FAQ -->
    <section class="max-w-4xl mx-auto px-6 py-20 relative z-10">
        <h2 class="text-3xl font-black text-white mb-10 text-center">Frequently Asked Questions</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div class="glass-card p-6 rounded-xl border border-white/5">
                <h4 class="text-lg font-bold text-white mb-2">Do all plans include an online booking page?</h4>
                <p class="text-sm text-luxe-muted">Yes. Every Voxali plan includes a custom booking page where clients can view services, choose a stylist, pick an available time, and book online.</p>
            </div>
            <div class="glass-card p-6 rounded-xl border border-white/5">
                <h4 class="text-lg font-bold text-white mb-2">Can clients choose different stylists from the booking page?</h4>
                <p class="text-sm text-luxe-muted">Yes. Clients can choose their preferred stylist based on availability.</p>
            </div>
            <div class="glass-card p-6 rounded-xl border border-white/5">
                <h4 class="text-lg font-bold text-white mb-2">Are reminders included?</h4>
                <p class="text-sm text-luxe-muted">Email reminders are included in all plans. SMS reminders are included in AI plans.</p>
            </div>
            <div class="glass-card p-6 rounded-xl border border-white/5">
                <h4 class="text-lg font-bold text-white mb-2">Can I keep my current salon phone number?</h4>
                <p class="text-sm text-luxe-muted">Voxali supports call forwarding from your existing salon number so Bella can start answering calls without changing how clients reach you.</p>
            </div>
            <div class="glass-card p-6 rounded-xl border border-white/5">
                <h4 class="text-lg font-bold text-white mb-2">What are AI and messaging credits?</h4>
                <p class="text-sm text-luxe-muted">These credits are used for Bella's AI call minutes and SMS messaging. Each AI plan includes a monthly allowance.</p>
            </div>
            <div class="glass-card p-6 rounded-xl border border-white/5">
                <h4 class="text-lg font-bold text-white mb-2">What happens if I exceed my credits?</h4>
                <p class="text-sm text-luxe-muted">Additional usage is billed at simple overage rates shown on the pricing page.</p>
            </div>
            <div class="glass-card p-6 rounded-xl border border-white/5">
                <h4 class="text-lg font-bold text-white mb-2">Is there a free trial?</h4>
                <p class="text-sm text-luxe-muted">Not currently. You can book a demo to hear Bella in action and see how Voxali works.</p>
            </div>
            <div class="glass-card p-6 rounded-xl border border-white/5">
                <h4 class="text-lg font-bold text-white mb-2">Does Voxali support multiple locations?</h4>
                <p class="text-sm text-luxe-muted">Not yet. Multi-location support is planned for a future release.</p>
            </div>
        </div>
    </section>

    <div class="text-center relative z-10 py-12">
        <p class="text-luxe-muted mb-6">Need a custom plan for a multi-location franchise?</p>
        <a href="/contact.html" class="inline-block border border-white/20 hover:border-white/50 text-white font-semibold py-3 px-8 rounded-xl transition-all">Talk to Sales</a>
    </div>

`;

// Render pricing
const filePath = path.join(__dirname, 'pricing.html');
const headRendered = HEAD_CONTENT.replace('__TITLE__', 'Pricing & Plans | Voxali').replace('__DESC__', 'Choose the CRM and AI Voice Receptionist plan that fits your salon.');
const customStyle = \`<style>
        .spinner {
            width: 48px;
            height: 48px;
            border: 4px solid rgba(212, 175, 55, 0.2);
            border-top-color: #D4AF37;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        /* When active, display as flex */
        #checkout-loader.active { display: flex; }
        #checkout-loader:not(.active) { display: none; }
    </style>\`;
const finalHead = headRendered.replace('</head>', \`\${customStyle}\n</head>\`);

const supabaseLogic = \`<script>
        const SUPABASE_URL = 'https://sjzxgjimbcoqsylrglkm.supabase.co';

        async function startCheckout(plan) {
            const loader = document.getElementById('checkout-loader');
            loader.classList.add('active');

            try {
                const res = await fetch(\`\${SUPABASE_URL}/functions/v1/create-checkout-session\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ plan: plan }),
                });
                
                const data = await res.json();
                
                if (data.checkout_url) {
                    window.location.href = data.checkout_url;
                } else {
                    loader.classList.remove('active');
                    alert(data.error || 'Failed to create checkout URL. Please try again.');
                }
            } catch (err) {
                console.error("Checkout Request Failed:", err);
                loader.classList.remove('active');
                alert('Network error communicating with the payment gateway. Please try again.');
            }
        }
    </script>\`;

const finalHtml = \`<!DOCTYPE html>
<html lang="en">
\${finalHead}
<body class="antialiased overflow-x-hidden selection:bg-luxe-gold selection:text-black">
    \${NAV_CONTENT}
    \${bodyStr}
    \${FOOTER_CONTENT}
    \${supabaseLogic}
    <script>
        function toggleMobileMenu() {
            const menu = document.getElementById('mobile-menu');
            const h1 = document.getElementById('ham-1');
            const h3 = document.getElementById('ham-3');
            menu.classList.toggle('hidden');
            menu.classList.toggle('flex');
            h1.classList.toggle('rotate-45');
            h1.classList.toggle('translate-y-2');
            h3.classList.toggle('opacity-0');
        }
    </script>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Voxali",
      "operatingSystem": "Web Application",
      "applicationCategory": "BusinessApplication",
      "offers": {
        "@type": "Offer",
        "price": "49.00",
        "priceCurrency": "USD"
      }
    }
    </script>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Voxali Inc.",
      "url": "https://voxali.net",
      "logo": "https://voxali.net/logo.png"
    }
    </script>
</body>
</html>\`;

fs.writeFileSync(filePath, finalHtml);
console.log('Rebuilt pricing.html');
