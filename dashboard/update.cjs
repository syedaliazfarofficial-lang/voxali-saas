const fs = require('fs');

const css = 
  "    <!-- CHECKOUT LOADER -->\n" +
  "    <div id=\"checkout-loader\" class=\"fixed inset-0 z-[9999] bg-luxe-obsidian/90 backdrop-blur-md items-center justify-center flex-col gap-4\">\n" +
  "        <div class=\"spinner\"></div>\n" +
  "        <p class=\"text-luxe-muted font-medium\">Setting up your secure checkout...</p>\n" +
  "    </div>\n" +
  "\n" +
  "    <!-- HERO GLOW -->\n" +
  "    <div class=\"hero-glow animate-pulse-glow\"></div>\n" +
  "\n" +
  "    <!-- HEADER SECTION -->\n" +
  "    <main class=\"relative pt-40 pb-6 px-6 text-center z-10\">\n" +
  "        <div class=\"max-w-4xl mx-auto animate-[slideUp_0.8s_ease-out]\">\n" +
  "            <span class=\"inline-block text-luxe-gold font-bold tracking-widest text-sm uppercase mb-4\">\n" +
  "                Simple pricing for modern salons\n" +
  "            </span>\n" +
  "            <h1 class=\"text-4xl md:text-5xl lg:text-7xl font-black tracking-tight mb-8\">\n" +
  "                Choose the plan that fits <br /> <span class=\"text-gradient\">your salon</span>\n" +
  "            </h1>\n" +
  "            <p class=\"text-lg text-luxe-muted font-medium max-w-3xl mx-auto mb-10 leading-relaxed\">\n" +
  "                Every Voxali plan includes a custom online booking page, client CRM, email reminders, and Stripe payments. AI plans add Bella, your 24/7 AI receptionist, plus SMS reminders and automation.\n" +
  "            </p>\n" +
  "        </div>\n" +
  "    </main>\n" +
  "\n" +
  "    <!-- TRUST STRIP -->\n" +
  "    <div class=\"max-w-6xl mx-auto px-6 mb-16 relative z-10 animate-[slideUp_0.8s_ease-out_0.2s_both]\">\n" +
  "        <div class=\"flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm font-semibold text-white/70 bg-white/5 py-4 px-8 rounded-2xl border border-white/10 backdrop-blur-md\">\n" +
  "            <span class=\"flex items-center gap-2\"><svg class=\"w-4 h-4 text-luxe-gold\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> Booking page included</span>\n" +
  "            <span class=\"flex items-center gap-2\"><svg class=\"w-4 h-4 text-luxe-gold\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> Email reminders in every plan</span>\n" +
  "            <span class=\"flex items-center gap-2\"><svg class=\"w-4 h-4 text-luxe-gold\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> SMS reminders in AI plans</span>\n" +
  "            <span class=\"flex items-center gap-2\"><svg class=\"w-4 h-4 text-luxe-gold\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> Secure payments via Stripe</span>\n" +
  "            <span class=\"flex items-center gap-2\"><svg class=\"w-4 h-4 text-luxe-gold\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> Cancel anytime</span>\n" +
  "        </div>\n" +
  "    </div>\n" +
  "\n" +
  "    <!-- PRICING CARDS -->\n" +
  "    <section class=\"max-w-7xl mx-auto px-6 pb-20 relative z-10 animate-[slideUp_0.8s_ease-out_0.4s_both]\">\n" +
  "        <div class=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8\">\n" +
  "            \n" +
  "            <!-- PLAN 1: ESSENTIALS -->\n" +
  "            <div class=\"glass-card rounded-2xl p-8 flex flex-col hover:-translate-y-2 transition-transform duration-300 border-t-2 border-t-white/10 group\">\n" +
  "                <div class=\"mb-6\">\n" +
  "                    <h3 class=\"text-xl font-bold text-white mb-2\">ESSENTIALS</h3>\n" +
  "                    <p class=\"text-sm text-luxe-muted h-10\">For salons that need booking software without AI</p>\n" +
  "                </div>\n" +
  "                <div class=\"mb-8\">\n" +
  "                    <span class=\"text-4xl font-black text-white\">$49</span><span class=\"text-luxe-muted\">/mo</span>\n" +
  "                </div>\n" +
  "                <ul class=\"space-y-4 mb-8 flex-1 text-sm text-white/90\">\n" +
  "                    <li class=\"flex items-start gap-3\"><svg class=\"w-5 h-5 text-luxe-gold shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> Up to 2 staff members</li>\n" +
  "                    <li class=\"flex items-start gap-3\"><svg class=\"w-5 h-5 text-luxe-gold shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> Custom online booking page</li>\n" +
  "                    <li class=\"flex items-start gap-3\"><svg class=\"w-5 h-5 text-luxe-gold shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> Clients can choose services and stylist</li>\n" +
  "                    <li class=\"flex items-start gap-3\"><svg class=\"w-5 h-5 text-luxe-gold shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> Client CRM and calendar</li>\n" +
  "                    <li class=\"flex items-start gap-3\"><svg class=\"w-5 h-5 text-luxe-gold shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> Stripe payments and deposits</li>\n" +
  "                    <li class=\"flex items-start gap-3\"><svg class=\"w-5 h-5 text-luxe-gold shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> Email reminders</li>\n" +
  "                    <li class=\"flex items-start gap-3\"><svg class=\"w-5 h-5 text-luxe-gold shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> Basic reporting</li>\n" +
  "                    <li class=\"flex items-start gap-3 text-white/40\"><svg class=\"w-5 h-5 shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M6 18L18 6M6 6l12 12\"></path></svg> No AI receptionist</li>\n" +
  "                    <li class=\"flex items-start gap-3 text-white/40\"><svg class=\"w-5 h-5 shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M6 18L18 6M6 6l12 12\"></path></svg> No SMS reminders</li>\n" +
  "                </ul>\n" +
  "                <button onclick=\"startCheckout('price_basic')\" class=\"w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all mb-4\">\n" +
  "                    Start with Essentials\n" +
  "                </button>\n" +
  "                <p class=\"text-[10px] text-luxe-muted text-center italic\">Share your booking page on Instagram, Google Maps, or your website so clients can book anytime.</p>\n" +
  "            </div>\n" +
  "\n" +
  "            <!-- PLAN 2: AI STARTER -->\n" +
  "            <div class=\"glass-card rounded-2xl p-8 flex flex-col hover:-translate-y-2 transition-transform duration-300 border-t-2 border-t-luxe-gold/50 shadow-[0_0_30px_rgba(212,175,55,0.05)] relative group\">\n" +
  "                <div class=\"absolute -top-3 right-6 bg-luxe-gold text-black text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full shadow-lg\">\n" +
  "                    AI Enabled\n" +
  "                </div>\n" +
  "                <div class=\"mb-6\">\n" +
  "                    <h3 class=\"text-xl font-bold text-white mb-2 flex items-center gap-2\">AI STARTER</h3>\n" +
  "                    <p class=\"text-sm text-luxe-muted h-10\">For small salons ready to automate incoming calls</p>\n" +
  "                </div>\n" +
  "                <div class=\"mb-8\">\n" +
  "                    <span class=\"text-4xl font-black text-white\">$99</span><span class=\"text-luxe-muted\">/mo</span>\n" +
  "                </div>\n" +
  "                <ul class=\"space-y-4 mb-8 flex-1 text-sm text-white/90\">\n" +
  "                    <li class=\"flex items-start gap-3\"><svg class=\"w-5 h-5 text-luxe-gold shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> Up to 5 staff members</li>\n" +
  "                    <li class=\"flex items-start gap-3 font-semibold text-luxe-gold\"><svg class=\"w-5 h-5 shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M13 10V3L4 14h7v7l9-11h-7z\"></path></svg> Bella AI Receptionist</li>\n" +
  "                    <li class=\"flex items-start gap-3\"><svg class=\"w-5 h-5 text-luxe-gold shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> Dedicated local phone number</li>\n" +
  "                    <li class=\"flex items-start gap-3\"><svg class=\"w-5 h-5 text-luxe-gold shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> Call forwarding from your existing number</li>\n" +
  "                    <li class=\"flex items-start gap-3\"><svg class=\"w-5 h-5 text-luxe-gold shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> Custom online booking page</li>\n" +
  "                    <li class=\"flex items-start gap-3\"><svg class=\"w-5 h-5 text-luxe-gold shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> Clients can choose services and stylist</li>\n" +
  "                    <li class=\"flex items-start gap-3\"><svg class=\"w-5 h-5 text-luxe-gold shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> Stripe payments and deposits</li>\n" +
  "                    <li class=\"flex items-start gap-3\"><svg class=\"w-5 h-5 text-luxe-gold shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> Email & SMS reminders</li>\n" +
  "                    <li class=\"flex items-start gap-3\"><svg class=\"w-5 h-5 text-luxe-gold shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> Client CRM and calendar</li>\n" +
  "                </ul>\n" +
  "                <div class=\"mb-6 p-3 bg-white/5 rounded-lg border border-white/10\">\n" +
  "                    <p class=\"text-xs text-white/80 font-medium\">Monthly AI & messaging credits</p>\n" +
  "                    <p class=\"text-[11px] text-luxe-muted mt-1\">(Approx. 100 AI minutes or 400 SMS)</p>\n" +
  "                </div>\n" +
  "                <button onclick=\"startCheckout('price_ai_starter')\" class=\"w-full py-3 px-4 bg-gradient-gold hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] text-black font-bold rounded-xl transition-all\">\n" +
  "                    Start AI Starter\n" +
  "                </button>\n" +
  "            </div>\n" +
  "\n" +
  "            <!-- PLAN 3: AI GROWTH (POPULAR) -->\n" +
  "            <div class=\"glass-card rounded-2xl p-8 flex flex-col hover:-translate-y-2 transition-transform duration-300 border-2 border-luxe-gold shadow-[0_0_40px_rgba(212,175,55,0.15)] relative scale-105 z-10 group\">\n" +
  "                <div class=\"absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-gold text-black text-[10px] font-black tracking-widest uppercase px-4 py-1.5 rounded-full shadow-lg\">\n" +
  "                    MOST POPULAR\n" +
  "                </div>\n" +
  "                <div class=\"mb-6 mt-2\">\n" +
  "                    <h3 class=\"text-xl font-bold text-white mb-2\">AI GROWTH</h3>\n" +
  "                    <p class=\"text-sm text-luxe-muted h-10\">For busy salons and spas that want stronger automation</p>\n" +
  "                </div>\n" +
  "                <div class=\"mb-8\">\n" +
  "                    <span class=\"text-4xl font-black text-luxe-gold\">$199</span><span class=\"text-luxe-muted\">/mo</span>\n" +
  "                </div>\n" +
  "                <ul class=\"space-y-4 mb-8 flex-1 text-sm text-white/90\">\n" +
  "                    <li class=\"flex items-start gap-3\"><svg class=\"w-5 h-5 text-luxe-gold shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> Up to 15 staff members</li>\n" +
  "                    <li class=\"flex items-start gap-3 font-semibold text-luxe-gold\"><svg class=\"w-5 h-5 shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M13 10V3L4 14h7v7l9-11h-7z\"></path></svg> Bella AI Receptionist</li>\n" +
  "                    <li class=\"flex items-start gap-3\"><svg class=\"w-5 h-5 text-luxe-gold shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> Dedicated local phone number</li>\n" +
  "                    <li class=\"flex items-start gap-3\"><svg class=\"w-5 h-5 text-luxe-gold shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> Call forwarding from existing number</li>\n" +
  "                    <li class=\"flex items-start gap-3\"><svg class=\"w-5 h-5 text-luxe-gold shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> Custom online booking page</li>\n" +
  "                    <li class=\"flex items-start gap-3\"><svg class=\"w-5 h-5 text-luxe-gold shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> Clients can choose services and stylist</li>\n" +
  "                    <li class=\"flex items-start gap-3\"><svg class=\"w-5 h-5 text-luxe-gold shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> Stripe payments and deposits</li>\n" +
  "                    <li class=\"flex items-start gap-3\"><svg class=\"w-5 h-5 text-luxe-gold shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> Email & SMS reminders</li>\n" +
  "                    <li class=\"flex items-start gap-3\"><svg class=\"w-5 h-5 text-luxe-gold shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> Advanced CRM & Loyalty program</li>\n" +
  "                    <li class=\"flex items-start gap-3\"><svg class=\"w-5 h-5 text-luxe-gold shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> SMS and email campaigns</li>\n" +
  "                    <li class=\"flex items-start gap-3\"><svg class=\"w-5 h-5 text-luxe-gold shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> Revenue analytics and reports</li>\n" +
  "                    <li class=\"flex items-start gap-3\"><svg class=\"w-5 h-5 text-luxe-gold shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> Waitlist automation</li>\n" +
  "                    <li class=\"flex items-start gap-3\"><svg class=\"w-5 h-5 text-luxe-gold shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> White-glove onboarding included</li>\n" +
  "                </ul>\n" +
  "                <div class=\"mb-6 p-3 bg-luxe-gold/10 rounded-lg border border-luxe-gold/20\">\n" +
  "                    <p class=\"text-xs text-white  font-medium\">Monthly AI & messaging credits</p>\n" +
  "                    <p class=\"text-[11px] text-luxe-gold mt-1\">(Approx. 250 AI minutes or 1,000 SMS)</p>\n" +
  "                </div>\n" +
  "                <button onclick=\"startCheckout('price_ai_growth')\" class=\"w-full py-4 px-4 bg-gradient-gold hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] text-black font-black rounded-xl transition-all\">\n" +
  "                    Choose Growth\n" +
  "                </button>\n" +
  "            </div>\n" +
  "\n" +
  "            <!-- PLAN 4: ENTERPRISE -->\n" +
  "            <div class=\"glass-card rounded-2xl p-8 flex flex-col hover:-translate-y-2 transition-transform duration-300 border-t-2 border-t-purple-500/50 group\">\n" +
  "                <div class=\"mb-6\">\n" +
  "                    <h3 class=\"text-xl font-bold text-white mb-2\">ENTERPRISE</h3>\n" +
  "                    <p class=\"text-sm text-luxe-muted h-10\">For larger salon teams that need advanced support</p>\n" +
  "                </div>\n" +
  "                <div class=\"mb-8 flex items-baseline gap-1\">\n" +
  "                    <span class=\"text-lg text-luxe-muted\">From</span><span class=\"text-4xl font-black text-white\">$349</span><span class=\"text-luxe-muted\">/mo</span>\n" +
  "                </div>\n" +
  "                <ul class=\"space-y-4 mb-8 flex-1 text-sm text-white/90\">\n" +
  "                    <li class=\"flex items-start gap-3\"><svg class=\"w-5 h-5 text-luxe-gold shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> Unlimited staff members</li>\n" +
  "                    <li class=\"flex items-start gap-3 font-semibold text-luxe-gold\"><svg class=\"w-5 h-5 shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M13 10V3L4 14h7v7l9-11h-7z\"></path></svg> Bella AI Receptionist</li>\n" +
  "                    <li class=\"flex items-start gap-3\"><svg class=\"w-5 h-5 text-luxe-gold shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> Dedicated local phone number</li>\n" +
  "                    <li class=\"flex items-start gap-3\"><svg class=\"w-5 h-5 text-luxe-gold shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> Custom online booking page</li>\n" +
  "                    <li class=\"flex items-start gap-3\"><svg class=\"w-5 h-5 text-luxe-gold shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> Advanced CRM and analytics</li>\n" +
  "                    <li class=\"flex items-start gap-3\"><svg class=\"w-5 h-5 text-luxe-gold shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> SMS and email campaigns</li>\n" +
  "                    <li class=\"flex items-start gap-3\"><svg class=\"w-5 h-5 text-luxe-gold shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> Custom branding</li>\n" +
  "                    <li class=\"flex items-start gap-3\"><svg class=\"w-5 h-5 text-luxe-gold shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> Advanced roles and permissions</li>\n" +
  "                    <li class=\"flex items-start gap-3\"><svg class=\"w-5 h-5 text-luxe-gold shrink-0\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"M5 13l4 4L19 7\"></path></svg> Priority support & White-glove onboarding</li>\n" +
  "                </ul>\n" +
  "                <div class=\"mb-6 p-3 bg-white/5 rounded-lg border border-white/10\">\n" +
  "                    <p class=\"text-xs text-white/80 font-medium\">Monthly AI & messaging credits</p>\n" +
  "                    <p class=\"text-[11px] text-luxe-muted mt-1\">(Approx. 500 AI minutes or 2,000 SMS)</p>\n" +
  "                </div>\n" +
  "                <a href=\"/contact.html\" class=\"w-full text-center block py-3 px-4 bg-white/5 hover:bg-white/10 text-white border border-white/20 font-bold rounded-xl transition-all\">\n" +
  "                    Talk to Sales\n" +
  "                </a>\n" +
  "            </div>\n" +
  "\n" +
  "        </div>\n" +
  "    </section>\n" +
  "\n" +
  "    <!-- INCLUDED IN EVERY PLAN -->\n" +
  "    <section class=\"max-w-5xl mx-auto px-6 py-20 relative z-10 border-t border-white/5\">\n" +
  "        <div class=\"glass-card p-10 md:p-14 rounded-3xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center\">\n" +
  "            <div>\n" +
  "                <h2 class=\"text-3xl md:text-4xl font-black text-white mb-6\">Every Voxali plan includes your salon's online booking page</h2>\n" +
  "                <p class=\"text-luxe-muted text-lg mb-6\">Each Voxali plan comes with a custom online booking page your clients can use to:</p>\n" +
  "                <ul class=\"space-y-3 text-white/80 font-medium mb-8\">\n" +
  "                    <li class=\"flex items-center gap-3\"><span class=\"w-2 h-2 rounded-full bg-luxe-gold\"></span> View your services and pricing</li>\n" +
  "                    <li class=\"flex items-center gap-3\"><span class=\"w-2 h-2 rounded-full bg-luxe-gold\"></span> Choose their preferred stylist</li>\n" +
  "                    <li class=\"flex items-center gap-3\"><span class=\"w-2 h-2 rounded-full bg-luxe-gold\"></span> Pick an available date and time</li>\n" +
  "                    <li class=\"flex items-center gap-3\"><span class=\"w-2 h-2 rounded-full bg-luxe-gold\"></span> Pay deposits online through Stripe</li>\n" +
  "                    <li class=\"flex items-center gap-3\"><span class=\"w-2 h-2 rounded-full bg-luxe-gold\"></span> Receive instant booking confirmation by email</li>\n" +
  "                </ul>\n" +
  "                <div class=\"p-4 bg-luxe-gold/10 border-l-4 border-luxe-gold rounded-r-xl\">\n" +
  "                    <p class=\"text-sm text-luxe-gold\">Share your booking page link on Instagram, Google Maps, TikTok bio, or your website so clients can book without calling.</p>\n" +
  "                </div>\n" +
  "            </div>\n" +
  "            <div class=\"relative\">\n" +
  "                <div class=\"absolute inset-0 bg-gradient-gold opacity-10 blur-3xl rounded-full\"></div>\n" +
  "                <img src=\"/booking-preview.png\" alt=\"Voxali Booking Page\" class=\"w-full h-auto rounded-xl border border-white/10 shadow-2xl relative z-10\" onerror=\"this.style.display='none'\" />\n" +
  "            </div>\n" +
  "        </div>\n" +
  "    </section>\n" +
  "\n" +
  "    <!-- COMPARISON TABLE -->\n" +
  "    <section class=\"max-w-7xl mx-auto px-6 py-20 relative z-10\">\n" +
  "        <div class=\"text-center mb-16\">\n" +
  "            <h2 class=\"text-3xl md:text-4xl font-black text-white mb-4\">Compare all features</h2>\n" +
  "            <p class=\"text-luxe-muted text-lg\">Find the perfect level of automation for your salon size.</p>\n" +
  "        </div>\n" +
  "\n" +
  "        <div class=\"overflow-x-auto pb-8\">\n" +
  "            <table class=\"w-full text-left border-collapse min-w-[800px]\">\n" +
  "                <thead>\n" +
  "                    <tr class=\"border-b border-white/10\">\n" +
  "                        <th class=\"py-6 px-4 font-bold text-white uppercase tracking-wider w-1/3\">Features</th>\n" +
  "                        <th class=\"py-6 px-4 font-bold text-white text-center\">Essentials<br/><span class=\"text-sm font-normal text-luxe-muted\">$49/mo</span></th>\n" +
  "                        <th class=\"py-6 px-4 font-bold text-white text-center\">AI Starter<br/><span class=\"text-sm font-normal text-luxe-muted\">$99/mo</span></th>\n" +
  "                        <th class=\"py-6 px-4 font-bold text-luxe-gold text-center bg-white/5 rounded-t-xl\">Growth<br/><span class=\"text-sm font-normal text-luxe-gold\">$199/mo</span></th>\n" +
  "                        <th class=\"py-6 px-4 font-bold text-white text-center\">Enterprise<br/><span class=\"text-sm font-normal text-luxe-muted\">$349/mo</span></th>\n" +
  "                    </tr>\n" +
  "                </thead>\n" +
  "                <tbody class=\"text-sm\">\n" +
  "                    <!-- Heading -->\n" +
  "                    <tr class=\"bg-black/50\"><td colspan=\"5\" class=\"py-4 px-4 font-bold text-luxe-gold text-xs uppercase tracking-widest border-b border-white/5\">Booking & Client Management</td></tr>\n" +
  "                    <tr class=\"border-b border-white/5 hover:bg-white/5 transition-colors\">\n" +
  "                        <td class=\"py-4 px-4 text-white/90\">Online booking page</td>\n" +
  "                        <td class=\"text-center text-white\">✓</td>\n" +
  "                        <td class=\"text-center text-white\">✓</td>\n" +
  "                        <td class=\"text-center text-white bg-white/[0.02]\">✓</td>\n" +
  "                        <td class=\"text-center text-white\">✓</td>\n" +
  "                    </tr>\n" +
  "                    <tr class=\"border-b border-white/5 hover:bg-white/5 transition-colors\">\n" +
  "                        <td class=\"py-4 px-4 text-white/90\">Clients choose stylist</td>\n" +
  "                        <td class=\"text-center text-white\">✓</td>\n" +
  "                        <td class=\"text-center text-white\">✓</td>\n" +
  "                        <td class=\"text-center text-white bg-white/[0.02]\">✓</td>\n" +
  "                        <td class=\"text-center text-white\">✓</td>\n" +
  "                    </tr>\n" +
  "                    <tr class=\"border-b border-white/5 hover:bg-white/5 transition-colors\">\n" +
  "                        <td class=\"py-4 px-4 text-white/90\">Client CRM</td>\n" +
  "                        <td class=\"text-center text-white\">✓</td>\n" +
  "                        <td class=\"text-center text-white\">✓</td>\n" +
  "                        <td class=\"text-center text-white bg-white/[0.02]\">Advanced</td>\n" +
  "                        <td class=\"text-center text-white\">Advanced</td>\n" +
  "                    </tr>\n" +
  "                    <tr class=\"border-b border-white/5 hover:bg-white/5 transition-colors\">\n" +
  "                        <td class=\"py-4 px-4 text-white/90\">Email reminders</td>\n" +
  "                        <td class=\"text-center text-white\">✓</td>\n" +
  "                        <td class=\"text-center text-white\">✓</td>\n" +
  "                        <td class=\"text-center text-white bg-white/[0.02]\">✓</td>\n" +
  "                        <td class=\"text-center text-white\">✓</td>\n" +
  "                    </tr>\n" +
  "                    <tr class=\"border-b border-white/5 hover:bg-white/5 transition-colors\">\n" +
  "                        <td class=\"py-4 px-4 text-white/90\">SMS reminders</td>\n" +
  "                        <td class=\"text-center text-white/20\">—</td>\n" +
  "                        <td class=\"text-center text-white\">✓</td>\n" +
  "                        <td class=\"text-center text-white bg-white/[0.02]\">✓</td>\n" +
  "                        <td class=\"text-center text-white\">✓</td>\n" +
  "                    </tr>\n" +
  "                    <tr class=\"border-b border-white/5 hover:bg-white/5 transition-colors\">\n" +
  "                        <td class=\"py-4 px-4 text-white/90\">Stripe payments & deposits</td>\n" +
  "                        <td class=\"text-center text-white\">✓</td>\n" +
  "                        <td class=\"text-center text-white\">✓</td>\n" +
  "                        <td class=\"text-center text-white bg-white/[0.02]\">✓</td>\n" +
  "                        <td class=\"text-center text-white\">✓</td>\n" +
  "                    </tr>\n" +
  "\n" +
  "                    <!-- Heading -->\n" +
  "                    <tr class=\"bg-black/50\"><td colspan=\"5\" class=\"py-4 px-4 font-bold text-luxe-gold text-xs uppercase tracking-widest border-b border-white/5\">AI Reception</td></tr>\n" +
  "                    <tr class=\"border-b border-white/5 hover:bg-white/5 transition-colors\">\n" +
  "                        <td class=\"py-4 px-4 text-white/90\">Bella AI Receptionist</td>\n" +
  "                        <td class=\"text-center text-white/20\">—</td>\n" +
  "                        <td class=\"text-center text-white\">✓</td>\n" +
  "                        <td class=\"text-center text-white bg-white/[0.02]\">✓</td>\n" +
  "                        <td class=\"text-center text-white\">Custom limits</td>\n" +
  "                    </tr>\n" +
  "                    <tr class=\"border-b border-white/5 hover:bg-white/5 transition-colors\">\n" +
  "                        <td class=\"py-4 px-4 text-white/90\">Dedicated local number</td>\n" +
  "                        <td class=\"text-center text-white/20\">—</td>\n" +
  "                        <td class=\"text-center text-white\">✓</td>\n" +
  "                        <td class=\"text-center text-white bg-white/[0.02]\">✓</td>\n" +
  "                        <td class=\"text-center text-white\">✓</td>\n" +
  "                    </tr>\n" +
  "                    <tr class=\"border-b border-white/5 hover:bg-white/5 transition-colors\">\n" +
  "                        <td class=\"py-4 px-4 text-white/90\">Call forwarding support</td>\n" +
  "                        <td class=\"text-center text-white/20\">—</td>\n" +
  "                        <td class=\"text-center text-white\">✓</td>\n" +
  "                        <td class=\"text-center text-white bg-white/[0.02]\">✓</td>\n" +
  "                        <td class=\"text-center text-white\">✓</td>\n" +
  "                    </tr>\n" +
  "                    <tr class=\"border-b border-white/5 hover:bg-white/5 transition-colors\">\n" +
  "                        <td class=\"py-4 px-4 text-white/90\">Monthly AI & messaging credits</td>\n" +
  "                        <td class=\"text-center text-white/20\">—</td>\n" +
  "                        <td class=\"text-center text-luxe-muted\">~ 100 AI mins</td>\n" +
  "                        <td class=\"text-center text-luxe-gold bg-white/[0.02]\">~ 250 AI mins</td>\n" +
  "                        <td class=\"text-center text-luxe-muted\">~ 500 AI mins</td>\n" +
  "                    </tr>\n" +
  "\n" +
  "                    <!-- Heading -->\n" +
  "                    <tr class=\"bg-black/50\"><td colspan=\"5\" class=\"py-4 px-4 font-bold text-luxe-gold text-xs uppercase tracking-widest border-b border-white/5\">Growth Tools</td></tr>\n" +
  "                    <tr class=\"border-b border-white/5 hover:bg-white/5 transition-colors\">\n" +
  "                        <td class=\"py-4 px-4 text-white/90\">Campaigns</td>\n" +
  "                        <td class=\"text-center text-white/20\">—</td>\n" +
  "                        <td class=\"text-center text-white/20\">—</td>\n" +
  "                        <td class=\"text-center text-white bg-white/[0.02]\">✓</td>\n" +
  "                        <td class=\"text-center text-white\">✓</td>\n" +
  "                    </tr>\n" +
  "                    <tr class=\"border-b border-white/5 hover:bg-white/5 transition-colors\">\n" +
  "                        <td class=\"py-4 px-4 text-white/90\">Revenue analytics</td>\n" +
  "                        <td class=\"text-center text-white/20\">—</td>\n" +
  "                        <td class=\"text-center text-white/20\">—</td>\n" +
  "                        <td class=\"text-center text-white bg-white/[0.02]\">✓</td>\n" +
  "                        <td class=\"text-center text-white\">✓</td>\n" +
  "                    </tr>\n" +
  "                    <tr class=\"border-b border-white/5 hover:bg-white/5 transition-colors\">\n" +
  "                        <td class=\"py-4 px-4 text-white/90\">Loyalty program</td>\n" +
  "                        <td class=\"text-center text-white/20\">—</td>\n" +
  "                        <td class=\"text-center text-white/20\">—</td>\n" +
  "                        <td class=\"text-center text-white bg-white/[0.02]\">✓</td>\n" +
  "                        <td class=\"text-center text-white\">✓</td>\n" +
  "                    </tr>\n" +
  "                    <tr class=\"border-b border-white/5 hover:bg-white/5 transition-colors\">\n" +
  "                        <td class=\"py-4 px-4 text-white/90\">Waitlist automation</td>\n" +
  "                        <td class=\"text-center text-white/20\">—</td>\n" +
  "                        <td class=\"text-center text-white/20\">—</td>\n" +
  "                        <td class=\"text-center text-white bg-white/[0.02]\">✓</td>\n" +
  "                        <td class=\"text-center text-white\">✓</td>\n" +
  "                    </tr>\n" +
  "\n" +
  "                    <!-- Heading -->\n" +
  "                    <tr class=\"bg-black/50\"><td colspan=\"5\" class=\"py-4 px-4 font-bold text-luxe-gold text-xs uppercase tracking-widest border-b border-white/5\">Support</td></tr>\n" +
  "                    <tr class=\"border-b border-white/5 hover:bg-white/5 transition-colors\">\n" +
  "                        <td class=\"py-4 px-4 text-white/90\">White-glove onboarding</td>\n" +
  "                        <td class=\"text-center text-white/20\">—</td>\n" +
  "                        <td class=\"text-center text-white/20\">—</td>\n" +
  "                        <td class=\"text-center text-white bg-white/[0.02]\">✓</td>\n" +
  "                        <td class=\"text-center text-white\">✓</td>\n" +
  "                    </tr>\n" +
  "                    <tr class=\"border-b border-white/5 hover:bg-white/5 transition-colors\">\n" +
  "                        <td class=\"py-4 px-4 text-white/90\">Priority support</td>\n" +
  "                        <td class=\"text-center text-white/20\">—</td>\n" +
  "                        <td class=\"text-center text-white/20\">—</td>\n" +
  "                        <td class=\"text-center text-white bg-white/[0.02]\">✓</td>\n" +
  "                        <td class=\"text-center text-white\">✓</td>\n" +
  "                    </tr>\n" +
  "                    <tr class=\"border-b border-white/5 hover:bg-white/5 transition-colors\">\n" +
  "                        <td class=\"py-4 px-4 text-white/90\">Custom branding</td>\n" +
  "                        <td class=\"text-center text-white/20\">—</td>\n" +
  "                        <td class=\"text-center text-white/20\">—</td>\n" +
  "                        <td class=\"text-center text-white/20 bg-white/[0.02]\">—</td>\n" +
  "                        <td class=\"text-center text-white\">✓</td>\n" +
  "                    </tr>\n" +
  "                </tbody>\n" +
  "            </table>\n" +
  "        </div>\n" +
  "    </section>\n" +
  "\n" +
  "    <!-- PRICING FAQ -->\n" +
  "    <section class=\"max-w-4xl mx-auto px-6 py-20 relative z-10\">\n" +
  "        <h2 class=\"text-3xl font-black text-white mb-10 text-center\">Frequently Asked Questions</h2>\n" +
  "        <div class=\"grid grid-cols-1 md:grid-cols-2 gap-8\">\n" +
  "            <div class=\"glass-card p-6 rounded-xl border border-white/5\">\n" +
  "                <h4 class=\"text-lg font-bold text-white mb-2\">Do all plans include an online booking page?</h4>\n" +
  "                <p class=\"text-sm text-luxe-muted\">Yes. Every Voxali plan includes a custom booking page where clients can view services, choose a stylist, pick an available time, and book online.</p>\n" +
  "            </div>\n" +
  "            <div class=\"glass-card p-6 rounded-xl border border-white/5\">\n" +
  "                <h4 class=\"text-lg font-bold text-white mb-2\">Can clients choose different stylists from the booking page?</h4>\n" +
  "                <p class=\"text-sm text-luxe-muted\">Yes. Clients can choose their preferred stylist based on availability.</p>\n" +
  "            </div>\n" +
  "            <div class=\"glass-card p-6 rounded-xl border border-white/5\">\n" +
  "                <h4 class=\"text-lg font-bold text-white mb-2\">Are reminders included?</h4>\n" +
  "                <p class=\"text-sm text-luxe-muted\">Email reminders are included in all plans. SMS reminders are included in AI plans.</p>\n" +
  "            </div>\n" +
  "            <div class=\"glass-card p-6 rounded-xl border border-white/5\">\n" +
  "                <h4 class=\"text-lg font-bold text-white mb-2\">Can I keep my current salon phone number?</h4>\n" +
  "                <p class=\"text-sm text-luxe-muted\">Voxali supports call forwarding from your existing salon number so Bella can start answering calls without changing how clients reach you.</p>\n" +
  "            </div>\n" +
  "            <div class=\"glass-card p-6 rounded-xl border border-white/5\">\n" +
  "                <h4 class=\"text-lg font-bold text-white mb-2\">What are AI and messaging credits?</h4>\n" +
  "                <p class=\"text-sm text-luxe-muted\">These credits are used for Bella's AI call minutes and SMS messaging. Each AI plan includes a monthly allowance.</p>\n" +
  "            </div>\n" +
  "            <div class=\"glass-card p-6 rounded-xl border border-white/5\">\n" +
  "                <h4 class=\"text-lg font-bold text-white mb-2\">What happens if I exceed my credits?</h4>\n" +
  "                <p class=\"text-sm text-luxe-muted\">Additional usage is billed at simple overage rates shown on the pricing page.</p>\n" +
  "            </div>\n" +
  "            <div class=\"glass-card p-6 rounded-xl border border-white/5\">\n" +
  "                <h4 class=\"text-lg font-bold text-white mb-2\">Is there a free trial?</h4>\n" +
  "                <p class=\"text-sm text-luxe-muted\">Not currently. You can book a demo to hear Bella in action and see how Voxali works.</p>\n" +
  "            </div>\n" +
  "            <div class=\"glass-card p-6 rounded-xl border border-white/5\">\n" +
  "                <h4 class=\"text-lg font-bold text-white mb-2\">Does Voxali support multiple locations?</h4>\n" +
  "                <p class=\"text-sm text-luxe-muted\">Not yet. Multi-location support is planned for a future release.</p>\n" +
  "            </div>\n" +
  "        </div>\n" +
  "    </section>\n" +
  "\n" +
  "    <div class=\"text-center relative z-10 py-12\">\n" +
  "        <p class=\"text-luxe-muted mb-6\">Need a custom plan for a multi-location franchise?</p>\n" +
  "        <a href=\"/contact.html\" class=\"inline-block border border-white/20 hover:border-white/50 text-white font-semibold py-3 px-8 rounded-xl transition-all\">Talk to Sales</a>\n" +
  "    </div>\n";

let content = fs.readFileSync('pricing.html', 'utf8');

// Replace everything between <main... and </section> basically.
// We will wipe out <main> through comparison table and replace with our css
let replaced = content.split('<main')[0] + css + content.split('<!-- FOOTER -->')[1];

fs.writeFileSync('pricing.html', replaced);
console.log('Script success');
