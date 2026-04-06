const fs = require('fs');
const path = require('path');
const { HEAD_CONTENT, FOOTER_CONTENT, NAV_CONTENT } = require('./layout_template.cjs');

const privacyBody = `
    <!-- HEADER SECTION -->
    <main class="relative pt-40 pb-16 px-6 text-center">
        <div class="max-w-4xl mx-auto animate-[slideUp_0.8s_ease-out]">
            <h1 class="text-4xl md:text-5xl font-black tracking-tight mb-6">
                Privacy Policy
            </h1>
            <p class="text-lg text-luxe-muted font-medium mb-10">
                Last Updated: June 2025
            </p>
        </div>
    </main>

    <div class="container bg-luxe-charcoal border-white/5 rounded-2xl mx-auto mb-24 px-8 md:px-16 py-12 prose prose-invert prose-gold max-w-4xl">
        <p>At Voxali, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect your information when you visit our website or use our AI-powered salon management platform.</p>

        <h2 class="text-2xl font-bold text-white mt-10 mb-4 pb-2 border-b border-white/10">1. Information We Collect</h2>
        <p>We may collect the following types of information:</p>
        <ul class="space-y-2 list-disc pl-5">
            <li><strong>Account Information:</strong> Your name, email address, phone number, and business details provided during registration.</li>
            <li><strong>Salon and Client Data:</strong> Information you enter into the platform, including staff details, services, client names, contact details, appointment history, and preferences.</li>
            <li><strong>Call and Communication Data:</strong> Voxali may process data related to AI-powered call handling, including call metadata, booking activity, and communication workflows. Expanded features such as call recording tools may be introduced in future releases. Call transcripts are not currently part of the platform offering.</li>
            <li><strong>Payment Information:</strong> Payment details are processed through Stripe. Voxali does not directly store your full payment card information.</li>
            <li><strong>Usage Data:</strong> Information about how you use the platform, including pages visited, features used, and general activity logs.</li>
            <li><strong>Device and Browser Data:</strong> IP address, browser type, device type, and similar technical information collected automatically when you visit our website.</li>
        </ul>

        <h2 class="text-2xl font-bold text-white mt-10 mb-4 pb-2 border-b border-white/10">2. How We Use Your Information</h2>
        <p>We use collected information to:</p>
        <ul class="space-y-2 list-disc pl-5">
            <li>Create and manage your salon account</li>
            <li>Provide the AI receptionist and booking services</li>
            <li>Process payments and deposits through Stripe</li>
            <li>Send email and SMS reminders as configured in your plan</li>
            <li>Send system notifications, updates, and support messages</li>
            <li>Improve the platform and user experience</li>
            <li>Maintain security and prevent unauthorized access</li>
            <li>Comply with legal obligations</li>
        </ul>

        <h2 class="text-2xl font-bold text-white mt-10 mb-4 pb-2 border-b border-white/10">3. Data Sharing</h2>
        <p>We do not sell your personal information.</p>
        <p>We may share data with trusted third-party service providers that help us operate the platform, including:</p>
        <ul class="space-y-2 list-disc pl-5">
            <li><strong>Stripe</strong> for payment processing</li>
            <li><strong>Twilio</strong> for telephony and messaging</li>
            <li><strong>ElevenLabs</strong> for AI voice generation</li>
            <li><strong>Supabase</strong> for data infrastructure</li>
            <li><strong>Cloudflare</strong> for hosting and security</li>
        </ul>

        <h2 class="text-2xl font-bold text-white mt-10 mb-4 pb-2 border-b border-white/10">4. Cookies and Tracking</h2>
        <p>Our website may use cookies and similar technologies for basic functionality, analytics, and improving user experience. You can manage cookie preferences through your browser settings.</p>

        <h2 class="text-2xl font-bold text-white mt-10 mb-4 pb-2 border-b border-white/10">5. Data Retention</h2>
        <p>We retain your data for as long as your account is active or as needed to provide services. If you close your account, we will delete or anonymize your data within a reasonable timeframe, unless required to retain it for legal or compliance purposes.</p>

        <h2 class="text-2xl font-bold text-white mt-10 mb-4 pb-2 border-b border-white/10">6. Data Security</h2>
        <p>We use access controls, account separation, encryption where applicable, and trusted infrastructure providers to help protect your information. While we take reasonable steps to secure your data, no system is completely secure. For more details, visit our <a href="/security.html" class="text-luxe-gold hover:underline">Security page</a>.</p>

        <h2 class="text-2xl font-bold text-white mt-10 mb-4 pb-2 border-b border-white/10">7. Your Rights</h2>
        <p>Depending on your location, you may have the right to:</p>
        <ul class="space-y-2 list-disc pl-5">
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Object to certain processing activities</li>
            <li>Request data portability</li>
        </ul>
        <p>To exercise any of these rights, contact us at <strong><a href="mailto:support@voxali.net" class="text-luxe-gold hover:underline">support@voxali.net</a></strong>.</p>

        <h2 class="text-2xl font-bold text-white mt-10 mb-4 pb-2 border-b border-white/10">8. International Data</h2>
        <p>If you are accessing Voxali from outside the regions where our infrastructure providers operate, your data may be transferred and processed in other jurisdictions. By using the platform, you acknowledge this transfer.</p>

        <h2 class="text-2xl font-bold text-white mt-10 mb-4 pb-2 border-b border-white/10">9. Children's Privacy</h2>
        <p>Voxali is not intended for use by individuals under the age of 16. We do not knowingly collect personal data from children.</p>

        <h2 class="text-2xl font-bold text-white mt-10 mb-4 pb-2 border-b border-white/10">10. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated date. Continued use of the platform after changes constitutes acceptance of the revised policy.</p>

        <h2 class="text-2xl font-bold text-white mt-10 mb-4 pb-2 border-b border-white/10">11. Contact Us</h2>
        <p>If you have questions about this Privacy Policy, contact us at: <strong><a href="mailto:support@voxali.net" class="text-luxe-gold hover:underline">support@voxali.net</a></strong></p>
        <p>For legal or compliance inquiries: <strong><a href="mailto:legal@voxali.net" class="text-luxe-gold hover:underline">legal@voxali.net</a></strong></p>
    </div>
`;

const termsBody = `
    <!-- HEADER SECTION -->
    <main class="relative pt-40 pb-16 px-6 text-center">
        <div class="max-w-4xl mx-auto animate-[slideUp_0.8s_ease-out]">
            <h1 class="text-4xl md:text-5xl font-black tracking-tight mb-6">
                Terms of Service
            </h1>
            <p class="text-lg text-luxe-muted font-medium mb-10">
                Last Updated: June 2025
            </p>
        </div>
    </main>

    <div class="container bg-luxe-charcoal border-white/5 rounded-2xl mx-auto mb-24 px-8 md:px-16 py-12 prose prose-invert prose-gold max-w-4xl">
        <p>Welcome to Voxali. These Terms of Service ("Terms") govern your use of the Voxali platform, website, and related services. By accessing or using Voxali, you agree to be bound by these Terms and our Privacy Policy. If you do not agree, do not use the Service.</p>

        <h2 class="text-2xl font-bold text-white mt-10 mb-4 pb-2 border-b border-white/10">1. About the Service</h2>
        <p>Voxali is a salon-focused software platform that provides AI-powered call handling, online booking, client management, reminders, deposits, and related tools for salons and spas.</p>

        <h2 class="text-2xl font-bold text-white mt-10 mb-4 pb-2 border-b border-white/10">2. Account Registration</h2>
        <p>To use Voxali, you must create an account and provide accurate, complete information. You are responsible for maintaining the security of your account credentials and for all activity under your account. You must notify us immediately if you become aware of any unauthorized access.</p>

        <h2 class="text-2xl font-bold text-white mt-10 mb-4 pb-2 border-b border-white/10">3. Subscription Plans and Billing</h2>
        <p>Voxali offers subscription plans with defined features and usage allowances, including AI call minutes, SMS credits, and email credits. By subscribing, you agree to pay the applicable monthly fee.</p>
        <p><strong>Overage Charges:</strong> If you exceed the usage limits included in your plan, you may be billed for additional usage at the rates listed on our Pricing page. Overage billing is handled through Stripe Metered Billing at the end of your billing cycle.</p>

        <h2 class="text-2xl font-bold text-white mt-10 mb-4 pb-2 border-b border-white/10">4. Cancellation and Refunds</h2>
        <p>You may cancel your subscription at any time from your account dashboard. Cancellation takes effect at the end of the current billing period. Voxali does not currently offer refunds for partial billing periods. If you believe you were billed in error, contact us at <a href="mailto:support@voxali.net" class="text-luxe-gold">support@voxali.net</a>.</p>

        <h2 class="text-2xl font-bold text-white mt-10 mb-4 pb-2 border-b border-white/10">5. Acceptable Use</h2>
        <p>You agree to use Voxali only for lawful purposes and in compliance with all applicable laws, including local telecommunications, messaging, and data protection regulations. You agree not to spam, harass, reverse-engineer, or impersonate using our platform.</p>

        <h2 class="text-2xl font-bold text-white mt-10 mb-4 pb-2 border-b border-white/10">6. Customer Data</h2>
        <p>You retain ownership of all salon and client data you enter into Voxali. We process this data solely to provide the service. You are responsible for ensuring you have appropriate consent to collect client data.</p>

        <h2 class="text-2xl font-bold text-white mt-10 mb-4 pb-2 border-b border-white/10">7. Third-Party Services</h2>
        <p>We utilize Twilio, ElevenLabs, Stripe, and Supabase. Your use of these features is subject to their respective terms.</p>

        <h2 class="text-2xl font-bold text-white mt-10 mb-4 pb-2 border-b border-white/10">8. AI Receptionist Tools</h2>
        <p>You acknowledge that AI responses may not be perfect, and you are responsible for monitoring booking activity. Communication tools must comply with local laws. Call transcripts are not currently available.</p>

        <h2 class="text-2xl font-bold text-white mt-10 mb-4 pb-2 border-b border-white/10">9. Intellectual Property</h2>
        <p>All Voxali branding and technology are owned by Voxali. You may not copy or redistribute any part without permission.</p>

        <h2 class="text-2xl font-bold text-white mt-10 mb-4 pb-2 border-b border-white/10">10. Service Availability & Liability</h2>
        <p>We aim for reliable service but do not guarantee uninterrupted uptime. To the maximum extent permitted by law, Voxali shall not be liable for indirect damages, lost revenue, missed appointments, or communication failures.</p>

        <h2 class="text-2xl font-bold text-white mt-10 mb-4 pb-2 border-b border-white/10">11. Contact Us</h2>
        <p>Legal inquiries: <strong><a href="mailto:legal@voxali.net" class="text-luxe-gold hover:underline">legal@voxali.net</a></strong></p>
    </div>
`;


const customStyleBase = `<style>
.container {
    max-width: 800px;
    margin: 4rem auto;
    padding: 2rem;
    background-color: var(--bg-surface, #1E1E1E);
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.05);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    color: #A1A1AA;
}
h1 { color: #D4AF37; font-size: 2.5rem; margin-bottom: 0.5rem; font-weight: 900;}
h2 { font-size: 1.5rem; margin-top: 2.5rem; margin-bottom: 1rem; color: #ffffff; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem; font-weight: 700;}
.last-updated { color: #A1A1AA; font-size: 0.9rem; margin-bottom: 2.5rem; }
p { margin-bottom: 1rem; }
li { margin-bottom: 0.5rem; }
ul { padding-left: 1.5rem; list-style-type: disc; margin-bottom: 1rem; }
</style>`;


function rebuildPage(filename, title, bodyStr) {
    const filePath = path.join(__dirname, filename);
    const headRendered = HEAD_CONTENT.replace('__TITLE__', title + ' | Voxali').replace('__DESC__', 'Voxali the ultimate AI salon booking platform.');
    
    // Add custom style specifically for these two
    let finalHead = headRendered.replace('</head>', `${customStyleBase}\n</head>`);
    
    const finalHtml = `<!DOCTYPE html>
<html lang="en">
${finalHead}
<body>
    ${NAV_CONTENT}
    ${bodyStr}
    ${FOOTER_CONTENT}
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
</body>
</html>`;

    fs.writeFileSync(filePath, finalHtml);
    console.log('Rebuilt', filename);
}

// 1. Rebuild Privacy and Terms completely from scratch using layouts to fix any corruption
rebuildPage('privacy.html', 'Privacy Policy', privacyBody);
rebuildPage('terms.html', 'Terms of Service', termsBody);

// 2. Global replacements for ALL files
const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.html'));
files.forEach(file => {
    let content = fs.readFileSync(path.join(__dirname, file), 'utf8');

    // Email replacements
    content = content.replace(/@voxali\.com/g, '@voxali.net');

    // Specific Page Edits
    if (file === 'pricing.html') {
        content = content.replace(/2,000 AI Coins/g, '2,000 AI Coins (≈100 AI Mins or 400 SMS)');
        content = content.replace(/5,000 AI Coins/g, '5,000 AI Coins (≈250 AI Mins or 1,000 SMS)');
        content = content.replace(/10,000 AI Coins/g, '10,000 AI Coins (≈500 AI Mins or 2,000 SMS)');
        if (!content.includes('AI Coins are used for')) {
            content = content.replace('Choose the plan that fits', 'Choose the plan that fits your salon. AI Coins are used for AI receptionist minutes and SMS reminders, giving you ultimate flexibility.');
        }
    }

    if (file === 'features.html') {
        content = content.replace('Everything you need to run a $1M salon.', 'Everything you need to manage your salon\'s front desk and operations.');
    }

    if (file === 'markets.html') {
        content = content.replace('Stripe-certified', 'Stripe-supported');
    }

    if (file === 'demo.html') {
        content = content.replace(/world's most advanced AI voice agent designed specifically for salons/ig, 'Hear how Bella handles real salon booking calls, rescheduling, and client questions');
        
        if (!content.includes('What this demo shows:')) {
            content = content.replace('</div>\n            </div>\n\n            <div class="mt-16">', 
            `</div>
            
            <div class="mt-12 text-left bg-black/30 p-8 rounded-xl border border-white/5">
                <h4 class="text-lg font-bold text-white mb-4">What this demo shows:</h4>
                <ul class="space-y-3 text-luxe-muted">
                    <li class="flex items-center gap-2"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg> New appointment booking</li>
                    <li class="flex items-center gap-2"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg> Checking staff availability</li>
                    <li class="flex items-center gap-2"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg> Negotiating time slots</li>
                    <li class="flex items-center gap-2"><svg class="w-5 h-5 text-luxe-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg> Collecting client details securely</li>
                </ul>
            </div>
            </div>

            <div class="mt-16">`);
        }
        content = content.replace('href="/contact.html"', 'href="/contact.html#demo"');
    }

    if (file === 'about.html') {
        if (!content.includes('Ready to modernize')) {
            content = content.replace('</section>\n', `</section>
            
            <section class="max-w-4xl mx-auto py-16 px-6 text-center">
                <div class="glass-card p-12 rounded-2xl border-t-2 border-luxe-gold">
                    <h2 class="text-3xl font-bold text-white mb-6">Ready to modernize your salon front desk?</h2>
                    <p class="text-luxe-muted mb-8">Join the elite salons stepping into the future with AI automation.</p>
                    <div class="flex justify-center gap-4">
                        <a href="/pricing.html" class="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-all">See Pricing</a>
                        <a href="/demo.html" class="px-6 py-3 bg-gradient-gold hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] text-black font-bold rounded-xl transition-all">Listen to Demo</a>
                    </div>
                </div>
            </section>\n`);
        }
    }

    if (file === 'faq.html') {
        if (!content.includes('Which countries do you support')) {
            content = content.replace('Are you accepting Beta users?', `Are you accepting Beta users?`); // anchor point
            
            // Add the 9 new FAQs right before the final closing div
            const newFaqs = `
            <!-- FAQ 6 -->
            <div class="glass-card rounded-2xl p-6 text-left group">
                <h3 class="text-lg font-bold text-white mb-3 group-hover:text-luxe-gold transition-colors flex items-center gap-3">
                    <span class="text-luxe-gold">06.</span> Which countries do you support?
                </h3>
                <p class="text-luxe-muted pl-9">Voxali is available for salons in Stripe-supported countries including the US, UK, Canada, and Australia.</p>
            </div>
            <!-- FAQ 7 -->
            <div class="glass-card rounded-2xl p-6 text-left group">
                <h3 class="text-lg font-bold text-white mb-3 group-hover:text-luxe-gold transition-colors flex items-center gap-3">
                    <span class="text-luxe-gold">07.</span> Does Bella support multiple languages?
                </h3>
                <p class="text-luxe-muted pl-9">Yes. Bella can communicate in multiple languages, making it easier for salons to serve diverse clients.</p>
            </div>
            <!-- FAQ 8 -->
            <div class="glass-card rounded-2xl p-6 text-left group">
                <h3 class="text-lg font-bold text-white mb-3 group-hover:text-luxe-gold transition-colors flex items-center gap-3">
                    <span class="text-luxe-gold">08.</span> Are call recordings available?
                </h3>
                <p class="text-luxe-muted pl-9">Expanded call recording features are planned for future releases.</p>
            </div>
            <!-- FAQ 9 -->
            <div class="glass-card rounded-2xl p-6 text-left group">
                <h3 class="text-lg font-bold text-white mb-3 group-hover:text-luxe-gold transition-colors flex items-center gap-3">
                    <span class="text-luxe-gold">09.</span> Are transcripts available?
                </h3>
                <p class="text-luxe-muted pl-9">Call transcripts are not currently part of the platform.</p>
            </div>
            <!-- FAQ 10 -->
            <div class="glass-card rounded-2xl p-6 text-left group">
                <h3 class="text-lg font-bold text-white mb-3 group-hover:text-luxe-gold transition-colors flex items-center gap-3">
                    <span class="text-luxe-gold">10.</span> Does Voxali support multiple locations?
                </h3>
                <p class="text-luxe-muted pl-9">Not yet. Multi-location support is planned for a future release.</p>
            </div>
            <!-- FAQ 11 -->
            <div class="glass-card rounded-2xl p-6 text-left group">
                <h3 class="text-lg font-bold text-white mb-3 group-hover:text-luxe-gold transition-colors flex items-center gap-3">
                    <span class="text-luxe-gold">11.</span> What payment methods do you accept?
                </h3>
                <p class="text-luxe-muted pl-9">Voxali uses Stripe for all payments and deposits. You can accept major credit cards, Apple Pay, and Google Pay.</p>
            </div>
            <!-- FAQ 12 -->
            <div class="glass-card rounded-2xl p-6 text-left group">
                <h3 class="text-lg font-bold text-white mb-3 group-hover:text-luxe-gold transition-colors flex items-center gap-3">
                    <span class="text-luxe-gold">12.</span> Is my salon data secure?
                </h3>
                <p class="text-luxe-muted pl-9">Yes. We use access controls, account separation, and trusted infrastructure providers to help protect your data. Learn more on our Security page.</p>
            </div>
            <!-- FAQ 13 -->
            <div class="glass-card rounded-2xl p-6 text-left group">
                <h3 class="text-lg font-bold text-white mb-3 group-hover:text-luxe-gold transition-colors flex items-center gap-3">
                    <span class="text-luxe-gold">13.</span> What is white-glove onboarding?
                </h3>
                <p class="text-luxe-muted pl-9">Growth and Enterprise plan customers receive hands-on setup support including service configuration, staff setup, reminder settings, and call forwarding assistance.</p>
            </div>
            <!-- FAQ 14 -->
            <div class="glass-card rounded-2xl p-6 text-left group">
                <h3 class="text-lg font-bold text-white mb-3 group-hover:text-luxe-gold transition-colors flex items-center gap-3">
                    <span class="text-luxe-gold">14.</span> Can I upgrade my plan later?
                </h3>
                <p class="text-luxe-muted pl-9">Yes. You can upgrade anytime from your dashboard.</p>
            </div>`;
            content = content.replace('</div>\n        </div>\n    </section>', newFaqs + '\n        </div>\n    </section>');
        }
    }



    if (file === 'index.html') {
         if (!content.includes('Trusted by salons in 4 countries')) {
             content = content.replace('<!-- HERO -->', `<!-- HERO -->
    <div class="absolute inset-0 bg-black/80 lg:hidden"></div>`);
             content = content.replace('built specifically for hair salons and spas.', 'built specifically for hair salons and spas.</p><div class="flex flex-col items-center sm:flex-row gap-2 mt-4 text-sm font-bold text-white/90 bg-white/5 px-4 py-2 rounded-full border border-white/10 mx-auto w-fit">✨ Trusted by salons in 4 countries</div>\n            <p');
         }
    }

    // Apply Schema JSON-LD globally to all pages
    if (!content.includes('application/ld+json')) {
        const schema = `
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
</head>`;
        content = content.replace('</head>', schema);
    }

    fs.writeFileSync(path.join(__dirname, file), content);
});
console.log("Successfully ran GPT Fixes script!");
