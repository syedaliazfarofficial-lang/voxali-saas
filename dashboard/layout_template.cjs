const NAV_CONTENT = `
    <!-- NAVBAR -->
    <nav class="fixed top-0 w-full z-50 glass-nav transition-all duration-300 py-4 px-6 md:px-12">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
            <a href="/index.html" class="text-2xl font-black tracking-widest text-white flex items-center gap-2">
                <span class="text-gradient">VOXALI</span>
            </a>
            
            <!-- Desktop Nav -->
            <div class="hidden md:flex items-center gap-8">
                <a href="/index.html" class="text-sm font-medium text-white transition-colors">Home</a>
                <a href="/features.html" class="text-sm font-medium text-luxe-muted hover:text-white transition-colors">Features</a>
                <a href="/pricing.html" class="text-sm font-medium text-luxe-muted hover:text-white transition-colors">Pricing</a>
                <a href="/how-it-works.html" class="text-sm font-medium text-luxe-muted hover:text-white transition-colors">How it Works</a>
                <a href="/about.html" class="text-sm font-medium text-luxe-muted hover:text-white transition-colors">About</a>
                <a href="/contact.html" class="text-sm font-medium text-luxe-muted hover:text-white transition-colors">Contact</a>
            </div>

            <div class="flex items-center gap-3">
                <a href="/app/" class="hidden md:block text-sm font-semibold text-white border border-white/10 hover:border-white/30 px-5 py-2.5 rounded-lg transition-all">
                    Sign In
                </a>
                <a href="/pricing.html" class="text-sm font-bold text-black bg-gradient-gold px-5 py-2.5 rounded-lg hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all">
                    Get Started
                </a>
                <!-- Mobile Hamburger -->
                <button id="hamburger-btn" onclick="toggleMobileMenu()" class="md:hidden flex flex-col gap-1.5 p-2 rounded-lg hover:bg-white/10 transition-all" aria-label="Open Menu">
                    <span class="w-6 h-0.5 bg-white rounded-full transition-all" id="ham-1"></span>
                    <span class="w-6 h-0.5 bg-white rounded-full transition-all" id="ham-2"></span>
                    <span class="w-4 h-0.5 bg-white rounded-full transition-all" id="ham-3"></span>
                </button>
            </div>
        </div>

        <!-- Mobile Menu Drawer -->
        <div id="mobile-menu" class="hidden flex-col gap-2 pt-4 pb-6 border-t border-white/10 mt-4 bg-luxe-charcoal absolute left-0 w-full px-6">
            <a href="/index.html" class="block py-3 px-4 text-sm font-semibold text-white rounded-lg hover:bg-white/5 transition-all">Home</a>
            <a href="/features.html" class="block py-3 px-4 text-sm font-medium text-luxe-muted hover:text-white rounded-lg hover:bg-white/5 transition-all">Features</a>
            <a href="/pricing.html" class="block py-3 px-4 text-sm font-medium text-luxe-muted hover:text-white rounded-lg hover:bg-white/5 transition-all">Pricing</a>
            <a href="/how-it-works.html" class="block py-3 px-4 text-sm font-medium text-luxe-muted hover:text-white rounded-lg hover:bg-white/5 transition-all">How it Works</a>
            <a href="/about.html" class="block py-3 px-4 text-sm font-medium text-luxe-muted hover:text-white rounded-lg hover:bg-white/5 transition-all">About</a>
            <a href="/contact.html" class="block py-3 px-4 text-sm font-medium text-luxe-muted hover:text-white rounded-lg hover:bg-white/5 transition-all">Contact</a>
            <div class="mt-3 pt-3 border-t border-white/10 flex gap-3 px-4">
                <a href="/app/" class="flex-1 text-center text-sm font-semibold text-white border border-white/10 px-4 py-2.5 rounded-lg">Sign In</a>
                <a href="/pricing.html" class="flex-1 text-center text-sm font-bold text-black bg-gradient-gold px-4 py-2.5 rounded-lg">Get Started</a>
            </div>
        </div>
    </nav>
`;

const FOOTER_CONTENT = `
    <!-- FOOTER -->
    <footer class="border-t border-white/5 py-16 px-6 bg-luxe-charcoal mt-10">
        <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10 lg:gap-6 mb-12">
            <!-- Brand -->
            <div class="lg:col-span-2">
                <span class="text-2xl font-black tracking-wider text-gradient block mb-4">VOXALI</span>
                <p class="text-sm text-luxe-muted w-3/4 leading-relaxed mb-6">Built to help salons book more clients with less front-desk stress. Your 24/7 AI Receptionist & CRM.</p>
                <a href="/app/" class="inline-block text-sm font-bold text-white border border-white/20 hover:border-white/50 px-5 py-2.5 rounded-lg transition-all">Sign In to Dashboard</a>
            </div>
            
            <!-- Product -->
            <div>
                <h4 class="text-white font-bold mb-4 uppercase text-xs tracking-wider">Product</h4>
                <div class="flex flex-col gap-3 text-sm text-luxe-muted font-medium">
                    <a href="/features.html" class="hover:text-luxe-gold transition-colors w-fit">Features</a>
                    <a href="/how-it-works.html" class="hover:text-luxe-gold transition-colors w-fit">How It Works</a>
                    <a href="/pricing.html" class="hover:text-luxe-gold transition-colors w-fit">Pricing</a>
                    <a href="/demo.html" class="hover:text-luxe-gold transition-colors w-fit">Demo</a>
                </div>
            </div>

            <!-- Company -->
            <div>
                <h4 class="text-white font-bold mb-4 uppercase text-xs tracking-wider">Company</h4>
                <div class="flex flex-col gap-3 text-sm text-luxe-muted font-medium">
                    <a href="/about.html" class="hover:text-luxe-gold transition-colors w-fit">About</a>
                    <a href="/contact.html" class="hover:text-luxe-gold transition-colors w-fit">Contact</a>
                </div>
            </div>

            <!-- Resources -->
            <div>
                <h4 class="text-white font-bold mb-4 uppercase text-xs tracking-wider">Resources</h4>
                <div class="flex flex-col gap-3 text-sm text-luxe-muted font-medium">
                    <a href="/faq.html" class="hover:text-luxe-gold transition-colors w-fit">FAQ</a>
                    <a href="/markets.html" class="hover:text-luxe-gold transition-colors w-fit">Supported Markets</a>
                    <a href="/setup-guide.html" class="hover:text-luxe-gold transition-colors w-fit">Setup Guide</a>
                </div>
            </div>

            <!-- Legal & Contact -->
            <div>
                <h4 class="text-white font-bold mb-4 uppercase text-xs tracking-wider">Legal</h4>
                <div class="flex flex-col gap-3 text-sm text-luxe-muted font-medium">
                    <a href="/privacy.html" class="hover:text-luxe-gold transition-colors w-fit">Privacy Policy</a>
                    <a href="/terms.html" class="hover:text-luxe-gold transition-colors w-fit">Terms of Service</a>
                    <a href="/security.html" class="hover:text-luxe-gold transition-colors w-fit">Security</a>
                    <a href="/compliance.html" class="hover:text-luxe-gold transition-colors w-fit">Compliance</a>
                </div>
                <div class="mt-6">
                    <a href="mailto:support@voxali.net" class="text-sm text-luxe-gold hover:text-white transition-colors block mb-1">support@voxali.net</a>
                    <a href="mailto:sales@voxali.net" class="text-sm text-luxe-gold hover:text-white transition-colors block mb-1">sales@voxali.net</a>
                    <a href="mailto:legal@voxali.net" class="text-sm text-luxe-gold hover:text-white transition-colors block">legal@voxali.net</a>
                </div>
            </div>
        </div>
        
        <div class="max-w-7xl mx-auto pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <span class="text-sm text-luxe-muted">&copy; 2026 Voxali Inc. All rights reserved.</span>
        </div>
    </footer>
</body>
</html>`;

const HEAD_CONTENT = `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>__TITLE__</title>
    <meta name="description"
        content="__DESC__">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
        rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                    },
                    colors: {
                        luxe: {
                            obsidian: '#0A0A0A',
                            charcoal: '#151515',
                            gold: '#D4AF37',
                            muted: '#A1A1AA',
                            surface: '#1E1E1E'
                        }
                    },
                    animation: {
                        'float': 'float 6s ease-in-out infinite',
                        'pulse-glow': 'pulseGlow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                        'slide-up': 'slideUp 0.8s cubic-bezier(0, 0, 0.2, 1) forwards',
                    },
                    keyframes: {
                        float: {
                            '0%, 100%': { transform: 'translateY(0)' },
                            '50%': { transform: 'translateY(-20px)' },
                        },
                        pulseGlow: {
                            '0%, 100%': { opacity: 0.4 },
                            '50%': { opacity: 0.1 },
                        },
                        slideUp: {
                            '0%': { transform: 'translateY(40px)', opacity: 0 },
                            '100%': { transform: 'translateY(0)', opacity: 1 },
                        }
                    }
                }
            }
        }
    </script>
    <style>
        body {
            background-color: #0A0A0A;
            color: #F5F5F7;
        }

        .glass-nav {
            backdrop-filter: blur(20px);
            background: rgba(10, 10, 15, 0.85);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .text-gradient {
            background: linear-gradient(135deg, #FDE68A 0%, #D4AF37 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .bg-gradient-gold {
            background: linear-gradient(135deg, #D4AF37 0%, #B8860B 100%);
        }

        .glass-card {
            background: rgba(21, 21, 21, 0.6);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
        }
        
        .hero-glow {
            position: absolute;
            top: 20%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 800px;
            height: 800px;
            background: radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, transparent 60%);
            pointer-events: none;
            z-index: -1;
        }

        /* Mobile Nav Drawer */
        #mobile-menu {
            display: none;
        }
        #mobile-menu.open {
            display: flex;
        }
    </style>
</head>
<body class="antialiased overflow-x-hidden selection:bg-luxe-gold selection:text-black">

    <!-- HERO GLOW -->
    <div class="hero-glow animate-pulse-glow"></div>

`;

const SCRIPT_CONTENT = `
    <script>
        function toggleMobileMenu() {
            const menu = document.getElementById('mobile-menu');
            const h1 = document.getElementById('ham-1');
            const h3 = document.getElementById('ham-3');
            menu.classList.toggle('open');
            h1.classList.toggle('rotate-45');
            h1.classList.toggle('translate-y-2');
            h3.classList.toggle('opacity-0');
        }
    </script>
`;

module.exports = {
    NAV_CONTENT,
    FOOTER_CONTENT,
    HEAD_CONTENT,
    SCRIPT_CONTENT
};
