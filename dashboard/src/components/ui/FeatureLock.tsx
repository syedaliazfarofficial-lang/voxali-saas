import React from 'react';
import { useTenant } from '../../context/TenantContext';
import { Lock, Zap, ArrowRight } from 'lucide-react';

interface FeatureLockProps {
    children: React.ReactNode;
    requiredTier: 'starter' | 'growth' | 'elite';
    featureName: string;
    description: string;
}

const TIER_ORDER = {
    'basic': 0,
    'starter': 1,
    'growth': 2,
    'elite': 3,
};

export const FeatureLock: React.FC<FeatureLockProps> = ({ children, requiredTier, featureName, description }) => {
    const { planTier } = useTenant();

    const currentTierLevel = TIER_ORDER[(planTier as keyof typeof TIER_ORDER) || 'basic'] || 0;
    const requiredTierLevel = TIER_ORDER[requiredTier] || 1;

    const isLocked = currentTierLevel < requiredTierLevel;

    if (!isLocked) {
        return <>{children}</>;
    }

    const handleUpgradeClick = () => {
        localStorage.setItem('voxali_settings_tab', 'billing');
        window.dispatchEvent(new Event('voxali:request-upgrade'));
    };

    return (
        <div className="relative w-full h-full min-h-[400px] overflow-hidden rounded-3xl group">
            {/* Blurred background content */}
            <div className="absolute inset-0 select-none pointer-events-none opacity-40 blur-[8px] transition-all duration-700 group-hover:blur-[12px] group-hover:opacity-20 scale-105 origin-top z-0">
                {children}
            </div>
            
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/80 to-transparent z-10" />

            {/* Lock UI */}
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-8 animate-in fade-in zoom-in duration-500">
                <div className="text-center max-w-md mx-auto relative">
                    <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#D4AF37]/20 blur-[80px] rounded-full pointer-events-none" />
                    
                    <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-[#18181A] border-2 border-[#D4AF37]/30 shadow-[0_0_30px_rgba(212,175,55,0.2)] flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/20 to-transparent" />
                        <Lock className="w-8 h-8 text-[#D4AF37] relative z-10" />
                    </div>

                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-xs font-black tracking-widest uppercase mb-6">
                        <Zap className="w-3.5 h-3.5" />
                        AI {requiredTier} Plan Required
                    </div>

                    <h2 className="text-3xl font-black text-white mb-4 tracking-tight">{featureName}</h2>
                    <p className="text-[#A0A0A0] text-sm leading-relaxed mb-8">{description}</p>

                    <button
                        onClick={handleUpgradeClick}
                        className="bg-gold-gradient text-black px-8 py-4 rounded-xl font-black shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-105 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 mx-auto uppercase tracking-wide"
                    >
                        Unlock Feature <ArrowRight className="w-5 h-5" />
                    </button>
                    
                    <p className="text-[10px] text-white/40 uppercase tracking-widest mt-6">Secure Stripe Checkout</p>
                </div>
            </div>
        </div>
    );
};
