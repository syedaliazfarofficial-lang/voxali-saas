const fs = require('fs');
const path = require('path');

const targetPage = path.join(__dirname, 'pricing.html');
let html = fs.readFileSync(targetPage, 'utf8');

const imageRegex = /<div class="relative">\s*<div class="absolute inset-0 bg-gradient-gold opacity-10 blur-3xl rounded-full"><\/div>\s*<img src="\/booking-preview\.png"[^>]+>\s*<\/div>/;

const mockupHtml = `
            <div class="relative w-full max-w-md mx-auto aspect-[4/5] perspective-1000">
                <!-- Glowing background behind mockup -->
                <div class="absolute inset-x-0 bottom-0 bg-luxe-gold/20 h-full blur-3xl rounded-full scale-90"></div>
                
                <!-- Mockup Container -->
                <div class="relative w-full h-full bg-luxe-charcoal rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col group hover:-translate-y-2 transition-transform duration-500">
                    
                    <!-- Top Status Bar Mock -->
                    <div class="h-12 w-full bg-black/40 flex justify-center items-end pb-2">
                        <div class="w-20 h-1.5 bg-white/20 rounded-full"></div>
                    </div>

                    <!-- Header -->
                    <div class="px-6 py-5 border-b border-white/5">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 rounded-full bg-gradient-gold p-[2px]">
                                <div class="w-full h-full bg-luxe-charcoal rounded-full flex items-center justify-center">
                                    <span class="text-luxe-gold font-bold text-lg">B</span>
                                </div>
                            </div>
                            <div>
                                <h4 class="text-white font-bold text-lg leading-tight">Bella's Studio</h4>
                                <p class="text-luxe-muted text-xs">Los Angeles, CA</p>
                            </div>
                        </div>
                    </div>

                    <!-- Body / Services -->
                    <div class="flex-1 px-6 py-6 overflow-hidden flex flex-col gap-6">
                        
                        <!-- Step 1 -->
                        <div class="animate-[slideUp_0.5s_ease-out]">
                            <h5 class="text-white font-bold text-sm mb-3">1. Select Service</h5>
                            <div class="bg-white/5 border border-luxe-gold/30 rounded-xl p-3 flex justify-between items-center cursor-pointer">
                                <div>
                                    <p class="text-white text-sm font-semibold">Women's Haircut</p>
                                    <p class="text-luxe-muted text-xs mt-0.5">45 mins • with Sarah</p>
                                </div>
                                <div class="w-5 h-5 rounded-full border-2 border-luxe-gold flex items-center justify-center">
                                    <div class="w-2.5 h-2.5 bg-luxe-gold rounded-full"></div>
                                </div>
                            </div>
                        </div>

                        <!-- Step 2 -->
                        <div class="animate-[slideUp_0.6s_ease-out]">
                            <h5 class="text-white font-bold text-sm mb-3">2. Choose Time</h5>
                            <div class="flex gap-2 overflow-hidden mb-3">
                                <div class="bg-white/5 rounded-lg px-3 py-2 text-center border border-white/10 flex-1 opacity-50">
                                    <p class="text-luxe-muted text-[10px] uppercase">Mon</p>
                                    <p class="text-white font-bold text-sm">12</p>
                                </div>
                                <div class="bg-luxe-gold/10 rounded-lg px-3 py-2 text-center border border-luxe-gold flex-1">
                                    <p class="text-luxe-gold text-[10px] uppercase">Tue</p>
                                    <p class="text-luxe-gold font-bold text-sm">13</p>
                                </div>
                                <div class="bg-white/5 rounded-lg px-3 py-2 text-center border border-white/10 flex-1 opacity-50">
                                    <p class="text-luxe-muted text-[10px] uppercase">Wed</p>
                                    <p class="text-white font-bold text-sm">14</p>
                                </div>
                            </div>
                            <div class="flex gap-2">
                                <span class="bg-white/5 border border-white/10 text-white text-xs py-2 px-3 rounded-md">10:00 AM</span>
                                <span class="bg-gradient-gold text-black font-bold text-xs py-2 px-3 rounded-md shadow-[0_0_15px_rgba(212,175,55,0.3)]">11:30 AM</span>
                                <span class="bg-white/5 border border-white/10 text-white text-xs py-2 px-3 rounded-md">1:00 PM</span>
                            </div>
                        </div>

                    </div>

                    <!-- Bottom Bar -->
                    <div class="p-6 bg-black/40 border-t border-white/5 mt-auto">
                        <div class="flex justify-between items-center mb-4">
                            <span class="text-luxe-muted text-sm font-medium">Total</span>
                            <span class="text-white font-bold text-lg">$65.00</span>
                        </div>
                        <button class="w-full py-3.5 bg-gradient-gold text-black font-black rounded-xl hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all flex items-center justify-center gap-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                            Pay $20 Deposit
                        </button>
                    </div>

                </div>
            </div>`;

if (!html.match(imageRegex)) {
    console.error("Could not find the image block!");
    process.exit(1);
}

const updatedHtml = html.replace(imageRegex, mockupHtml);
fs.writeFileSync(targetPage, updatedHtml, 'utf8');
console.log("Injected UI Mockup.");
