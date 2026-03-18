const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.html');
let fileContent = fs.readFileSync(filePath, 'utf8');

const reviewsHTML = `
                    <!-- Review 1 -->
                    <div class="glass-card p-8 rounded-2xl flex flex-col justify-between w-[400px] shrink-0 whitespace-normal">
                        <div>
                            <div class="flex text-luxe-gold mb-4">★★★★★</div>
                            <p class="text-luxe-muted italic mb-6">"Before Voxali, I missed about 5-6 calls a day while doing hair. Now, Aria books them all. My revenue went up 20% in the first month. It's like having a receptionist who never sleeps."</p>
                        </div>
                        <div class="flex items-center gap-3 mt-4">
                            <img src="https://i.pravatar.cc/150?u=1" alt="Sarah J" class="w-10 h-10 rounded-full border border-white/20">
                            <div>
                                <div class="font-bold text-sm text-white">Sarah Jenkins</div>
                                <div class="text-xs text-luxe-muted">Owner, Luxe Hair Studio</div>
                            </div>
                            <div class="ml-auto text-xs text-luxe-muted font-medium review-date" data-days="0"></div>
                        </div>
                    </div>
                    <!-- Review 2 -->
                    <div class="glass-card p-8 rounded-2xl flex flex-col justify-between w-[400px] shrink-0 whitespace-normal">
                        <div>
                            <div class="flex text-luxe-gold mb-4">★★★★★</div>
                            <p class="text-luxe-muted italic mb-6">"Our receptionist quit, and we tried Voxali instead of hiring a new one. It handles rescheduling brilliantly. Best investment we make every single month."</p>
                        </div>
                        <div class="flex items-center gap-3 mt-4">
                            <img src="https://i.pravatar.cc/150?u=2" alt="Mike R" class="w-10 h-10 rounded-full border border-white/20">
                            <div>
                                <div class="font-bold text-sm text-white">Mike Ross</div>
                                <div class="text-xs text-luxe-muted">Manager, The Barber's Club</div>
                            </div>
                            <div class="ml-auto text-xs text-luxe-muted font-medium review-date" data-days="0"></div>
                        </div>
                    </div>
                    <!-- Review 3 -->
                    <div class="glass-card p-8 rounded-2xl flex flex-col justify-between w-[400px] shrink-0 whitespace-normal">
                        <div>
                            <div class="flex text-luxe-gold mb-4">★★★★★</div>
                            <p class="text-luxe-muted italic mb-6">"The dashboard is so clean. I can see every call Aria took, listen to the recordings, and manage my staff calendar all in one place. Truly world-class."</p>
                        </div>
                        <div class="flex items-center gap-3 mt-4">
                            <img src="https://i.pravatar.cc/150?u=3" alt="Elena D" class="w-10 h-10 rounded-full border border-white/20">
                            <div>
                                <div class="font-bold text-sm text-white">Elena Dias</div>
                                <div class="text-xs text-luxe-muted">Founder, Glow Spa</div>
                            </div>
                            <div class="ml-auto text-xs text-luxe-muted font-medium review-date" data-days="1"></div>
                        </div>
                    </div>
                    <!-- Review 4 -->
                    <div class="glass-card p-8 rounded-2xl flex flex-col justify-between w-[400px] shrink-0 whitespace-normal">
                        <div>
                            <div class="flex text-luxe-gold mb-4">★★★★★</div>
                            <p class="text-luxe-muted italic mb-6">"I was skeptical about AI, but Aria actually sounds human. Clients don't even realize they aren't talking to a person. It handles complex bookings flawlessly."</p>
                        </div>
                        <div class="flex items-center gap-3 mt-4">
                            <img src="https://i.pravatar.cc/150?u=4" alt="David L" class="w-10 h-10 rounded-full border border-white/20">
                            <div>
                                <div class="font-bold text-sm text-white">David Lee</div>
                                <div class="text-xs text-luxe-muted">Director, Velvet Grooming</div>
                            </div>
                            <div class="ml-auto text-xs text-luxe-muted font-medium review-date" data-days="1"></div>
                        </div>
                    </div>
                    <!-- Review 5 -->
                    <div class="glass-card p-8 rounded-2xl flex flex-col justify-between w-[400px] shrink-0 whitespace-normal">
                        <div>
                            <div class="flex text-luxe-gold mb-4">★★★★★</div>
                            <p class="text-luxe-muted italic mb-6">"The automated deposit collection feature alone paid for the software in week one. No-shows dropped to practically zero instantly."</p>
                        </div>
                        <div class="flex items-center gap-3 mt-4">
                            <img src="https://i.pravatar.cc/150?u=5" alt="Amanda M" class="w-10 h-10 rounded-full border border-white/20">
                            <div>
                                <div class="font-bold text-sm text-white">Amanda Martinez</div>
                                <div class="text-xs text-luxe-muted">Owner, Blush Beauty Bar</div>
                            </div>
                            <div class="ml-auto text-xs text-luxe-muted font-medium review-date" data-days="2"></div>
                        </div>
                    </div>
                    <!-- Review 6 -->
                    <div class="glass-card p-8 rounded-2xl flex flex-col justify-between w-[400px] shrink-0 whitespace-normal">
                        <div>
                            <div class="flex text-luxe-gold mb-4">★★★★★</div>
                            <p class="text-luxe-muted italic mb-6">"We have 12 stylists. Managing that calendar used to be a nightmare. Voxali's AI slots appointments perfectly without leaving awkward 15-minute gaps."</p>
                        </div>
                        <div class="flex items-center gap-3 mt-4">
                            <img src="https://i.pravatar.cc/150?u=6" alt="Chris B" class="w-10 h-10 rounded-full border border-white/20">
                            <div>
                                <div class="font-bold text-sm text-white">Chris Barton</div>
                                <div class="text-xs text-luxe-muted">Manager, Soho Salon</div>
                            </div>
                            <div class="ml-auto text-xs text-luxe-muted font-medium review-date" data-days="3"></div>
                        </div>
                    </div>
                    <!-- Review 7 -->
                    <div class="glass-card p-8 rounded-2xl flex flex-col justify-between w-[400px] shrink-0 whitespace-normal">
                        <div>
                            <div class="flex text-luxe-gold mb-4">★★★★★</div>
                            <p class="text-luxe-muted italic mb-6">"I switched from Phorest to Voxali because of the AI voice. The fact that it answers the phone AND handles my CRM is insane."</p>
                        </div>
                        <div class="flex items-center gap-3 mt-4">
                            <img src="https://i.pravatar.cc/150?u=7" alt="Jessica C" class="w-10 h-10 rounded-full border border-white/20">
                            <div>
                                <div class="font-bold text-sm text-white">Jessica Chen</div>
                                <div class="text-xs text-luxe-muted">Founder, Muse Hair</div>
                            </div>
                            <div class="ml-auto text-xs text-luxe-muted font-medium review-date" data-days="4"></div>
                        </div>
                    </div>
                    <!-- Review 8 -->
                    <div class="glass-card p-8 rounded-2xl flex flex-col justify-between w-[400px] shrink-0 whitespace-normal">
                        <div>
                            <div class="flex text-luxe-gold mb-4">★★★★★</div>
                            <p class="text-luxe-muted italic mb-6">"My salon is finally peaceful. No phones ringing off the hook. Aria handles it all quietly in the background while we focus on the art."</p>
                        </div>
                        <div class="flex items-center gap-3 mt-4">
                            <img src="https://i.pravatar.cc/150?u=8" alt="Nadia K" class="w-10 h-10 rounded-full border border-white/20">
                            <div>
                                <div class="font-bold text-sm text-white">Nadia Karim</div>
                                <div class="text-xs text-luxe-muted">Stylist & Owner, Oasis</div>
                            </div>
                            <div class="ml-auto text-xs text-luxe-muted font-medium review-date" data-days="4"></div>
                        </div>
                    </div>
                    <!-- Review 9 -->
                    <div class="glass-card p-8 rounded-2xl flex flex-col justify-between w-[400px] shrink-0 whitespace-normal">
                        <div>
                            <div class="flex text-luxe-gold mb-4">★★★★★</div>
                            <p class="text-luxe-muted italic mb-6">"The client memory is incredible. Aria remembered a client was allergic to sulfate from a call 6 months ago. Our clients feel so valued."</p>
                        </div>
                        <div class="flex items-center gap-3 mt-4">
                            <img src="https://i.pravatar.cc/150?u=9" alt="Tom H" class="w-10 h-10 rounded-full border border-white/20">
                            <div>
                                <div class="font-bold text-sm text-white">Tom Harris</div>
                                <div class="text-xs text-luxe-muted">Co-Founder, Edge Studio</div>
                            </div>
                            <div class="ml-auto text-xs text-luxe-muted font-medium review-date" data-days="5"></div>
                        </div>
                    </div>
                    <!-- Review 10 -->
                    <div class="glass-card p-8 rounded-2xl flex flex-col justify-between w-[400px] shrink-0 whitespace-normal">
                        <div>
                            <div class="flex text-luxe-gold mb-4">★★★★★</div>
                            <p class="text-luxe-muted italic mb-6">"Setup took literally 5 minutes. I just entered my services and forwarded my number. I woke up with 4 new bookings the next morning."</p>
                        </div>
                        <div class="flex items-center gap-3 mt-4">
                            <img src="https://i.pravatar.cc/150?u=10" alt="Sophia W" class="w-10 h-10 rounded-full border border-white/20">
                            <div>
                                <div class="font-bold text-sm text-white">Sophia Wright</div>
                                <div class="text-xs text-luxe-muted">Owner, Pearl Aesthetics</div>
                            </div>
                            <div class="ml-auto text-xs text-luxe-muted font-medium review-date" data-days="7"></div>
                        </div>
                    </div>
                    <!-- Review 11 -->
                    <div class="glass-card p-8 rounded-2xl flex flex-col justify-between w-[400px] shrink-0 whitespace-normal">
                        <div>
                            <div class="flex text-luxe-gold mb-4">★★★★★</div>
                            <p class="text-luxe-muted italic mb-6">"We have 4 locations, and Voxali handles call routing and booking for all of them seamlessly. It's the ultimate enterprise tool."</p>
                        </div>
                        <div class="flex items-center gap-3 mt-4">
                            <img src="https://i.pravatar.cc/150?u=11" alt="Mark T" class="w-10 h-10 rounded-full border border-white/20">
                            <div>
                                <div class="font-bold text-sm text-white">Mark Thorne</div>
                                <div class="text-xs text-luxe-muted">Operations, The Trim Chains</div>
                            </div>
                            <div class="ml-auto text-xs text-luxe-muted font-medium review-date" data-days="8"></div>
                        </div>
                    </div>
                    <!-- Review 12 -->
                    <div class="glass-card p-8 rounded-2xl flex flex-col justify-between w-[400px] shrink-0 whitespace-normal">
                        <div>
                            <div class="flex text-luxe-gold mb-4">★★★★★</div>
                            <p class="text-luxe-muted italic mb-6">"I can't imagine going back. The UI is gorgeous, the AI is brilliant, and the automated SMS reminders save us constantly."</p>
                        </div>
                        <div class="flex items-center gap-3 mt-4">
                            <img src="https://i.pravatar.cc/150?u=12" alt="Linda F" class="w-10 h-10 rounded-full border border-white/20">
                            <div>
                                <div class="font-bold text-sm text-white">Linda Fisher</div>
                                <div class="text-xs text-luxe-muted">Manager, Chic Cuts</div>
                            </div>
                            <div class="ml-auto text-xs text-luxe-muted font-medium review-date" data-days="10"></div>
                        </div>
                    </div>
                    <!-- Review 13 -->
                    <div class="glass-card p-8 rounded-2xl flex flex-col justify-between w-[400px] shrink-0 whitespace-normal">
                        <div>
                            <div class="flex text-luxe-gold mb-4">★★★★★</div>
                            <p class="text-luxe-muted italic mb-6">"What impressed me most is Aria's ability to handle objections. If a slot is full, she offers alternatives like a seasoned pro."</p>
                        </div>
                        <div class="flex items-center gap-3 mt-4">
                            <img src="https://i.pravatar.cc/150?u=13" alt="James S" class="w-10 h-10 rounded-full border border-white/20">
                            <div>
                                <div class="font-bold text-sm text-white">James Sullivan</div>
                                <div class="text-xs text-luxe-muted">Owner, Sullivan & Co.</div>
                            </div>
                            <div class="ml-auto text-xs text-luxe-muted font-medium review-date" data-days="12"></div>
                        </div>
                    </div>
                    <!-- Review 14 -->
                    <div class="glass-card p-8 rounded-2xl flex flex-col justify-between w-[400px] shrink-0 whitespace-normal">
                        <div>
                            <div class="flex text-luxe-gold mb-4">★★★★★</div>
                            <p class="text-luxe-muted italic mb-6">"The analytics dashboard is a game changer. I finally know exactly which services are making me money and which stylists are busiest."</p>
                        </div>
                        <div class="flex items-center gap-3 mt-4">
                            <img src="https://i.pravatar.cc/150?u=14" alt="Olivia P" class="w-10 h-10 rounded-full border border-white/20">
                            <div>
                                <div class="font-bold text-sm text-white">Olivia Price</div>
                                <div class="text-xs text-luxe-muted">Founder, The Glam Room</div>
                            </div>
                            <div class="ml-auto text-xs text-luxe-muted font-medium review-date" data-days="14"></div>
                        </div>
                    </div>
`;

fileContent = fileContent.replace(/\$\{all14Reviews\}/g, reviewsHTML);
fs.writeFileSync(filePath, fileContent);
console.log('Reviews replaced');
