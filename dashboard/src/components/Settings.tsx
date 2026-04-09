import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Save, Plus, X, Search, MoreHorizontal, Link, Check, Smartphone, CheckCircle2, Copy, Zap, MessageSquare, Megaphone, ToggleLeft, ToggleRight, Phone, CalendarIcon, Clock, Edit3, Upload, Building2, Trash2,
    Loader2, Scissors, ChevronDown, ChevronUp, Globe, Lock, Eye, EyeOff, KeyRound,
    Mail, CreditCard, ExternalLink, Shield, AlertTriangle, Coins,
    CreditCard as BillingIcon, ShieldCheck
} from 'lucide-react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { useTenant } from '../context/TenantContext';
import { showToast } from './ui/ToastNotification';
import { Skeleton } from './ui/Skeleton';

const TIMEZONES = [
    { value: 'America/New_York', label: 'Eastern Time (New York)' },
    { value: 'America/Chicago', label: 'Central Time (Chicago)' },
    { value: 'America/Denver', label: 'Mountain Time (Denver)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)' },
    { value: 'America/Anchorage', label: 'Alaska Time' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
    { value: 'America/Toronto', label: 'Eastern Time (Toronto)' },
    { value: 'America/Vancouver', label: 'Pacific Time (Vancouver)' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET)' },
    { value: 'Europe/Berlin', label: 'Berlin (CET)' },
    { value: 'Asia/Dubai', label: 'Dubai (GST)' },
    { value: 'Asia/Karachi', label: 'Pakistan (PKT)' },
    { value: 'Asia/Kolkata', label: 'India (IST)' },
    { value: 'Asia/Shanghai', label: 'China (CST)' },
    { value: 'Asia/Tokyo', label: 'Japan (JST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
    { value: 'Australia/Melbourne', label: 'Melbourne (AEST)' },
    { value: 'Asia/Riyadh', label: 'Saudi Arabia (AST)' },
    { value: 'Africa/Lagos', label: 'Lagos (WAT)' },
    { value: 'Africa/Johannesburg', label: 'South Africa (SAST)' },
];

interface Service {
    id: string; name: string; duration: number; price: number;
    category: string; is_active: boolean;
    deposit_required?: boolean; deposit_amount?: number;
}

interface BusinessHour {
    id: string; day_of_week: number; open_time: string;
    close_time: string; is_open: boolean;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const CATEGORIES = ['Haircut & Styling', 'Hair Coloring', 'Hair Treatment', 'Nail Bar', 'Brows & Lashes', 'Makeup', "Men's Grooming", 'Facial Hair Removal'];

// ===== INTEGRATIONS TAB COMPONENT =====
interface IntegrationsTabProps {
    tenantId: string;
    twilioPhone: string; setTwilioPhone: (v: string) => void;
    notifEmail: string; setNotifEmail: (v: string) => void;
    notifEnabled: boolean; setNotifEnabled: (v: boolean) => void;
    integSaving: boolean; setIntegSaving: (v: boolean) => void;
    integLoaded: boolean; setIntegLoaded: (v: boolean) => void;
}

const IntegrationsTab: React.FC<IntegrationsTabProps> = ({
    tenantId, twilioPhone, setTwilioPhone, notifEmail, setNotifEmail,
    notifEnabled, setNotifEnabled, integSaving, setIntegSaving,
    integLoaded, setIntegLoaded,
}) => {
    
    const [copied, setCopied] = useState(false);

    // Fetch on mount
    useEffect(() => {
        if (integLoaded || !tenantId) return;
        (async () => {
            const { data } = await supabase
                .from('tenants')
                .select('twilio_phone_number, notification_email_from, notifications_enabled, salon_email, salon_website, google_review_url')
                .eq('id', tenantId)
                .single();
            if (data) {
                setTwilioPhone(data.twilio_phone_number || '');
                setNotifEmail(data.notification_email_from || '');
                setNotifEnabled(data.notifications_enabled || false);
                
            }
            setIntegLoaded(true);
        })();
    }, [tenantId, integLoaded]);

    const handleSave = async () => {
        setIntegSaving(true);
        const { error } = await supabase
            .from('tenants')
            .update({
                notification_email_from: notifEmail || null,
                notifications_enabled: notifEnabled,
                
            })
            .eq('id', tenantId);
        if (!error) {
            showToast('Integrations saved!');
        } else {
            showToast(error.message, 'error');
        }
        setIntegSaving(false);
    };

    return (
        <div>
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-luxe-gold/10 rounded-2xl border border-luxe-gold/20">
                    <Zap className="w-6 h-6 text-luxe-gold" />
                </div>
                <div>
                    <h3 className="text-xl font-bold">Integrations</h3>
                    <p className="text-xs text-white/40 uppercase tracking-widest">Notifications & Salon Contact Info</p>
                </div>
            </div>

            {/* Calendar Sync (ICS) */}
            <div className="glass-panel border border-white/5 p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <CalendarIcon className="w-5 h-5 text-luxe-gold" />
                    <div>
                        <h4 className="font-bold">Google & Apple Calendar Sync</h4>
                        <p className="text-xs text-white/40 mt-1">Live sync your Voxali bookings to your personal calendar</p>
                    </div>
                </div>
                <div className="bg-luxe-obsidian/50 border border-white/10 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div className="flex-1 overflow-hidden">
                        <p className="text-xs text-white/50 uppercase tracking-widest font-bold mb-2">Calendar Feed URL</p>
                        <p className="text-sm font-mono text-white/80 truncate select-all px-3 py-2 bg-white/5 rounded-lg border border-white/5">
                            https://sjzxgjimbcoqsylrglkm.supabase.co/functions/v1/calendar-feed?tenant={tenantId}
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(`https://sjzxgjimbcoqsylrglkm.supabase.co/functions/v1/calendar-feed?tenant=${tenantId}`);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                            showToast('Calendar link copied! Paste this in Google/Apple Calendar.');
                        }}
                        className="bg-gold-gradient text-luxe-obsidian px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'COPIED' : 'COPY'}
                    </button>
                </div>
                <p className="text-xs text-white/30 mt-4 leading-relaxed">
                    <strong className="text-white/50">Google Calendar:</strong> Settings &gt; Add Calendar &gt; From URL &gt; Paste Link.<br/>
                    <strong className="text-white/50">Apple Calendar:</strong> File &gt; New Calendar Subscription &gt; Paste Link.
                </p>
            </div>

            {/* Notifications Toggle */}
            <div className="glass-panel border border-white/5 p-6 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="font-bold text-lg">Auto Notifications</h4>
                        <p className="text-sm text-white/40 mt-1">Automatically send SMS & Email when bookings are created, confirmed, or cancelled</p>
                    </div>
                    <button
                        onClick={() => setNotifEnabled(!notifEnabled)}
                        className="transition-all"
                        title="Toggle notifications"
                    >
                        {notifEnabled
                            ? <ToggleRight className="w-10 h-10 text-green-400" />
                            : <ToggleLeft className="w-10 h-10 text-white/30" />
                        }
                    </button>
                </div>
            </div>

            {/* SMS Phone (Read-only — assigned by Super Admin) */}
            <div className="glass-panel border border-white/5 p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <Phone className="w-5 h-5 text-luxe-gold" />
                    <h4 className="font-bold">SMS Number</h4>
                    <span className="text-xs text-green-400/60 ml-auto">Assigned by Admin</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-mono text-white/60">
                    {twilioPhone || 'Not assigned yet — Contact Super Admin'}
                </div>
                <p className="text-xs text-white/30 mt-2">This number is used for sending booking SMS to clients. Contact admin to change.</p>
            </div>

            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={integSaving}
                className="bg-gold-gradient text-luxe-obsidian px-8 py-3 rounded-xl font-bold shadow-lg shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
                {integSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {integSaving ? 'SAVING...' : 'SAVE INTEGRATIONS'}
            </button>
        </div>
    );
};

// ===== WALLET & BILLING TAB COMPONENT =====
const BillingTab: React.FC<{ tenantId: string }> = ({ tenantId }) => {
    const { planTier } = useTenant();
    const [usage, setUsage] = useState({
        ai_minutes_included: 0, ai_minutes_used: 0, ai_minutes_topup_balance: 0,
        sms_included: 0, sms_used: 0, sms_topup_balance: 0,
        subscription_status: 'active', billing_grace_until: null as string | null,
        current_period_end: null as string | null
    });
    const [loading, setLoading] = useState(true);
    const [upgradingTo, setUpgradingTo] = useState<string | null>(null);

    const handleUpgrade = async (plan: string) => {
        setUpgradingTo(plan);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
            let functionUrl = 'https://sjzxgjimbcoqsylrglkm.supabase.co/functions/v1/create-checkout-session';
            if (envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
                functionUrl = envUrl.replace(':54321', ':54321/functions/v1/create-checkout-session');
            } else if (envUrl.includes('supabase.co')) {
                functionUrl = envUrl.replace('.supabase.co', '.supabase.co/functions/v1/create-checkout-session');
            }

            const res = await fetch(functionUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan: plan, email: session.user.email, flow: 'upgrade' })
            });

            const data = await res.json();
            if (data.checkout_url) {
                window.location.href = data.checkout_url;
            } else {
                throw new Error(data.error || 'Failed to create checkout session');
            }
        } catch (err: any) {
            showToast(err.message, 'error');
            setUpgradingTo(null);
        }
    };

    const fetchWalletProps = useCallback(async () => {
        setLoading(true);
        const { data: tenantData } = await supabase
            .from('tenants')
            .select(`
                subscription_status, billing_grace_until, current_period_end, 
                ai_minutes_included, ai_minutes_used, ai_minutes_topup_balance, 
                sms_included, sms_used, sms_topup_balance
            `)
            .eq('id', tenantId)
            .single();

        if (tenantData) {
            setUsage({
                ai_minutes_included: tenantData.ai_minutes_included || 0,
                ai_minutes_used: tenantData.ai_minutes_used || 0,
                ai_minutes_topup_balance: tenantData.ai_minutes_topup_balance || 0,
                sms_included: tenantData.sms_included || 0,
                sms_used: tenantData.sms_used || 0,
                sms_topup_balance: tenantData.sms_topup_balance || 0,
                subscription_status: tenantData.subscription_status || 'active',
                billing_grace_until: tenantData.billing_grace_until,
                current_period_end: tenantData.current_period_end
            });
        }
        setLoading(false);
    }, [tenantId]);

    useEffect(() => { fetchWalletProps(); }, [fetchWalletProps]);

    const [chargingType, setChargingType] = useState<string | null>(null);

    const handleTopUp = async (type: 'ai_minutes' | 'sms', quantity: number) => {
        if (!tenantId) return;
        setChargingType(`${type}_${quantity}`);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
            let functionUrl = 'https://sjzxgjimbcoqsylrglkm.supabase.co/functions/v1/charge-coins';
            if (envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
                functionUrl = envUrl.replace(':54321', ':54321/functions/v1/charge-coins');
            } else if (envUrl.includes('supabase.co')) {
                functionUrl = envUrl.replace('.supabase.co', '.supabase.co/functions/v1/charge-coins');
            }
            const toolsKey = 'LUXE-AUREA-SECRET-2026';

            const res = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                    'X-TOOLS-KEY': toolsKey
                },
                body: JSON.stringify({ tenant_id: tenantId, topup_type: type, quantity })
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to create checkout session');
            }

            const { url } = await res.json();
            if (url) {
                window.location.href = url;
            } else {
                throw new Error('No checkout URL returned from Strip gateway');
            }
        } catch (err: any) {
            console.error('Portal error:', err);
            showToast(err.message || 'Billing portal error', 'error');
            setChargingType(null);
        }
    };

    const aiTotal = usage.ai_minutes_included + usage.ai_minutes_topup_balance;
    const aiRemaining = aiTotal - usage.ai_minutes_used;
    const aiPercentUsed = aiTotal > 0 ? Math.min(100, (usage.ai_minutes_used / aiTotal) * 100) : 0;
    
    const smsTotal = usage.sms_included + usage.sms_topup_balance;
    const smsRemaining = smsTotal - usage.sms_used;
    const smsPercentUsed = smsTotal > 0 ? Math.min(100, (usage.sms_used / smsTotal) * 100) : 0;

    const plans = [
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
    ];

    const getBarColor = (pct: number) => {
        if (pct >= 100) return 'bg-red-500';
        if (pct >= 85) return 'bg-orange-400';
        return 'bg-[#D4AF37]';
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-luxe-gold/10 rounded-2xl border border-luxe-gold/20">
                        <BillingIcon className="w-6 h-6 text-luxe-gold" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-widest text-[#D4AF37]">Billing & Usage</h3>
                        <p className="text-xs text-white/40 uppercase tracking-widest">Manage your plan and prepaid AI limits</p>
                    </div>
                </div>
            </div>

            {/* Warnings */}
            {!loading && usage.subscription_status === 'past_due' && (
                <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                        <div>
                            <p className="text-red-400 font-bold">Payment Failed — Grace Period Active</p>
                            <p className="text-xs text-red-400/80 mt-1">
                                Please update your payment method. Access will be paused after {usage.billing_grace_until ? new Date(usage.billing_grace_until).toLocaleDateString() : '3 days'}.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass-panel border border-white/5 p-6 h-[400px]"><Skeleton variant="rect" height={300} /></div>
                    <div className="glass-panel border border-white/5 p-6 h-[400px]"><Skeleton variant="rect" height={300} /></div>
                </div>
            ) : (
                <>
                    {/* ===== USAGE QUOTAS & TOPUPS ===== */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                        {/* AI Minutes Card */}
                        <div className="glass-panel p-6 border border-white/10 rounded-2xl bg-gradient-to-br from-[#121212] to-[#1A1A1A]">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-[#D4AF37]/10 rounded-lg"><Zap className="w-5 h-5 text-[#D4AF37]" /></div>
                                    <span className="text-white/50 text-sm font-bold uppercase tracking-wider">AI Voice Minutes</span>
                                </div>
                                {aiRemaining <= 0 ? 
                                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-red-500/20 text-red-400 rounded">Paused / Needs Top-Up</span> :
                                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-green-500/10 text-green-400 rounded">Active</span>
                                }
                            </div>
                            
                            <div className="flex items-end gap-2 mb-2">
                                <div className="text-5xl font-black text-white">{aiRemaining}</div>
                                <div className="text-sm text-white/40 mb-1 font-medium">MINS REMAINING</div>
                            </div>
                            
                            <div className="flex justify-between text-xs text-white/50 mb-2 mt-6">
                                <span>Used: <span className="text-white font-bold">{usage.ai_minutes_used}</span></span>
                                <span>Total: <span className="text-white font-bold">{aiTotal}</span></span>
                            </div>
                            <div className="w-full bg-white/5 h-2 rounded-full mb-3">
                                <div className={`${getBarColor(aiPercentUsed)} h-2 rounded-full transition-all duration-1000`} style={{ width: `${aiPercentUsed}%` }} />
                            </div>
                            <p className="text-[10px] text-white/40 uppercase tracking-wider text-right mb-6">
                                {Number(aiPercentUsed).toFixed(1)}% Usage
                            </p>

                            <div className="grid grid-cols-2 gap-4 text-xs mt-4 bg-white/5 p-4 rounded-xl border border-white/5">
                                <div><p className="text-white/40 font-bold mb-1">Monthly Plan</p><p className="text-lg font-bold">+{usage.ai_minutes_included}</p></div>
                                <div><p className="text-white/40 font-bold mb-1">Rollover Top-Ups</p><p className="text-lg font-bold text-[#D4AF37]">+{usage.ai_minutes_topup_balance}</p></div>
                            </div>

                            <div className="space-y-3 pt-6 border-t border-white/5 mt-6">
                                <p className="text-xs text-white/40 mb-3 font-bold uppercase tracking-wider text-center">Buy Additional Minutes (Never Expire)</p>
                                <div className="flex gap-2 mb-2">
                                    <button onClick={() => handleTopUp('ai_minutes', 50)} disabled={!!chargingType} className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 py-3 rounded-xl text-xs font-bold transition-all text-white">
                                        {chargingType === 'ai_minutes_50' ? '...' : 'Quick Refill (50 Min) - $35'}
                                    </button>
                                    <button onClick={() => handleTopUp('ai_minutes', 100)} disabled={!!chargingType} className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 py-3 rounded-xl text-xs font-bold transition-all text-white">
                                        {chargingType === 'ai_minutes_100' ? '...' : 'Standard (100 Min) - $65'}
                                    </button>
                                </div>
                                <button onClick={() => handleTopUp('ai_minutes', 250)} disabled={!!chargingType} className="w-full bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 py-3 rounded-xl text-xs font-bold transition-all text-[#D4AF37]">
                                    {chargingType === 'ai_minutes_250' ? 'REDIRECTING...' : 'High Volume (250 Min) - $150'}
                                </button>
                            </div>
                        </div>

                        {/* SMS Credits Card */}
                        <div className="glass-panel p-6 border border-white/10 rounded-2xl bg-gradient-to-br from-[#121212] to-[#1A1A1A]">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-blue-500/10 rounded-lg"><MessageSquare className="w-5 h-5 text-blue-400" /></div>
                                    <span className="text-white/50 text-sm font-bold uppercase tracking-wider">SMS Credits</span>
                                </div>
                                {smsRemaining <= 0 ? 
                                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-red-500/20 text-red-400 rounded">Paused / Needs Top-Up</span> :
                                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-green-500/10 text-green-400 rounded">Active</span>
                                }
                            </div>
                            
                            <div className="flex items-end gap-2 mb-2">
                                <div className="text-5xl font-black text-white">{smsRemaining}</div>
                                <div className="text-sm text-white/40 mb-1 font-medium">CREDITS REMAINING</div>
                            </div>
                            
                            <div className="flex justify-between text-xs text-white/50 mb-2 mt-6">
                                <span>Used: <span className="text-white font-bold">{usage.sms_used}</span></span>
                                <span>Total: <span className="text-white font-bold">{smsTotal}</span></span>
                            </div>
                            <div className="w-full bg-white/5 h-2 rounded-full mb-3">
                                <div className={`${getBarColor(smsPercentUsed)} h-2 rounded-full transition-all duration-1000`} style={{ width: `${smsPercentUsed}%` }} />
                            </div>
                            <p className="text-[10px] text-white/40 uppercase tracking-wider text-right mb-6">
                                {Number(smsPercentUsed).toFixed(1)}% Usage
                            </p>

                            <div className="grid grid-cols-2 gap-4 text-xs mt-4 bg-white/5 p-4 rounded-xl border border-white/5">
                                <div><p className="text-white/40 font-bold mb-1">Monthly Plan</p><p className="text-lg font-bold">+{usage.sms_included}</p></div>
                                <div><p className="text-white/40 font-bold mb-1">Rollover Top-Ups</p><p className="text-lg font-bold text-blue-400">+{usage.sms_topup_balance}</p></div>
                            </div>

                            <div className="space-y-3 pt-6 border-t border-white/5 mt-6">
                                <p className="text-xs text-white/40 mb-3 font-bold uppercase tracking-wider text-center">Buy Additional SMS (Never Expire)</p>
                                <div className="flex gap-2 mb-2">
                                    <button onClick={() => handleTopUp('sms', 500)} disabled={!!chargingType} className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 py-3 rounded-xl text-xs font-bold transition-all text-white">
                                        {chargingType === 'sms_500' ? '...' : 'Quick Refill (500) - $15'}
                                    </button>
                                    <button onClick={() => handleTopUp('sms', 1000)} disabled={!!chargingType} className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 py-3 rounded-xl text-xs font-bold transition-all text-white">
                                        {chargingType === 'sms_1000' ? '...' : 'Top Value (1,000) - $25'}
                                    </button>
                                </div>
                                <button onClick={() => handleTopUp('sms', 2000)} disabled={!!chargingType} className="w-full bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 py-3 rounded-xl text-xs font-bold transition-all text-blue-400">
                                    {chargingType === 'sms_2000' ? 'REDIRECTING...' : 'High Volume (2,000) - $40'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="text-center mb-12">
                        <p className="text-xs text-white/50 bg-[#121212] px-6 py-3 rounded-full border border-white/5 inline-block">
                            <span className="text-[#D4AF37] font-bold">Note:</span> Top-up packs are separate from your monthly plan allowance and never expire until used.
                        </p>
                    </div>

                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <h4 className="text-xl font-bold">Subscription Tier</h4>
                            <p className="text-xs text-white/40 mt-1">Upgrade or modify your base subscription</p>
                        </div>
                        {usage.current_period_end && (
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Next Billing / Quota Reset</p>
                                <p className="text-sm font-bold text-white/80">{new Date(usage.current_period_end).toLocaleDateString()}</p>
                            </div>
                        )}
                    </div>

                    {/* ===== SUBSCRIPTION PLANS GRID ===== */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start max-w-6xl mx-auto">
                        {plans.map((p) => {
                            const isActive = (planTier || 'starter').toLowerCase() === p.id;
                            const isChanging = upgradingTo === p.id;
                            
                            return (
                                <div key={p.id} className={`relative flex flex-col h-full p-8 rounded-3xl transition-all duration-300 ${p.highlighted ? 'bg-[#18181A] border-2 border-[#D4AF37] shadow-[0_0_30px_rgba(212,175,55,0.15)] scale-[1.02] z-10' : 'bg-[#121212] border border-white/10 hover:border-white/30'}`}>
                                    {p.badge && (
                                        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 text-[10px] font-black tracking-widest uppercase rounded-full ${p.highlighted ? 'bg-[#D4AF37] text-black' : 'bg-white text-black'}`}>
                                            {p.badge}
                                        </div>
                                    )}
                                    
                                    {isActive && (
                                        <div className="absolute top-4 right-4 text-[#D4AF37] text-xs font-bold px-3 py-1 border border-[#D4AF37]/50 rounded-full bg-[#D4AF37]/10 flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" /> CURRENT
                                        </div>
                                    )}

                                    <div className="mb-8">
                                        <h3 className="text-xl font-bold text-white mb-2">{p.name}</h3>
                                        <p className="text-[#A0A0A0] text-sm h-10">{p.subtitle}</p>
                                        <div className="mt-4 flex items-baseline gap-1">
                                            <span className="text-4xl font-black">{p.price}</span>
                                            <span className="text-[#A0A0A0] text-sm">/mo</span>
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-4">
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
                                                        <span className={`text-sm ${f.highlight ? 'text-[#D4AF37] font-bold' : 'text-gray-300'}`}>{f.text}</span>
                                                        {f.subtext && <span className="text-[10px] text-white/40 mt-1">{f.subtext}</span>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {p.creditsBox && (
                                        <div className={`mt-8 p-4 rounded-xl border ${p.creditsBox.highlight ? 'bg-[#18181A] border-[#D4AF37]/30' : 'bg-white/5 border-white/5'}`}>
                                            <h4 className="text-[11px] font-bold text-white mb-1">{p.creditsBox.title}</h4>
                                            <p className="text-[11px] text-white/50">{p.creditsBox.desc}</p>
                                        </div>
                                    )}

                                    <button
                                        disabled={isActive || !!upgradingTo}
                                        onClick={() => handleUpgrade(p.id)}
                                        className={`mt-6 w-full py-3.5 rounded-xl font-bold transition-all ${isActive ? 'bg-white/5 text-white/30 cursor-not-allowed border border-white/10' : p.highlighted ? 'bg-[#D4AF37] text-black shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:brightness-110 active:scale-95' : 'bg-white/5 text-white hover:bg-white/10 border border-white/10 active:scale-95'} flex justify-center items-center gap-2`}
                                    >
                                        {isChanging ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                                        {isActive ? 'CURRENT PLAN' : isChanging ? 'PROCESSING...' : (p.actionText || 'UPGRADE')}
                                    </button>

                                    {p.caption && (
                                        <p className={`mt-4 text-center text-[11px] leading-relaxed ${p.captionHighlight ? 'text-[#D4AF37]' : 'text-white/40'}`}>
                                            {p.caption}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

// ===== PAYMENTS TAB COMPONENT =====
const PaymentsTab: React.FC<{ tenantId: string }> = ({ tenantId }) => {
    const [stripeStatus, setStripeStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [saving, setSaving] = useState(false);

    // Refund policy state
    const [cancelWindow, setCancelWindow] = useState(24);
    const [lateCancelRefund, setLateCancelRefund] = useState(50);
    const [noShowRefund, setNoShowRefund] = useState(0);
    const [autoRefund, setAutoRefund] = useState(true);
    const [paymentHoldMinutes, setPaymentHoldMinutes] = useState(30);

    const fetchStatus = async () => {
        // Get tenant refund settings
        const { data: tenant } = await supabase.from('tenants')
            .select('stripe_account_id, stripe_onboarding_complete, cancellation_window_hours, late_cancel_refund_percent, no_show_refund_percent, auto_refund_enabled, payment_hold_minutes')
            .eq('id', tenantId).single();

        if (tenant) {
            setCancelWindow(tenant.cancellation_window_hours ?? 24);
            setLateCancelRefund(tenant.late_cancel_refund_percent ?? 50);
            setNoShowRefund(tenant.no_show_refund_percent ?? 0);
            setAutoRefund(tenant.auto_refund_enabled ?? true);
            setPaymentHoldMinutes(tenant.payment_hold_minutes ?? 30);

            if (tenant.stripe_account_id) {
                // Check live status from Stripe
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const r = await fetch('https://sjzxgjimbcoqsylrglkm.supabase.co/functions/v1/stripe-connect-onboard', {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json', 
                            'X-TOOLS-KEY': 'LUXE-AUREA-SECRET-2026',
                            'Authorization': `Bearer ${session?.access_token}`
                        },
                        body: JSON.stringify({ tenant_id: tenantId, action: 'status' }),
                    });
                    const data = await r.json();
                    setStripeStatus(data);
                } catch { setStripeStatus({ connected: true, onboarding_complete: tenant.stripe_onboarding_complete }); }
            } else {
                setStripeStatus({ connected: false });
            }
        }
        setLoading(false);
    };

    useEffect(() => { fetchStatus(); }, [tenantId]);

    const handleConnect = async () => {
        setConnecting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const r = await fetch('https://sjzxgjimbcoqsylrglkm.supabase.co/functions/v1/stripe-connect-onboard', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'X-TOOLS-KEY': 'LUXE-AUREA-SECRET-2026',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({ tenant_id: tenantId, action: 'create', return_url: window.location.href + '?stripe=success', refresh_url: window.location.href + '?stripe=refresh' }),
            });
            const data = await r.json();
            if (data.onboarding_url) {
                window.open(data.onboarding_url, '_blank');
                showToast('Stripe onboarding opened in new tab!');
            } else {
                showToast(data.error || 'Failed to start onboarding', 'error');
            }
        } catch (e: any) {
            showToast('Error: ' + e.message, 'error');
        }
        setConnecting(false);
    };

    const handleSavePolicy = async () => {
        setSaving(true);
        const { error } = await supabase.from('tenants').update({
            cancellation_window_hours: cancelWindow,
            late_cancel_refund_percent: lateCancelRefund,
            no_show_refund_percent: noShowRefund,
            auto_refund_enabled: autoRefund,
            payment_hold_minutes: paymentHoldMinutes,
        }).eq('id', tenantId);

        if (!error) showToast('Refund policy saved!');
        else showToast(error.message, 'error');
        setSaving(false);
    };



    const isConnected = stripeStatus?.connected && stripeStatus?.onboarding_complete;

    return (
        <div>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-luxe-gold/10 rounded-2xl border border-luxe-gold/20">
                    <CreditCard className="w-6 h-6 text-luxe-gold" />
                </div>
                <div>
                    <h3 className="text-xl font-bold">Payments & Refunds</h3>
                    <p className="text-xs text-white/40 uppercase tracking-widest">Stripe Connect & Cancellation Policy</p>
                </div>
            </div>

            {/* Stripe Connect Status */}
            <div className="glass-panel border border-white/5 p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-luxe-gold" />
                    <h4 className="font-bold">Stripe Connect</h4>
                    {isConnected ? (
                        <span className="ml-auto flex items-center gap-1.5 text-xs font-bold text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /> Connected
                        </span>
                    ) : (
                        <span className="ml-auto flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                            <AlertTriangle className="w-3 h-3" /> Not Connected
                        </span>
                    )}
                </div>

                {isConnected ? (
                    <div className="space-y-2">
                        <div className="bg-green-500/5 border border-green-500/10 rounded-xl p-4">
                            <p className="text-sm text-green-400 font-medium">✅ Your Stripe account is connected!</p>
                            <p className="text-xs text-white/40 mt-1">Customer deposits go directly to your bank account. Voxali charges a small platform fee.</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-white/30 mt-2">
                            <span>Account: <code className="text-white/50">{stripeStatus.account_id}</code></span>
                            <span>Charges: {stripeStatus.charges_enabled ? '✅' : '❌'}</span>
                            <span>Payouts: {stripeStatus.payouts_enabled ? '✅' : '❌'}</span>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-sm text-white/50">Connect your Stripe account to receive customer deposits directly in your bank account.</p>
                        <div className="bg-white/[0.02] rounded-xl p-4 space-y-2">
                            <p className="text-xs text-white/40 font-medium">How it works:</p>
                            <div className="text-xs text-white/30 space-y-1">
                                <p>1. Click "Connect with Stripe" → Fill in your business & bank details</p>
                                <p>2. Customer pays deposit → Money goes to <span className="text-luxe-gold">your Stripe account</span></p>
                                <p>3. Voxali takes a small platform fee (automatically deducted)</p>
                            </div>
                        </div>
                        <button
                            onClick={handleConnect}
                            disabled={connecting}
                            className="bg-[#635BFF] hover:bg-[#5851db] text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                            {connecting ? 'Opening Stripe...' : 'Connect with Stripe'}
                        </button>
                    </div>
                )}
            </div>

            {/* Refund Policy */}
            <div className="glass-panel border border-white/5 p-6 mb-6">
                <div className="flex items-center gap-2 mb-5">
                    <CreditCard className="w-5 h-5 text-luxe-gold" />
                    <h4 className="font-bold">Cancellation & Refund Policy</h4>
                </div>

                <div className="space-y-6">
                    {/* Payment Hold Time */}
                    <div>
                        <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">
                            Payment Hold Time (AI Bookings)
                        </label>
                        <div className="flex items-center gap-4">
                            <input
                                type="range" min={15} max={120} step={5} value={paymentHoldMinutes}
                                onChange={e => setPaymentHoldMinutes(Number(e.target.value))}
                                className="flex-1 h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-luxe-gold"
                            />
                            <span className="text-sm font-bold text-luxe-gold min-w-[60px] text-right">{paymentHoldMinutes} min</span>
                        </div>
                        <p className="text-[10px] text-white/30 mt-1">If deposit is not paid within this time, the booking is automatically cancelled to free up the slot.</p>
                    </div>

                    {/* Cancellation Window */}
                    <div className="pt-4 border-t border-white/5">
                        <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">
                            Free Cancellation Window
                        </label>
                        <div className="flex items-center gap-4">
                            <input
                                type="range" min={1} max={72} value={cancelWindow}
                                onChange={e => setCancelWindow(Number(e.target.value))}
                                className="flex-1 h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-luxe-gold"
                            />
                            <span className="text-sm font-bold text-luxe-gold min-w-[60px] text-right">{cancelWindow} hrs</span>
                        </div>
                        <p className="text-[10px] text-white/30 mt-1">Customers can cancel for free up to {cancelWindow} hours before their appointment</p>
                    </div>

                    {/* Late Cancel Refund */}
                    <div>
                        <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">
                            Late Cancellation Refund
                        </label>
                        <div className="flex items-center gap-4">
                            <input
                                type="range" min={0} max={100} step={5} value={lateCancelRefund}
                                onChange={e => setLateCancelRefund(Number(e.target.value))}
                                className="flex-1 h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-amber-400"
                            />
                            <span className="text-sm font-bold text-amber-400 min-w-[50px] text-right">{lateCancelRefund}%</span>
                        </div>
                        <p className="text-[10px] text-white/30 mt-1">
                            {lateCancelRefund === 0 ? 'No refund for late cancellations' :
                                lateCancelRefund === 100 ? 'Full refund even for late cancellations' :
                                    `Customer gets ${lateCancelRefund}% back if they cancel within ${cancelWindow} hours of appointment`}
                        </p>
                    </div>

                    {/* No-Show Refund */}
                    <div>
                        <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">
                            No-Show Refund
                        </label>
                        <div className="flex items-center gap-4">
                            <input
                                type="range" min={0} max={100} step={5} value={noShowRefund}
                                onChange={e => setNoShowRefund(Number(e.target.value))}
                                className="flex-1 h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-red-400"
                            />
                            <span className="text-sm font-bold text-red-400 min-w-[50px] text-right">{noShowRefund}%</span>
                        </div>
                        <p className="text-[10px] text-white/30 mt-1">
                            {noShowRefund === 0 ? 'No refund for no-shows (recommended)' : `Customer gets ${noShowRefund}% back if they don't show up`}
                        </p>
                    </div>

                    {/* Auto Refund Toggle */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <div>
                            <h4 className="font-bold text-sm">Auto-Process Refunds</h4>
                            <p className="text-[10px] text-white/30 mt-0.5">Automatically process refunds when bookings are cancelled. Disable to manually approve each refund.</p>
                        </div>
                        <button onClick={() => setAutoRefund(!autoRefund)} className="transition-all" title="Toggle auto refund">
                            {autoRefund
                                ? <ToggleRight className="w-10 h-10 text-green-400" />
                                : <ToggleLeft className="w-10 h-10 text-white/30" />
                            }
                        </button>
                    </div>
                </div>
            </div>

            {/* Save */}
            <button
                onClick={handleSavePolicy}
                disabled={saving}
                className="bg-gold-gradient text-luxe-obsidian px-8 py-3 rounded-xl font-bold shadow-lg shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'SAVING...' : 'SAVE POLICY'}
            </button>
        </div>
    );
};
export const Settings: React.FC = () => {
    const { salonName, salonTagline, logoUrl, ownerName, timezone, updateBranding, refetch, tenantId } = useTenant();

    // Branding form state
    const [bName, setBName] = useState(salonName);
    const [bTagline, setBTagline] = useState(salonTagline);
    const [bOwner, setBOwner] = useState(ownerName);
    const [bLogoPreview, setBLogoPreview] = useState<string | null>(logoUrl);
    const [brandingSaving, setBrandingSaving] = useState(false);
    const [logoUploading, setLogoUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [services, setServices] = useState<Service[]>([]);
    const [hours, setHours] = useState<BusinessHour[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSvcModal, setShowSvcModal] = useState(false);
    const [editSvc, setEditSvc] = useState<Service | null>(null);
    const [saving, setSaving] = useState(false);

    // Service form
    const [sName, setSName] = useState('');
    const [sDuration, setSDuration] = useState('60');
    const [sDepositRequired, setSDepositRequired] = useState(false);
    const [sDepositAmount, setSDepositAmount] = useState('');
    const [sPrice, setSPrice] = useState('');
    const [sCategory, setSCategory] = useState(CATEGORIES[0]);

    // Services UI state
    const [svcSearch, setSvcSearch] = useState('');
    const [svcExpanded, setSvcExpanded] = useState(false);
    const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

    // Password reset state
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showOldPw, setShowOldPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [pwSaving, setPwSaving] = useState(false);

    // Timezone state
    const [selectedTz, setSelectedTz] = useState(timezone || 'America/New_York');
    const [tzSaving, setTzSaving] = useState(false);

    // Loyalty state
    const [loyaltyMultiplier, setLoyaltyMultiplier] = useState<number>(1.0);
    const [loyaltySaving, setLoyaltySaving] = useState(false);

    const [salonEmail, setSalonEmail] = useState('');
    const [salonWebsite, setSalonWebsite] = useState('');
    const [googleReviewUrl, setGoogleReviewUrl] = useState('');
    // Tab navigation
    const [activeSettingsTab, setActiveSettingsTab] = useState('general');

    useEffect(() => {
        const saved = localStorage.getItem('voxali_settings_tab');
        if (saved) {
            setActiveSettingsTab(saved);
            localStorage.removeItem('voxali_settings_tab');
        }

        const handleUpgradeRequest = () => setActiveSettingsTab('billing');
        window.addEventListener('voxali:request-upgrade', handleUpgradeRequest);
        return () => window.removeEventListener('voxali:request-upgrade', handleUpgradeRequest);
    }, []);

    // Integrations state
    const [twilioPhone, setTwilioPhone] = useState('');
    const [notifEmail, setNotifEmail] = useState('');
    const [notifEnabled, setNotifEnabled] = useState(false);
    const [integSaving, setIntegSaving] = useState(false);
    const [integLoaded, setIntegLoaded] = useState(false);

    const toggleCategory = (cat: string) => {
        setOpenCategories(prev => {
            const next = new Set(prev);
            if (next.has(cat)) next.delete(cat);
            else next.add(cat);
            return next;
        });
    };



    // Sync branding form when context updates
    useEffect(() => {
        setBName(salonName);
        setBTagline(salonTagline);
        setBOwner(ownerName);
        setBLogoPreview(logoUrl);
    }, [salonName, salonTagline, ownerName, logoUrl]);

    // Sync timezone from context
    useEffect(() => {
        if (timezone) setSelectedTz(timezone);
    }, [timezone]);

    // ===== PASSWORD RESET =====
    const handlePasswordReset = async () => {
        if (!oldPassword) { showToast('Please enter your current password', 'error'); return; }
        if (!newPassword) { showToast('Please enter a new password', 'error'); return; }
        if (newPassword.length < 6) { showToast('New password must be at least 6 characters', 'error'); return; }
        if (newPassword !== confirmPassword) { showToast('New passwords do not match', 'error'); return; }

        setPwSaving(true);
        try {
            // Step 1: Verify old password by re-signing in
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.email) { showToast('Could not verify user', 'error'); setPwSaving(false); return; }

            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: oldPassword,
            });

            if (signInError) {
                showToast('Current password is incorrect', 'error');
                setPwSaving(false);
                return;
            }

            // Step 2: Update password
            const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
            if (updateError) {
                showToast('Failed to update password: ' + updateError.message, 'error');
            } else {
                showToast('Password updated successfully!', 'success');
                setOldPassword('');
                setNewPassword('');
                setConfirmPassword('');
            }
        } catch (err) {
            showToast('An error occurred', 'error');
            console.error('[Settings] Password reset error:', err);
        }
        setPwSaving(false);
    };

    // ===== TIMEZONE SAVE =====
    const handleSaveTimezone = async () => {
        if (!tenantId || !selectedTz) return;
        setTzSaving(true);
        try {
            const { error } = await supabaseAdmin
                .from('tenants')
                .update({ timezone: selectedTz })
                .eq('id', tenantId);

            if (error) {
                showToast('Failed to save timezone: ' + error.message, 'error');
            } else {
                showToast('Timezone updated to ' + selectedTz, 'success');
                await refetch(); // Refresh tenant context
            }
        } catch (err) {
            showToast('An error occurred', 'error');
            console.error('[Settings] Timezone save error:', err);
        }
        setTzSaving(false);
    };

    const fetchAll = useCallback(async () => {
        if (!tenantId) return;
        setLoading(true);

        const { data: svcData } = await supabaseAdmin
            .from('services').select('*')
            .eq('tenant_id', tenantId).order('category').order('name');

        const { data: hourData } = await supabaseAdmin
            .from('tenant_hours').select('*')
            .eq('tenant_id', tenantId).order('day_of_week');

        const { data: tenantData } = await supabaseAdmin
            .from('tenants').select('loyalty_points_multiplier, salon_email, salon_website, google_review_url')
            .eq('id', tenantId).single();

        if (svcData) setServices(svcData);
        if (hourData) setHours(hourData);
        if (tenantData) {
            if (tenantData.loyalty_points_multiplier !== undefined) setLoyaltyMultiplier(tenantData.loyalty_points_multiplier);
            setSalonEmail(tenantData.salon_email || '');
            setSalonWebsite(tenantData.salon_website || '');
            setGoogleReviewUrl(tenantData.google_review_url || '');
        }
        
        setLoading(false);
    }, [tenantId]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // -- Branding --
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !tenantId) return;

        // Show local preview immediately
        const reader = new FileReader();
        reader.onload = (ev) => setBLogoPreview(ev.target?.result as string);
        reader.readAsDataURL(file);

        setLogoUploading(true);
        const ext = file.name.split('.').pop() || 'png';
        const path = `${tenantId}/logo.${ext}`;

        const { error: upErr } = await supabaseAdmin.storage
            .from('logos')
            .upload(path, file, { upsert: true, contentType: file.type });

        if (upErr) {
            showToast('❌ Upload failed: ' + upErr.message);
            setLogoUploading(false);
            return;
        }

        const { data: urlData } = supabaseAdmin.storage.from('logos').getPublicUrl(path);
        if (urlData?.publicUrl) {
            setBLogoPreview(urlData.publicUrl);
            showToast('✅ Logo uploaded!');
        } else {
            showToast('❌ Failed to get public URL after upload.', 'error');
        }
        setLogoUploading(false);
    };

    const handleRemoveLogo = () => {
        setBLogoPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSaveBranding = async () => {
        setBrandingSaving(true);
        const updates: Record<string, string> = {};
        if (bName !== salonName) updates.salonName = bName;
        if (bTagline !== salonTagline) updates.salonTagline = bTagline;
        if (bOwner !== ownerName) updates.ownerName = bOwner;

        // Handle logo: uploaded new, removed, or unchanged
        if (bLogoPreview !== logoUrl) {
            updates.logoUrl = bLogoPreview || '';
        }

        await supabaseAdmin.from('tenants').update({ salon_email: salonEmail || null, salon_website: salonWebsite || null, google_review_url: googleReviewUrl || null }).eq('id', tenantId);

        const ok = await updateBranding(updates);
        if (ok) {
            showToast('✅ Branding updated!');
            refetch();
        } else {
            showToast('❌ Failed to save branding');
        }
        setBrandingSaving(false);
    };

    const brandingChanged = bName !== salonName || bTagline !== salonTagline || bOwner !== ownerName || bLogoPreview !== logoUrl;

    // -- Service CRUD --
    const openAddService = () => {
        setEditSvc(null);
        setSName(''); setSDuration('60'); setSPrice(''); setSCategory(CATEGORIES[0]);
        setSDepositRequired(false); setSDepositAmount('');
        setShowSvcModal(true);
    };

    const openEditService = (s: Service) => {
        setEditSvc(s);
        setSName(s.name); setSDuration(String(s.duration)); setSPrice(String(s.price)); setSCategory(s.category);
        setSDepositRequired(s.deposit_required || false); setSDepositAmount(s.deposit_amount ? String(s.deposit_amount) : '');
        setShowSvcModal(true);
    };

    const handleSaveService = async () => {
        if (!sName || !sPrice) return;
        setSaving(true);
        let error;
        if (editSvc?.id) {
            // Update existing service
            const result = await supabaseAdmin.from('services').update({
                name: sName,
                duration: parseInt(sDuration) || 60,
                price: parseFloat(sPrice) || 0,
                category: sCategory,
                deposit_required: sDepositRequired,
                deposit_amount: sDepositRequired ? (parseFloat(sDepositAmount) || 0) : 0,
                updated_at: new Date().toISOString(),
            }).eq('id', editSvc.id);
            error = result.error;
        } else {
            // Insert new service
            const result = await supabaseAdmin.from('services').insert({
                tenant_id: tenantId,
                name: sName,
                duration: parseInt(sDuration) || 60,
                price: parseFloat(sPrice) || 0,
                category: sCategory,
                is_active: true,
                deposit_required: sDepositRequired,
                deposit_amount: sDepositRequired ? (parseFloat(sDepositAmount) || 0) : 0,
            });
            error = result.error;
        }
        if (!error) {
            showToast(editSvc ? 'Service updated!' : 'Service added!');
            setShowSvcModal(false);
            fetchAll();
        } else {
            showToast(error.message, 'error');
        }
        setSaving(false);
    };

    const toggleService = async (s: Service) => {
        const { error } = await supabase
            .from('services')
            .update({ is_active: !s.is_active, updated_at: new Date().toISOString() })
            .eq('id', s.id);
        if (!error) {
            showToast(`${s.name} ${!s.is_active ? 'activated' : 'deactivated'}`);
            fetchAll();
        }
    };

    const toggleAllServices = async (activate: boolean) => {
        const { error } = await supabaseAdmin
            .from('services')
            .update({ is_active: activate, updated_at: new Date().toISOString() })
            .eq('tenant_id', tenantId);
        if (!error) {
            showToast(activate ? 'All services activated!' : 'All services deactivated!');
            fetchAll();
        } else {
            showToast('Failed: ' + error.message, 'error');
        }
    };

    // -- Business Hours --
    const updateHour = async (day: number, field: 'open_time' | 'close_time' | 'is_open', value: string | boolean) => {
        const existing = hours.find(h => h.day_of_week === day);
        const openT = field === 'open_time' ? value as string : (existing?.open_time || '09:00');
        const closeT = field === 'close_time' ? value as string : (existing?.close_time || '21:00');
        const isO = field === 'is_open' ? value as boolean : (existing?.is_open ?? true);

        // Optimistically update local state
        const updatedHours = [...hours];
        const idx = updatedHours.findIndex(h => h.day_of_week === day);
        const newRecord = {
            id: existing?.id || crypto.randomUUID(),
            tenant_id: tenantId,
            day_of_week: day,
            open_time: openT,
            close_time: closeT,
            is_open: isO,
        };
        if (idx >= 0) updatedHours[idx] = newRecord as BusinessHour;
        else updatedHours.push(newRecord as BusinessHour);
        setHours(updatedHours);

        // Save to DB - update if exists, insert if not
        let error;
        if (existing?.id) {
            const res = await supabase
                .from('tenant_hours')
                .update({ open_time: openT, close_time: closeT, is_open: isO })
                .eq('id', existing.id);
            error = res.error;
        } else {
            const res = await supabase
                .from('tenant_hours')
                .insert({ tenant_id: tenantId, day_of_week: day, open_time: openT, close_time: closeT, is_open: isO });
            error = res.error;
        }

        if (!error) {
            showToast(`${DAY_NAMES[day]} updated`);
        } else {
            showToast('Save failed: ' + error.message, 'error');
            fetchAll(); // Revert on error
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-luxe-gold animate-spin" /></div>;
    }

    // Group services by category, including custom/unknown categories
    const allCategories = [...new Set([...CATEGORIES, ...services.map(s => s.category)])];
    const grouped = allCategories.map(cat => ({
        category: cat,
        items: services.filter(s => s.category === cat),
    })).filter(g => g.items.length > 0);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* ============ TAB NAVIGATION ============ */}
            <div className="flex items-center gap-1 border-b border-white/10 pb-0">
                {[
                    { id: 'general', label: 'General', icon: Building2 },
                    { id: 'services', label: 'Services', icon: Scissors },
                    { id: 'availability', label: 'Availability', icon: Clock },
                    { id: 'security', label: 'Security', icon: Lock },
                    { id: 'integrations', label: 'Integrations', icon: Zap },
                    { id: 'billing', label: 'Wallet & Billing', icon: BillingIcon },
                    { id: 'payments', label: 'Payments', icon: CreditCard },
                ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeSettingsTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSettingsTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-all relative
                                ${isActive
                                    ? 'text-luxe-gold'
                                    : 'text-white/40 hover:text-white/70'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                            {isActive && (
                                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-luxe-gold rounded-full" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ============ GENERAL TAB — BRANDING ============ */}
            {activeSettingsTab === 'general' && (
                <div>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-luxe-gold/10 rounded-2xl border border-luxe-gold/20">
                            <Building2 className="w-6 h-6 text-luxe-gold" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Salon Branding</h3>
                            <p className="text-xs text-white/40 uppercase tracking-widest">Name, Logo & Identity</p>
                        </div>
                    </div>

                    <div className="glass-panel border border-white/5 p-6">
                        <div className="flex flex-col md:flex-row gap-8">
                            {/* Logo Upload */}
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-28 h-28 rounded-2xl border-2 border-dashed border-white/20 hover:border-luxe-gold/50 flex items-center justify-center cursor-pointer transition-all group overflow-hidden bg-white/5"
                                    >
                                        {bLogoPreview ? (
                                            <img src={bLogoPreview} alt="Logo" className="w-full h-full object-cover rounded-2xl" />
                                        ) : (
                                            <div className="flex flex-col items-center gap-2 text-white/30 group-hover:text-luxe-gold transition-colors">
                                                <Upload className="w-8 h-8" />
                                                <span className="text-[9px] font-bold uppercase tracking-wider">Upload Logo</span>
                                            </div>
                                        )}
                                        {logoUploading && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl">
                                                <Loader2 className="w-6 h-6 text-luxe-gold animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                    {bLogoPreview && (
                                        <button
                                            onClick={handleRemoveLogo}
                                            title="Remove logo"
                                            className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                    className="hidden"
                                />
                                <p className="text-[9px] text-white/20 text-center">Click to upload<br />PNG, JPG (max 2MB)</p>
                            </div>

                            {/* Form Fields */}
                            <div className="flex-1 space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Salon Name</label>
                                    <input
                                        value={bName}
                                        onChange={e => setBName(e.target.value)}
                                        placeholder="e.g. Luxe Aurea"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Tagline</label>
                                        <input
                                            value={bTagline}
                                            onChange={e => setBTagline(e.target.value)}
                                            placeholder="e.g. Salon & Spa"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Owner Name</label>
                                        <input
                                            value={bOwner}
                                            onChange={e => setBOwner(e.target.value)}
                                            placeholder="e.g. Sarah"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Live Preview */}
                                <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5">
                                    <p className="text-[9px] text-white/30 uppercase tracking-wider font-bold mb-3">Live Preview</p>
                                    <div className="flex items-center gap-3">
                                        {bLogoPreview ? (
                                            <img src={bLogoPreview} alt="Preview" className="w-10 h-10 rounded-lg object-cover" />
                                        ) : (
                                            <div className="w-10 h-10 bg-gold-gradient rounded-lg flex items-center justify-center">
                                                <span className="text-luxe-obsidian font-bold text-xl">{bName.charAt(0)}</span>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-bold">{bName.toUpperCase()}</p>
                                            <p className="text-[10px] text-luxe-gold/60 uppercase tracking-[0.2em]">{bTagline}</p>
                                        </div>
                                        <div className="ml-auto text-right">
                                            <p className="text-xs font-bold">{bOwner} (Owner)</p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleSaveBranding}
                                    disabled={brandingSaving || !brandingChanged}
                                    className="bg-gold-gradient text-luxe-obsidian px-8 py-3 rounded-xl font-bold shadow-lg shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {brandingSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {brandingSaving ? 'SAVING...' : 'SAVE BRANDING'}
                                </button>
                            </div>
                        </div>
                    </div>

                    
                    {/* ============ SALON CONTACT INFO ============ */}
                    <div className="flex items-center gap-3 mt-10 mb-6">
                        <div className="p-3 bg-luxe-gold/10 rounded-2xl border border-luxe-gold/20">
                            <Mail className="w-6 h-6 text-luxe-gold" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Salon Contact Info</h3>
                            <p className="text-xs text-white/40 uppercase tracking-widest">Shown in emails & notifications</p>
                        </div>
                    </div>

                    <div className="glass-panel border border-white/5 p-6 mb-6">
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Salon Email</label>
                                <input
                                    value={salonEmail} onChange={e => setSalonEmail(e.target.value)}
                                    placeholder="info@yoursalon.com"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Website</label>
                                <input
                                    value={salonWebsite} onChange={e => setSalonWebsite(e.target.value)}
                                    placeholder="https://www.yoursalon.com"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Google Review Link</label>
                                <input
                                    value={googleReviewUrl} onChange={e => setGoogleReviewUrl(e.target.value)}
                                    placeholder="https://g.page/r/your-salon/review"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all"
                                />
                                <p className="text-xs text-white/30 mt-2">Shown in \"Thank You\" emails — clients can rate your salon on Google.</p>
                            </div>
                        </div>
                        <button
                            onClick={handleSaveBranding}
                            disabled={brandingSaving}
                            className="bg-gold-gradient text-luxe-obsidian px-8 py-3 w-full rounded-xl font-bold shadow-lg shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-50"
                        >
                            {brandingSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {brandingSaving ? 'SAVING...' : 'SAVE SETTINGS'}
                        </button>
                    </div>

{/* ============ LOYALTY PROGRAM SETTINGS ============ */}
                    <div className="flex items-center gap-3 mt-10 mb-6">
                        <div className="p-3 bg-luxe-gold/10 rounded-2xl border border-luxe-gold/20">
                            <Zap className="w-6 h-6 text-luxe-gold" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Loyalty Program & Points</h3>
                            <p className="text-xs text-white/40 uppercase tracking-widest">Reward clients for their visits</p>
                        </div>
                    </div>

                    <div className="glass-panel border border-white/5 p-6 mb-6">
                        <p className="text-sm text-white/60 mb-6 border border-luxe-gold/20 bg-luxe-gold/5 p-4 rounded-xl">
                            Set how many points a client earns per <strong className="text-luxe-gold">$1 spent</strong>. Points are automatically awarded when an appointment is marked as <strong>Completed</strong>.
                        </p>
                        
                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            <div className="flex-1 space-y-4 w-full">
                                <div>
                                    <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Points per $1 Spent</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number" step="0.5" min="0" value={loyaltyMultiplier}
                                            onChange={e => setLoyaltyMultiplier(parseFloat(e.target.value) || 0)}
                                            className="w-32 bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all font-bold text-center"
                                        />
                                        <div className="text-xs text-white/40 leading-relaxed">
                                            <span>e.g., <strong>1.0</strong> means $100 service = 100 points. <br/> <strong>0.5</strong> means $100 service = 50 points.</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <button
                                    onClick={async () => {
                                        setLoyaltySaving(true);
                                        const { error } = await supabaseAdmin.from('tenants').update({ loyalty_points_multiplier: loyaltyMultiplier }).eq('id', tenantId);
                                        if (!error) showToast('Loyalty settings saved!');
                                        else showToast('Failed to save: ' + error.message, 'error');
                                        setLoyaltySaving(false);
                                    }}
                                    disabled={loyaltySaving}
                                    className="bg-gold-gradient text-luxe-obsidian px-8 py-3 rounded-xl font-bold shadow-lg shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mt-4"
                                >
                                    {loyaltySaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {loyaltySaving ? 'SAVING...' : 'SAVE LOYALTY RULES'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ============ SERVICES TAB ============ */}
            {activeSettingsTab === 'services' && (
                <>
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-luxe-gold/10 rounded-2xl border border-luxe-gold/20">
                                    <Scissors className="w-6 h-6 text-luxe-gold" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">Services</h3>
                                    <p className="text-xs text-white/40 uppercase tracking-widest">Manage your salon menu</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => toggleAllServices(true)}
                                    className="px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-all">
                                    <ToggleRight className="w-4 h-4" /> ALL ON
                                </button>
                                <button onClick={() => toggleAllServices(false)}
                                    className="px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all">
                                    <ToggleLeft className="w-4 h-4" /> ALL OFF
                                </button>
                                <button onClick={openAddService}
                                    className="bg-gold-gradient text-luxe-obsidian px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                                    <Plus className="w-5 h-5" /> ADD SERVICE
                                </button>
                            </div>
                        </div>

                        {/* Master Services Panel */}
                        <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden">
                            {/* Master Expand/Collapse Header */}
                            <button
                                onClick={() => setSvcExpanded(prev => !prev)}
                                className="w-full flex items-center justify-between px-6 py-4 bg-white/[0.03] hover:bg-white/[0.06] transition-all group cursor-pointer"
                            >
                                <div className="flex items-center gap-3">
                                    <Scissors className="w-5 h-5 text-luxe-gold" />
                                    <span className="text-sm font-bold text-white">
                                        All Services
                                    </span>
                                    <span className="text-[10px] text-white/30 font-medium bg-white/5 px-2.5 py-0.5 rounded-full">
                                        {services.length} total
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-white/30 font-medium group-hover:text-luxe-gold transition-colors">
                                        {svcExpanded ? 'Collapse' : 'Expand'}
                                    </span>
                                    {svcExpanded
                                        ? <ChevronUp className="w-5 h-5 text-white/30 group-hover:text-luxe-gold transition-colors" />
                                        : <ChevronDown className="w-5 h-5 text-white/30 group-hover:text-luxe-gold transition-colors" />
                                    }
                                </div>
                            </button>

                            {/* Expanded content: search + categories */}
                            {svcExpanded && (
                                <div className="border-t border-white/5">
                                    {/* Search Bar */}
                                    <div className="relative px-5 py-4 bg-white/[0.01]">
                                        <Search className="absolute left-9 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                        <input
                                            value={svcSearch}
                                            onChange={e => setSvcSearch(e.target.value)}
                                            placeholder="Search services..."
                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm outline-none focus:border-luxe-gold/50 placeholder:text-white/20 transition-all"
                                        />
                                        {svcSearch && (
                                            <button onClick={() => setSvcSearch('')} title="Clear search" className="absolute right-8 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-lg transition-all">
                                                <X className="w-3.5 h-3.5 text-white/40" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Category Sub-Accordions */}
                                    <div className="px-4 pb-4 space-y-2">
                                        {(() => {
                                            const searchLower = svcSearch.toLowerCase().trim();
                                            const filteredGroups = grouped.map(g => ({
                                                ...g,
                                                items: searchLower
                                                    ? g.items.filter(s => s.name.toLowerCase().includes(searchLower) || s.category.toLowerCase().includes(searchLower))
                                                    : g.items,
                                            })).filter(g => g.items.length > 0);

                                            if (filteredGroups.length === 0) {
                                                return (
                                                    <div className="py-8 text-center">
                                                        <Scissors className="w-10 h-10 text-white/10 mx-auto mb-3" />
                                                        <p className="text-white/30 text-sm">{svcSearch ? 'No services match your search.' : 'No services yet.'}</p>
                                                    </div>
                                                );
                                            }

                                            return filteredGroups.map(g => {
                                                const isCatOpen = searchLower ? true : openCategories.has(g.category);
                                                const activeCount = g.items.filter(s => s.is_active).length;
                                                return (
                                                    <div key={g.category} className="rounded-xl border border-white/5 overflow-hidden bg-white/[0.02]">
                                                        {/* Category header */}
                                                        <button
                                                            onClick={() => { if (!searchLower) toggleCategory(g.category); }}
                                                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.04] transition-all group cursor-pointer"
                                                        >
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-7 h-7 rounded-lg bg-luxe-gold/10 flex items-center justify-center border border-luxe-gold/15">
                                                                    <Scissors className="w-3.5 h-3.5 text-luxe-gold" />
                                                                </div>
                                                                <span className="text-[11px] font-black uppercase tracking-[0.12em] text-luxe-gold">
                                                                    {g.category}
                                                                </span>
                                                                <span className="text-[9px] text-white/20 font-medium">
                                                                    ({activeCount}/{g.items.length})
                                                                </span>
                                                            </div>
                                                            {isCatOpen
                                                                ? <ChevronUp className="w-4 h-4 text-white/20 group-hover:text-luxe-gold transition-colors" />
                                                                : <ChevronDown className="w-4 h-4 text-white/20 group-hover:text-luxe-gold transition-colors" />
                                                            }
                                                        </button>

                                                        {/* Services inside category */}
                                                        {isCatOpen && (
                                                            <div className="divide-y divide-white/5 border-t border-white/5">
                                                                {g.items.map(svc => (
                                                                    <div key={svc.id} className={`flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors ${!svc.is_active ? 'opacity-40' : ''}`}>
                                                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                            <div className="w-8 h-8 rounded-lg bg-luxe-gold/10 flex items-center justify-center flex-shrink-0">
                                                                                <Scissors className="w-3.5 h-3.5 text-luxe-gold" />
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="font-bold text-sm truncate">{svc.name}</p>
                                                                                <p className="text-[10px] text-white/30">
                                                                                    {svc.duration} min
                                                                                    {svc.deposit_required && <span className="ml-2 text-amber-400/70">💰 ${svc.deposit_amount} deposit</span>}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                                                                            <span className="text-sm font-black text-green-400">${svc.price}</span>
                                                                            <button onClick={() => openEditService(svc)} title="Edit"
                                                                                className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-luxe-gold hover:bg-luxe-gold/10 transition-all">
                                                                                <Edit3 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                            <button onClick={() => toggleService(svc)} title={svc.is_active ? 'Deactivate' : 'Activate'}
                                                                                className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-white transition-all">
                                                                                {svc.is_active ? <ToggleRight className="w-4 h-4 text-green-400" /> : <ToggleLeft className="w-4 h-4 text-red-400" />}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* ============ AVAILABILITY TAB — HOURS + TIMEZONE ============ */}
            {activeSettingsTab === 'availability' && (
                <>
                    {/* ============ BUSINESS HOURS SECTION ============ */}
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-luxe-gold/10 rounded-2xl border border-luxe-gold/20">
                                <Clock className="w-6 h-6 text-luxe-gold" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">Business Hours</h3>
                                <p className="text-xs text-white/40 uppercase tracking-widest">Set opening times per day</p>
                            </div>
                        </div>

                        <div className="glass-panel border border-white/5 overflow-hidden">
                            <div className="divide-y divide-white/5">
                                {[1, 2, 3, 4, 5, 6, 0].map(dow => {
                                    const h = hours.find(hr => hr.day_of_week === dow);
                                    return (
                                        <div key={dow} className={`flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors ${h?.is_open === false ? 'opacity-40' : ''}`}>
                                            <div className="w-32">
                                                <p className="font-bold text-sm">{DAY_NAMES[dow]}</p>
                                            </div>
                                            <div className="flex items-center gap-4 flex-1 justify-center">
                                                <input type="time" value={h?.open_time?.slice(0, 5) || '09:00'}
                                                    onChange={e => updateHour(dow, 'open_time', e.target.value)}
                                                    disabled={h?.is_open === false}
                                                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-luxe-gold/50 disabled:opacity-30 transition-all" />
                                                <span className="text-white/30 text-xs font-bold">TO</span>
                                                <input type="time" value={h?.close_time?.slice(0, 5) || '21:00'}
                                                    onChange={e => updateHour(dow, 'close_time', e.target.value)}
                                                    disabled={h?.is_open === false}
                                                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-luxe-gold/50 disabled:opacity-30 transition-all" />
                                            </div>
                                            <button onClick={() => updateHour(dow, 'is_open', !(h?.is_open ?? true))}
                                                className="ml-4">
                                                {h?.is_open !== false ? (
                                                    <div className="flex items-center gap-2 bg-green-500/10 text-green-400 px-3 py-1.5 rounded-lg border border-green-500/20 text-xs font-bold">
                                                        <ToggleRight className="w-4 h-4" /> OPEN
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg border border-red-500/20 text-xs font-bold">
                                                        <ToggleLeft className="w-4 h-4" /> CLOSED
                                                    </div>
                                                )}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* ============ TIMEZONE SECTION ============ */}
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-luxe-gold/10 rounded-2xl border border-luxe-gold/20">
                                <Globe className="w-6 h-6 text-luxe-gold" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">Timezone</h3>
                                <p className="text-xs text-white/40 uppercase tracking-widest">Set your salon's local timezone</p>
                            </div>
                        </div>

                        <div className="glass-panel border border-white/5 p-6">
                            <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                                <div className="flex-1">
                                    <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Salon Timezone</label>
                                    <select
                                        value={selectedTz}
                                        onChange={e => setSelectedTz(e.target.value)}
                                        title="Select timezone"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all"
                                    >
                                        {TIMEZONES.map(tz => (
                                            <option key={tz.value} value={tz.value}>{tz.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="text-sm text-white/40">
                                    Current time: <span className="text-luxe-gold font-bold">
                                        {new Date().toLocaleTimeString('en-US', { timeZone: selectedTz, hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <button
                                    onClick={handleSaveTimezone}
                                    disabled={tzSaving || selectedTz === timezone}
                                    className="bg-gold-gradient text-luxe-obsidian px-8 py-3 rounded-xl font-bold shadow-lg shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {tzSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {tzSaving ? 'SAVING...' : 'SAVE TIMEZONE'}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ============ SECURITY TAB — PASSWORD ============ */}
            {activeSettingsTab === 'security' && (
                <div>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-luxe-gold/10 rounded-2xl border border-luxe-gold/20">
                            <KeyRound className="w-6 h-6 text-luxe-gold" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Change Password</h3>
                            <p className="text-xs text-white/40 uppercase tracking-widest">Update your account password</p>
                        </div>
                    </div>

                    <div className="glass-panel border border-white/5 p-6">
                        <div className="max-w-md space-y-4">
                            {/* Old Password */}
                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Current Password</label>
                                <div className="relative">
                                    <input
                                        type={showOldPw ? 'text' : 'password'}
                                        value={oldPassword}
                                        onChange={e => setOldPassword(e.target.value)}
                                        placeholder="Enter your current password"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pr-12 text-sm outline-none focus:border-luxe-gold/50 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowOldPw(!showOldPw)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                                        aria-label="Toggle old password visibility"
                                    >
                                        {showOldPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* New Password */}
                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">New Password</label>
                                <div className="relative">
                                    <input
                                        type={showNewPw ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        placeholder="Enter new password (min 6 chars)"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pr-12 text-sm outline-none focus:border-luxe-gold/50 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPw(!showNewPw)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                                        aria-label="Toggle new password visibility"
                                    >
                                        {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm New Password */}
                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="Re-enter new password"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all"
                                />
                                {confirmPassword && newPassword !== confirmPassword && (
                                    <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
                                )}
                            </div>

                            <button
                                onClick={handlePasswordReset}
                                disabled={pwSaving || !oldPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                                className="bg-gold-gradient text-luxe-obsidian px-8 py-3 rounded-xl font-bold shadow-lg shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                                {pwSaving ? 'UPDATING...' : 'UPDATE PASSWORD'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============ INTEGRATIONS TAB ============ */}
            {activeSettingsTab === 'integrations' && tenantId && (
                <IntegrationsTab
                    tenantId={tenantId}
                    twilioPhone={twilioPhone} setTwilioPhone={setTwilioPhone}
                    notifEmail={notifEmail} setNotifEmail={setNotifEmail}
                    notifEnabled={notifEnabled} setNotifEnabled={setNotifEnabled}
                    integSaving={integSaving} setIntegSaving={setIntegSaving}
                    integLoaded={integLoaded} setIntegLoaded={setIntegLoaded}
                />
            )}




            {/* ============ PAYMENTS TAB ============ */}
            {activeSettingsTab === 'payments' && tenantId && (
                <PaymentsTab tenantId={tenantId} />
            )}


            {/* ============ WALLET & BILLING TAB ============ */}
            {activeSettingsTab === 'billing' && tenantId && (
                <BillingTab tenantId={tenantId} />
            )}

            {/* ============ SERVICE MODAL ============ */}
            {showSvcModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSvcModal(false)}>
                    <div className="bg-luxe-obsidian border border-white/10 rounded-2xl p-8 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                {editSvc ? <Edit3 className="w-6 h-6 text-luxe-gold" /> : <Plus className="w-6 h-6 text-luxe-gold" />}
                                {editSvc ? 'Edit Service' : 'Add New Service'}
                            </h3>
                            <button onClick={() => setShowSvcModal(false)} title="Close" className="p-2 hover:bg-white/10 rounded-xl transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Service Name *</label>
                                <input value={sName} onChange={e => setSName(e.target.value)} placeholder="e.g. Balayage"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Category</label>
                                <select value={sCategory} onChange={e => setSCategory(e.target.value)} title="Select category"
                                    className="w-full bg-zinc-900 text-white border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all">
                                    {CATEGORIES.map(c => <option className="bg-zinc-900 text-white" key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Duration (min)</label>
                                    <select value={sDuration} onChange={e => setSDuration(e.target.value)} title="Select duration"
                                        className="w-full bg-zinc-900 text-white border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all">
                                        {[15, 30, 45, 60, 75, 90, 120, 150, 180].map(d => (
                                            <option className="bg-zinc-900 text-white" key={d} value={String(d)}>{d} min</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Price ($) *</label>
                                    <input type="number" value={sPrice} onChange={e => setSPrice(e.target.value)} placeholder="0.00" min="0" step="5"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all" />
                                </div>
                            </div>

                            {/* Deposit / Advance Payment */}
                            <div className="pt-4 border-t border-white/10">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <label className="text-xs font-bold text-white/50 uppercase tracking-wider">Advance Payment Required</label>
                                        <p className="text-[10px] text-white/30 mt-0.5">Customer pays deposit before booking is confirmed</p>
                                    </div>
                                    <button type="button" onClick={() => setSDepositRequired(!sDepositRequired)}
                                        className="transition-all" title="Toggle deposit">
                                        {sDepositRequired
                                            ? <ToggleRight className="w-9 h-9 text-amber-400" />
                                            : <ToggleLeft className="w-9 h-9 text-white/20" />
                                        }
                                    </button>
                                </div>
                                {sDepositRequired && (
                                    <div>
                                        <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Deposit Amount ($)</label>
                                        <input type="number" value={sDepositAmount} onChange={e => setSDepositAmount(e.target.value)} placeholder="e.g. 25" min="0" step="5"
                                            className="w-full bg-white/5 border border-amber-500/30 rounded-xl p-3 text-sm outline-none focus:border-amber-400/50 transition-all" />
                                        <p className="text-[10px] text-amber-400/50 mt-1">This amount will be charged as advance payment via Stripe</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <button onClick={handleSaveService} disabled={saving || !sName || !sPrice}
                            className="w-full mt-6 bg-gold-gradient text-luxe-obsidian font-bold py-3 rounded-xl shadow-lg shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            {saving ? 'SAVING...' : editSvc ? 'UPDATE SERVICE' : 'ADD SERVICE'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
