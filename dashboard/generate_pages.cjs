const fs = require('fs');
const path = require('path');
const { HEAD_CONTENT, FOOTER_CONTENT } = require('./layout_template.cjs');

function generatePage(filename, title, desc, bodyContent) {
    const head = HEAD_CONTENT.replace('__TITLE__', title).replace('__DESC__', desc);
    const content = head + bodyContent + FOOTER_CONTENT;
    fs.writeFileSync(path.join(__dirname, filename), content);
    console.log(`Generated ${filename}`);
}

const aboutBody = `
    <!-- HEADER SECTION -->
    <main class="relative pt-40 pb-16 px-6 text-center">
        <div class="max-w-4xl mx-auto animate-[slideUp_0.8s_ease-out]">
            <h1 class="text-4xl md:text-5xl font-black tracking-tight mb-6">
                Built to help salons book more clients with less front-desk stress
            </h1>
            <p class="text-xl text-white/80 font-medium mb-10">
                Voxali is a salon-focused software platform designed to reduce missed calls, automate appointment handling, and simplify day-to-day operations.
            </p>
            <p class="text-lg text-luxe-muted font-medium mb-10">
                We combine an AI receptionist, online booking, reminders, payments, and client management into one system built for modern salons and spas.
            </p>
            <div class="flex items-center justify-center gap-4">
                <a href="/pricing.html" class="px-8 py-4 glass-card text-white font-bold rounded-xl text-lg hover:bg-white/5 transition-all">See Pricing</a>
                <a href="/contact.html" class="px-8 py-4 bg-gradient-gold text-black font-bold rounded-xl text-lg hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] transition-all">Book a Demo</a>
            </div>
        </div>
    </main>

    <!-- CONTENT SECTIONS -->
    <section class="py-20 px-6 border-t border-white/5">
        <div class="max-w-4xl mx-auto space-y-20">
            <div>
                <h3 class="text-luxe-gold text-sm font-bold tracking-widest uppercase mb-4">Our Mission</h3>
                <h2 class="text-3xl font-black mb-6">We help salons stay responsive, organized, and ready to grow</h2>
                <p class="text-luxe-muted text-lg mb-4">Salons lose revenue every time a call goes unanswered, a client forgets an appointment, or staff are too busy to manage the front desk efficiently.</p>
                <p class="text-luxe-muted text-lg mb-4">Voxali was built to solve that problem.</p>
                <p class="text-luxe-muted text-lg">Our goal is simple: give salons a smarter way to manage calls, bookings, reminders, deposits, and client relationships without relying on disconnected tools or constant manual work.</p>
            </div>

            <div>
                <h3 class="text-luxe-gold text-sm font-bold tracking-widest uppercase mb-4">What Voxali Does</h3>
                <h2 class="text-3xl font-black mb-6">One platform for your salon's front desk and operations</h2>
                <p class="text-luxe-muted text-lg mb-6">With Voxali, salons can:</p>
                <ul class="text-luxe-muted text-lg space-y-3 list-disc pl-6">
                    <li>Answer booking calls with an AI receptionist</li>
                    <li>Handle appointment scheduling, rescheduling, and cancellations</li>
                    <li>Let clients book online</li>
                    <li>Send email reminders automatically</li>
                    <li>Send SMS reminders on AI plans</li>
                    <li>Collect deposits through Stripe</li>
                    <li>Manage staff calendars and client records</li>
                    <li>Track bookings, revenue, and salon activity from one dashboard</li>
                </ul>
            </div>

            <div>
                <h3 class="text-luxe-gold text-sm font-bold tracking-widest uppercase mb-4">Built for Salon Teams</h3>
                <h2 class="text-3xl font-black mb-6">Designed for busy salons and spas</h2>
                <p class="text-luxe-muted text-lg mb-6">Voxali is built for salons that want to:</p>
                <ul class="text-luxe-muted text-lg space-y-3 list-disc pl-6 mb-6">
                    <li>reduce missed calls</li>
                    <li>improve booking speed</li>
                    <li>cut down on front-desk pressure</li>
                    <li>reduce no-shows with reminders</li>
                    <li>keep client and staff information organized</li>
                    <li>replace multiple salon tools with one system</li>
                </ul>
                <p class="text-luxe-muted text-lg">Whether you run a small salon or a growing team, Voxali helps you stay available to clients without adding more chaos to your day.</p>
            </div>

            <div>
                <h3 class="text-luxe-gold text-sm font-bold tracking-widest uppercase mb-4">How We Support Your Setup</h3>
                <h2 class="text-3xl font-black mb-6">Simple setup for smaller teams, white-glove onboarding for larger ones</h2>
                <p class="text-luxe-muted text-lg mb-4">Getting started with Voxali is straightforward. You can set up your salon details, services, staff members, and hours quickly. Higher-tier plans include more hands-on support.</p>
                <p class="text-luxe-muted text-lg mb-4"><strong>Setup support includes:</strong></p>
                <ul class="text-luxe-muted text-lg space-y-3 list-disc pl-6">
                    <li>adding business hours</li>
                    <li>setting staff and services</li>
                    <li>configuring reminders</li>
                    <li>connecting payments</li>
                    <li>setting up call forwarding</li>
                    <li>helping Growth and Enterprise customers with white-glove onboarding</li>
                </ul>
            </div>

             <div>
                <h3 class="text-luxe-gold text-sm font-bold tracking-widest uppercase mb-4">Languages and Availability</h3>
                <h2 class="text-3xl font-black mb-6">Built for salons serving diverse clients</h2>
                <p class="text-luxe-muted text-lg mb-4">Voxali supports multiple languages, making it easier for salons to serve a wider client base.</p>
                <p class="text-luxe-muted text-lg mb-4">We are focused on businesses operating in Stripe-supported markets, including countries such as:</p>
                <ul class="text-luxe-muted text-lg space-y-3 list-disc pl-6">
                    <li>United States</li>
                    <li>United Kingdom</li>
                    <li>Canada</li>
                    <li>Australia</li>
                    <li>and other eligible regions</li>
                </ul>
            </div>

            <div>
                <h3 class="text-luxe-gold text-sm font-bold tracking-widest uppercase mb-4">Why Voxali</h3>
                <h2 class="text-3xl font-black mb-6">Why salons choose Voxali</h2>
                <ul class="text-luxe-muted text-lg space-y-3 list-disc pl-6">
                    <li>AI receptionist built for salon workflows</li>
                    <li>Booking, reminders, CRM, and payments in one platform</li>
                    <li>Email reminders included in all plans</li>
                    <li>SMS reminders included in AI plans</li>
                    <li>Supports call forwarding from your existing salon number</li>
                    <li>White-glove onboarding available for Growth and Enterprise plans</li>
                    <li>Built for modern salons in Stripe-supported markets</li>
                </ul>
            </div>
        </div>
    </section>

    <!-- BOTTOM CTA -->
    <section class="py-24 px-6 relative overflow-hidden border-t border-white/5">
        <div class="absolute inset-0 bg-gradient-gold opacity-5"></div>
        <div class="max-w-4xl mx-auto text-center relative z-10 glass-card p-12 rounded-3xl border-luxe-gold/20 shadow-[0_0_50px_rgba(212,175,55,0.05)]">
            <h2 class="text-3xl md:text-5xl font-black mb-6">Ready to modernize your salon front desk?</h2>
            <p class="text-lg text-luxe-muted mb-10">See how Voxali can help your salon answer more calls, manage bookings faster, and reduce manual work.</p>
            <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a href="/pricing.html" class="px-8 py-4 glass-card text-white font-bold rounded-xl text-lg hover:bg-white/5 transition-all w-full sm:w-auto">See Pricing</a>
                <a href="/contact.html" class="px-8 py-4 bg-gradient-gold text-black font-bold rounded-xl text-lg hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] transition-all w-full sm:w-auto">Book a Demo</a>
            </div>
        </div>
    </section>
`;

const contactBody = `
    <!-- HEADER SECTION -->
    <main class="relative pt-40 pb-16 px-6 text-center">
        <div class="max-w-3xl mx-auto animate-[slideUp_0.8s_ease-out]">
            <h1 class="text-4xl md:text-6xl font-black tracking-tight mb-6">
                Contact <span class="text-gradient">Voxali</span>
            </h1>
            <p class="text-lg text-luxe-muted font-medium mb-10">
                Have questions about plans, setup, or how Voxali works for your salon? We’re here to help. Whether you want pricing details, onboarding help, or a product walkthrough, contact our team and we’ll point you in the right direction.
            </p>
        </div>
    </main>

    <!-- CONTACT OPTIONS -->
    <section class="py-12 px-6">
        <div class="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="glass-card p-8 rounded-2xl text-center border-t-4 border-t-blue-500/50">
                <h3 class="text-xl font-bold text-white mb-2">Sales</h3>
                <p class="text-sm text-luxe-muted mb-6 h-10">For pricing questions, demos, and plan recommendations.</p>
                <a href="mailto:sales@voxali.net" class="text-blue-400 font-bold hover:underline">sales@voxali.net</a>
            </div>
            <div class="glass-card p-8 rounded-2xl text-center border-t-4 border-t-luxe-gold/50">
                <h3 class="text-xl font-bold text-white mb-2">Support</h3>
                <p class="text-sm text-luxe-muted mb-6 h-10">For account help, setup questions, and product support.</p>
                <a href="mailto:support@voxali.net" class="text-luxe-gold font-bold hover:underline">support@voxali.net</a>
            </div>
            <div class="glass-card p-8 rounded-2xl text-center border-t-4 border-t-purple-500/50">
                <h3 class="text-xl font-bold text-white mb-2">Legal</h3>
                <p class="text-sm text-luxe-muted mb-6 h-10">For privacy, compliance, or legal inquiries.</p>
                <a href="mailto:legal@voxali.net" class="text-purple-400 font-bold hover:underline">legal@voxali.net</a>
            </div>
        </div>
    </section>

    <!-- DEMO REQUEST -->
    <section class="py-20 px-6 border-t border-white/5">
        <div class="max-w-4xl mx-auto text-center">
            <h2 class="text-3xl md:text-4xl font-black mb-6">Want to see Voxali in action?</h2>
            <p class="text-lg text-luxe-muted mb-10 max-w-2xl mx-auto">If you'd like a closer look at how our AI receptionist, booking tools, reminders, and CRM work together, request a demo and we'll help you understand which plan fits your salon best.</p>
            <a href="mailto:sales@voxali.net?subject=Demo%20Request" class="inline-block px-8 py-4 bg-gradient-gold text-black font-bold rounded-xl text-lg hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] transition-all">Book a Demo</a>
            
            <p class="text-sm text-white/50 mt-12 max-w-xl mx-auto border-t border-white/10 pt-8">
                <strong>Regions We Serve:</strong> Voxali is focused on salons and spas in Stripe-supported countries, including the US, UK, Canada, Australia, and other eligible regions.
            </p>
        </div>
    </section>
`;

const securityBody = `
    <main class="relative pt-40 pb-16 px-6 text-center">
        <div class="max-w-3xl mx-auto animate-[slideUp_0.8s_ease-out]">
            <h1 class="text-4xl md:text-5xl font-black tracking-tight mb-6">
                Security and Data Protection
            </h1>
            <p class="text-lg text-luxe-muted font-medium mb-10">
                Voxali is built to help salons manage bookings, reminders, payments, and client information with confidence. We take platform security seriously.
            </p>
        </div>
    </main>

    <section class="py-12 px-6 border-t border-white/5">
        <div class="max-w-4xl mx-auto space-y-16">
            <div>
                <h3 class="text-luxe-gold text-sm font-bold tracking-widest uppercase mb-4">Security Principles</h3>
                <h2 class="text-2xl font-bold mb-4">How we approach security</h2>
                <ul class="text-luxe-muted text-base space-y-3 list-disc pl-6">
                    <li>Protecting salon and client information</li>
                    <li>Limiting access to authorized users</li>
                    <li>Using trusted providers for core infrastructure</li>
                    <li>Reducing unnecessary exposure of sensitive data</li>
                    <li>Maintaining clear operational controls as the platform grows</li>
                </ul>
            </div>

             <div>
                <h3 class="text-luxe-gold text-sm font-bold tracking-widest uppercase mb-4">Account and Access Controls</h3>
                <h2 class="text-2xl font-bold mb-4">Controlled access to your data</h2>
                <p class="text-luxe-muted text-base mb-4">Voxali is designed so that salon data is only accessible to authorized account users and approved staff within the salon account.</p>
                <ul class="text-luxe-muted text-base space-y-3 list-disc pl-6">
                    <li>Account-level separation</li>
                    <li>Role-based access where supported</li>
                    <li>Controlled internal access</li>
                    <li>Secure handling of operational data</li>
                </ul>
            </div>

            <div>
                <h3 class="text-luxe-gold text-sm font-bold tracking-widest uppercase mb-4">Payments</h3>
                <h2 class="text-2xl font-bold mb-4">Secure payment processing</h2>
                <p class="text-luxe-muted text-base">Payments and deposits are handled through <strong>Stripe</strong>, a trusted global payment provider. Voxali does not replace Stripe's payment security standards. Instead, we rely on Stripe for secure payment handling and transaction processing.</p>
            </div>

            <div>
                <h3 class="text-luxe-gold text-sm font-bold tracking-widest uppercase mb-4">Communications Infrastructure</h3>
                <h2 class="text-2xl font-bold mb-4">Trusted communication providers</h2>
                <p class="text-luxe-muted text-base mb-4">Voxali uses trusted third-party communication infrastructure to power features such as:</p>
                <ul class="text-luxe-muted text-base space-y-3 list-disc pl-6">
                    <li>call handling</li>
                    <li>AI-powered voice reception</li>
                    <li>reminders and communication workflows</li>
                </ul>
            </div>

            <div>
                <h3 class="text-luxe-gold text-sm font-bold tracking-widest uppercase mb-4">Data Handling</h3>
                <h2 class="text-2xl font-bold mb-4">Client and salon data</h2>
                <p class="text-luxe-muted text-base mb-4">Voxali may process information such as salon business details, staff availability, services, client appointments, and reminder activity. We aim to handle this information responsibly and only as needed to provide the service.</p>
            </div>

            <div>
                <h3 class="text-luxe-gold text-sm font-bold tracking-widest uppercase mb-4">Call Data</h3>
                <h2 class="text-2xl font-bold mb-4">Voice features and future enhancements</h2>
                <p class="text-luxe-muted text-base">Voxali supports AI-powered call handling. Some advanced voice insight features, including expanded call recording tools, may be introduced in future releases. At this time, call transcripts are not part of the platform offering.</p>
            </div>

             <div>
                <p class="text-sm text-white/50 border-t border-white/10 pt-6 mt-8">
                    If you have questions about security, privacy, or responsible data handling, contact us at: <strong>legal@voxali.net</strong>
                </p>
            </div>
        </div>
    </section>
`;


const complianceBody = `
    <main class="relative pt-40 pb-16 px-6 text-center">
        <div class="max-w-3xl mx-auto animate-[slideUp_0.8s_ease-out]">
            <h1 class="text-4xl md:text-5xl font-black tracking-tight mb-6">
                Compliance and Platform Use
            </h1>
            <p class="text-lg text-luxe-muted font-medium mb-10">
                Learn about Voxali's compliance approach for salon communications, reminders, calling workflows, and lawful platform usage in supported markets.
            </p>
        </div>
    </main>

    <section class="py-12 px-6 border-t border-white/5">
        <div class="max-w-4xl mx-auto space-y-16">
            
            <div>
                <h3 class="text-luxe-gold text-sm font-bold tracking-widest uppercase mb-4">Supported Markets</h3>
                <h2 class="text-2xl font-bold mb-4">Built for Stripe-supported regions</h2>
                <p class="text-luxe-muted text-base mb-4">Voxali is focused on businesses operating in Stripe-supported countries, including markets such as United States, United Kingdom, Canada, Australia, and other eligible regions. Service availability may vary depending on local payment, messaging, and telephony requirements.</p>
            </div>

             <div>
                <h3 class="text-luxe-gold text-sm font-bold tracking-widest uppercase mb-4">Customer Responsibility</h3>
                <h2 class="text-2xl font-bold mb-4">Salon owners are responsible for lawful communication practices</h2>
                <p class="text-luxe-muted text-base mb-4">When using Voxali for reminders, calls, deposits, or customer communication, each salon is responsible for following the laws and regulations that apply in its region. This may include requirements related to:</p>
                <ul class="text-luxe-muted text-base space-y-3 list-disc pl-6">
                    <li>customer consent</li>
                    <li>reminder messaging</li>
                    <li>promotional messaging</li>
                    <li>calling rules</li>
                    <li>call recording rules</li>
                    <li>data privacy obligations</li>
                </ul>
            </div>

            <div>
                <h3 class="text-luxe-gold text-sm font-bold tracking-widest uppercase mb-4">SMS and Reminder Compliance</h3>
                <h2 class="text-2xl font-bold mb-4">Reminder tools should be used with proper consent</h2>
                <p class="text-luxe-muted text-base mb-4">Voxali supports reminder workflows, including email reminders in all plans and SMS reminders in AI plans. Salon owners should make sure they have any permissions or consent required under local law before sending promotional or reminder communications.</p>
            </div>

            <div>
                <h3 class="text-luxe-gold text-sm font-bold tracking-widest uppercase mb-4">Calling and AI Reception</h3>
                <h2 class="text-2xl font-bold mb-4">Voice workflows should follow local telephony requirements</h2>
                <p class="text-luxe-muted text-base mb-4">Voxali supports AI-powered call handling for appointment bookings, rescheduling, cancellations, and general salon FAQs. Depending on your region, you may be responsible for:</p>
                <ul class="text-luxe-muted text-base space-y-3 list-disc pl-6">
                    <li>complying with local telephony rules</li>
                    <li>informing customers where required</li>
                    <li>obtaining consent if call recording is ever used</li>
                    <li>following local communication disclosure standards</li>
                </ul>
            </div>

            <div>
                <h3 class="text-luxe-gold text-sm font-bold tracking-widest uppercase mb-4">Product Availability Notes</h3>
                <h2 class="text-2xl font-bold mb-4">Current feature status</h2>
                <ul class="text-luxe-muted text-base space-y-3 list-disc pl-6">
                    <li>Email reminders are available in all plans</li>
                    <li>SMS reminders are available in AI plans</li>
                    <li>Call forwarding from your existing number is supported</li>
                    <li>Multi-location support is not currently available</li>
                    <li>Call transcripts are not currently available</li>
                    <li>Expanded call recording features are planned for future releases</li>
                </ul>
            </div>

            <div>
                <p class="text-sm text-white/50 border-t border-white/10 pt-6 mt-8">
                    For legal, privacy, or compliance-related questions, contact: <strong>legal@voxali.net</strong>
                </p>
            </div>
        </div>
    </section>
`;

generatePage('about.html', 'About Voxali | AI Receptionist and Salon Software', 'Learn about Voxali, the salon-focused platform that combines an AI receptionist, booking software, reminders, payments, and CRM in one system.', aboutBody);
generatePage('contact.html', 'Contact Voxali | Sales, Support, and Demo Requests', 'Get in touch with Voxali for sales questions, support, demos, and general inquiries about our AI receptionist and salon software platform.', contactBody);
generatePage('security.html', 'Security | Voxali Data Protection and Platform Security', 'Learn how Voxali helps protect salon and client data through secure infrastructure, controlled access, and trusted payment and communication providers.', securityBody);
generatePage('compliance.html', 'Compliance | Voxali Legal and Communication Compliance', 'Learn about Voxali’s compliance approach for salon communications, reminders, calling workflows, and lawful platform usage in supported markets.', complianceBody);
