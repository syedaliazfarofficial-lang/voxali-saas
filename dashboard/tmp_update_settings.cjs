const fs = require('fs');

const filePath = 'c:/Users/syeda/OneDrive/Desktop/Voxali New/dashboard/src/components/Settings.tsx';
let code = fs.readFileSync(filePath, 'utf8');

const regexPlans = /const plans = \[\s*\{\s*id: 'starter'[\s\S]*?\}\s*\];/;
const replacementPlans = `const plans = [
        {
            id: 'starter', name: 'AI STARTER', price: '$99', subtitle: 'For salons ready to automate missed calls', badge: 'SMART START',
            features: [
                'Up to 5 staff members', { text: 'Bella AI Receptionist', highlight: true },
                'Dedicated local phone number', 'Call forwarding support', 'Custom online booking page',
                'Stripe payments & deposits', 'Email & SMS reminders', 'Basic CRM and calendar'
            ],
            creditsBox: { title: 'Monthly AI & messaging credits', desc: '(Approx. 100 AI minutes or 400 SMS)' },
            actionText: 'Start AI Starter',
            caption: 'Let Bella answer calls and book directly on your calendar.'
        },
        {
            id: 'growth', name: 'AI GROWTH', price: '$199', subtitle: 'For salons accelerating their revenue', badge: 'MOST POPULAR', highlighted: true,
            features: [
                'Up to 15 staff members', { text: 'Bella AI Receptionist', highlight: true },
                'Dedicated local phone number', 'Custom online booking page', 'Stripe payments & deposits',
                'Email & SMS reminders', 'Advanced CRM & Loyalty program', 'SMS and email campaigns',
                'Revenue analytics & Waitlist', 'White-glove onboarding'
            ],
            creditsBox: { title: 'Monthly AI & messaging credits', desc: '(Approx. 250 AI minutes or 1,000 SMS)', highlight: true },
            actionText: 'Choose Growth',
            caption: 'Full automation designed to multiply your revenue.',
            captionHighlight: true
        },
        {
            id: 'elite', name: 'ENTERPRISE', price: '$349', subtitle: 'For large teams needing advanced permissions', badge: 'ENTERPRISE',
            features: [
                'Unlimited staff members', { text: 'Bella AI Receptionist', highlight: true },
                'Call forwarding support', 'Custom online booking page', 'Advanced CRM and analytics',
                'SMS and email campaigns', 'Custom branding', 'Advanced roles and permissions',
                'Priority support & Onboarding'
            ],
            creditsBox: { title: 'Monthly AI & messaging credits', desc: '(Custom volume or ~500 AI mins)' },
            actionText: 'Talk to Sales',
            caption: 'Need higher AI volume or a tailored setup? Contact sales.'
        }
    ];`;

code = code.replace(regexPlans, replacementPlans);


const renderContentToReplace = `<div className="flex-1 space-y-4">
                                        {p.features.map((f: any, i: number) => {
                                            if (typeof f === 'string') {
                                                return (
                                                    <div key={i} className="flex items-start gap-3">
                                                        <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                                                        <span className="text-sm text-gray-300">{f}</span>
                                                    </div>
                                                );
                                            }
                                            if (f.strike) {
                                                return (
                                                    <div key={i} className="flex items-start gap-3 opacity-40">
                                                        <X className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                                                        <span className="text-sm text-gray-400 line-through">{f.text}</span>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div key={i} className="flex items-start gap-3">
                                                    {f.highlight ? <Zap className="w-5 h-5 text-[#D4AF37] mt-0.5 flex-shrink-0" /> : <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />}
                                                    <div className="flex flex-col">
                                                        <span className={\`text-sm \${f.highlight ? 'text-[#D4AF37] font-bold' : 'text-gray-300'}\`}>{f.text}</span>
                                                        {f.subtext && <span className="text-[10px] text-white/40 mt-1">{f.subtext}</span>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <button
                                        disabled={isActive || !!upgradingTo}
                                        onClick={() => handleUpgrade(p.id)}
                                        className={\`mt-8 w-full py-4 rounded-xl font-bold transition-all \${isActive ? 'bg-white/5 text-white/30 cursor-not-allowed border border-white/10' : p.highlighted ? 'bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:brightness-110 active:scale-95' : 'bg-white text-black hover:bg-gray-200 active:scale-95'} flex justify-center items-center gap-2\`}
                                    >
                                        {isChanging ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                                        {isActive ? 'CURRENT PLAN' : isChanging ? 'PROCESSING...' : 'UPGRADE'}
                                    </button>`;


const replacementRenderContent = `<div className="flex-1 space-y-4">
                                        {p.features.map((f: any, i: number) => {
                                            if (typeof f === 'string') {
                                                return (
                                                    <div key={i} className="flex items-start gap-3">
                                                        <Check className="w-5 h-5 text-[#D4AF37] mt-0.5 flex-shrink-0" />
                                                        <span className="text-sm text-gray-300">{f}</span>
                                                    </div>
                                                );
                                            }
                                            if (f.strike) {
                                                return (
                                                    <div key={i} className="flex items-start gap-3 opacity-40">
                                                        <X className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                                                        <span className="text-sm text-gray-400 line-through">{f.text}</span>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div key={i} className="flex items-start gap-3">
                                                    {f.highlight ? <Zap className="w-5 h-5 text-[#D4AF37] mt-0.5 flex-shrink-0" /> : <Check className="w-5 h-5 text-[#D4AF37] mt-0.5 flex-shrink-0" />}
                                                    <div className="flex flex-col">
                                                        <span className={\`text-sm \${f.highlight ? 'text-[#D4AF37] font-bold' : 'text-gray-300'}\`}>{f.text}</span>
                                                        {f.subtext && <span className="text-[10px] text-white/40 mt-1">{f.subtext}</span>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {p.creditsBox && (
                                        <div className={\`mt-8 p-4 rounded-xl border \${p.creditsBox.highlight ? 'bg-[#18181A] border-[#D4AF37]/30' : 'bg-white/5 border-white/5'}\`}>
                                            <h4 className="text-[11px] font-bold text-white mb-1">{p.creditsBox.title}</h4>
                                            <p className="text-[11px] text-white/50">{p.creditsBox.desc}</p>
                                        </div>
                                    )}

                                    <button
                                        disabled={isActive || !!upgradingTo}
                                        onClick={() => handleUpgrade(p.id)}
                                        className={\`mt-6 w-full py-3.5 rounded-xl font-bold transition-all \${isActive ? 'bg-white/5 text-white/30 cursor-not-allowed border border-white/10' : p.highlighted ? 'bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:brightness-110 active:scale-95' : 'bg-white/5 text-white hover:bg-white/10 border border-white/10 active:scale-95'} flex justify-center items-center gap-2\`}
                                    >
                                        {isChanging ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                                        {isActive ? 'CURRENT PLAN' : isChanging ? 'PROCESSING...' : (p.actionText || 'UPGRADE')}
                                    </button>

                                    {p.caption && (
                                        <p className={\`mt-4 text-center text-[11px] leading-relaxed \${p.captionHighlight ? 'text-[#D4AF37]' : 'text-white/40'}\`}>
                                            {p.caption}
                                        </p>
                                    )}`;

// To fix whitespace mismatches, we use a regex or string replacement. 
// However, since we might have issues with exact whitespace, let's use replace by searching for a simpler substring first.
code = code.replace(/<div className="flex-1 space-y-4">[\s\S]*?<\/button>/, replacementRenderContent);

// One thing to fix: The name 'AI STARTER' should be styled nicely. In the image, 'AI STARTER' has a yellow background for 'STARTER'. 
// But "AI Growth" does not. Wait, the screenshot has 'AI STARTER' where 'STARTER' is highlighted. It's too complex to inject via name map without changing structure. We can just keep it text for now.

// Also, the check icons in the screenshot are yellow/gold, not green. I changed text-green-400 to text-[#D4AF37] in the replacementRenderContent.

fs.writeFileSync(filePath, code, 'utf8');
console.log('Features injected into Settings.tsx');
