import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import {
    Megaphone, Send, Plus, Loader2, Users, MessageSquare, Mail, X, Rocket,
    CheckCircle2, Circle, Sparkles, Zap, Heart, Gift, Star, Clock, UserPlus, PartyPopper,
    Download, Share2, QrCode
} from 'lucide-react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { useTenant } from '../context/TenantContext';
import { showToast } from './ui/ToastNotification';
import { ConfirmModal } from './ui/ConfirmModal';
import { PageSkeleton } from './ui/Skeleton';
import { FeatureLock } from './ui/FeatureLock';

interface Campaign {
    id: string;
    name: string;
    message: string;
    audience: string;
    channel: string;
    status: string;
    sent_count: number;
    created_at: string;
}

interface ClientItem {
    id: string;
    name: string;
    email: string;
    phone: string;
}

const AUDIENCE_LABELS: Record<string, string> = {
    all_clients: 'All Clients',
    vip_only: 'VIP Only',
    inactive: 'Inactive (30+ days)',
    new_this_month: 'New This Month',
};

const CHANNEL_ICONS: Record<string, React.ElementType> = {
    sms: MessageSquare,
    email: Mail,
    both: Send,
};

const TEMPLATES = [
    { icon: '⚡', name: 'Flash Sale', color: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30', msg: 'Hi {name}! ⚡ Flash Sale at {salon}! Get 15% off all services this weekend. Book your spot now!' },
    { icon: '🎂', name: 'Birthday Special', color: 'from-pink-500/20 to-purple-500/20 border-pink-500/30', msg: 'Happy Birthday {name}! 🎉 Celebrate with 20% off your next visit at {salon}. Treat yourself!' },
    { icon: '💛', name: 'VIP Reward', color: 'from-amber-500/20 to-yellow-500/20 border-amber-500/30', msg: 'Hi {name}! As a VIP client, enjoy a FREE service upgrade on your next booking at {salon}! 💛' },
    { icon: '👋', name: 'We Miss You', color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30', msg: 'Hey {name}! It\'s been a while! Come back with 20% off your next visit at {salon}. We miss you! 👋' },
    { icon: '🌸', name: 'Seasonal Promo', color: 'from-green-500/20 to-emerald-500/20 border-green-500/30', msg: '{name}, refresh your look this season! ✨ Enjoy special packages at {salon}. Book now!' },
    { icon: '⭐', name: 'Referral Bonus', color: 'from-indigo-500/20 to-violet-500/20 border-indigo-500/30', msg: 'Hi {name}! Refer a friend to {salon} and you both get 15% off your next visit! ⭐' },
    { icon: '🆕', name: 'New Service', color: 'from-teal-500/20 to-cyan-500/20 border-teal-500/30', msg: 'Hi {name}! We\'ve added something new at {salon}! Try our latest service with 10% off! 🆕' },
    { icon: '📅', name: 'Last-Minute Slot', color: 'from-red-500/20 to-rose-500/20 border-red-500/30', msg: 'Hey {name}! A last-minute slot just opened up at {salon}! Book now before it\'s gone! 📅' },
];

const selectStyle: React.CSSProperties = { backgroundColor: '#1A1A1F', color: '#E0E0E0' };
const optionStyle: React.CSSProperties = { backgroundColor: '#1A1A1F', color: '#E0E0E0' };

export const Marketing: React.FC = () => {
    const { tenantId, salonName: tenantSalonName, slug } = useTenant();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: '', message: '', audience: 'all_clients', channel: 'email' });
    const [launching, setLaunching] = useState<string | null>(null);
    const [launchTarget, setLaunchTarget] = useState<Campaign | null>(null);

    // Client selection state
    const [showClientList, setShowClientList] = useState(false);
    const [clients, setClients] = useState<ClientItem[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loadingClients, setLoadingClients] = useState(false);

    const salonName = tenantSalonName || 'Salon';

    const fetchCampaigns = useCallback(async () => {
        if (!tenantId) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('marketing_campaigns')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });
        if (!error && data) setCampaigns(data as Campaign[]);
        setLoading(false);
    }, [tenantId]);

    useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

    // Fetch clients matching audience when launching
    const fetchClients = async (audience: string) => {
        setLoadingClients(true);
        let query = supabaseAdmin.from('clients').select('id, name, email, phone').eq('tenant_id', tenantId);
        if (audience === 'vip_only') query = query.eq('is_vip', true);
        // For inactive and new_this_month, fetch all and let Edge Function filter
        const { data } = await query.order('name');
        const clientList = (data || []) as ClientItem[];
        setClients(clientList);
        setSelectedIds(new Set(clientList.map(c => c.id)));
        setLoadingClients(false);
    };

    const handleSelectTemplate = (t: typeof TEMPLATES[0]) => {
        setForm(p => ({
            ...p,
            name: t.name,
            message: t.msg.replace(/\{salon\}/gi, salonName),
        }));
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.message.trim()) return;
        setSaving(true);
        const { error } = await supabase.from('marketing_campaigns').insert({
            tenant_id: tenantId,
            name: form.name.trim(),
            message: form.message.trim(),
            audience: form.audience,
            channel: form.channel,
            status: 'draft',
        });
        if (!error) {
            setForm({ name: '', message: '', audience: 'all_clients', channel: 'email' });
            setShowForm(false);
            showToast('Campaign saved as draft');
            fetchCampaigns();
        } else {
            showToast(error.message, 'error');
        }
        setSaving(false);
    };

    // Open client selection modal before launching
    const handlePreLaunch = (c: Campaign) => {
        setLaunchTarget(c);
        setShowClientList(true);
        fetchClients(c.audience);
    };

    const toggleClient = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedIds.size === clients.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(clients.map(c => c.id)));
    };

    const handleLaunch = async () => {
        if (!launchTarget || selectedIds.size === 0) return;
        setLaunching(launchTarget.id);

        try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const res = await fetch(`${supabaseUrl}/functions/v1/send-campaign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    campaign_id: launchTarget.id,
                    tenant_id: tenantId,
                    selected_client_ids: Array.from(selectedIds),
                }),
            });
            const data = await res.json();

            if (!res.ok || data?.error) {
                showToast('Launch failed: ' + (data?.error || res.statusText), 'error');
            } else {
                showToast(`🚀 Campaign launched! ${data?.sent || 0} sent, ${data?.failed || 0} failed`);
            }
        } catch (err: unknown) {
            showToast('Launch error: ' + (err instanceof Error ? err.message : 'Unknown'), 'error');
        }

        setLaunching(null);
        setLaunchTarget(null);
        setShowClientList(false);
        fetchCampaigns();
    };

    const handleDownloadQR = () => {
        const canvas = document.getElementById('booking-qr-code') as HTMLCanvasElement;
        if (!canvas) return;
        const pngUrl = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `${salonName.replace(/\\s+/g, '_')}_Booking_QR.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        showToast('QR Code download started!');
    };

    const handleShareQR = async () => {
        const url = `https://voxali.net/book/${slug}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Book an Appointment at ${salonName}`,
                    text: `Book your next appointment with us!`,
                    url: url,
                });
            } catch (err) {
                console.log("Share cancelled or failed");
            }
        } else {
            navigator.clipboard.writeText(url);
            showToast('Link copied! (Native sharing not supported here)');
        }
    };

    if (loading) return <PageSkeleton />;

    return (
        <FeatureLock 
            requiredTier="growth" 
            featureName="Marketing Campaigns" 
            description="Launch SMS & Email campaigns, blast promos, and recover inactive clients with automated marketing tools."
        >
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-luxe-gold/10 rounded-2xl border border-luxe-gold/20">
                        <Megaphone className="w-6 h-6 text-luxe-gold" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">Marketing Campaigns</h3>
                        <p className="text-xs text-white/40 uppercase tracking-widest">Client Outreach & Promotions</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 bg-gold-gradient text-luxe-obsidian px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm"
                >
                    {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {showForm ? 'CANCEL' : 'NEW CAMPAIGN'}
                </button>
            </div>

            {/* Booking Page & QR Section */}
            {slug && (
                <div className="glass-panel p-6 lg:p-8 border-2 border-luxe-gold/30 rounded-3xl animate-in slide-in-from-top-2 duration-300 relative overflow-hidden group">
                    {/* Glowing Accent */}
                    <div className="absolute -right-20 -top-20 w-64 h-64 bg-luxe-gold/10 rounded-full blur-3xl group-hover:bg-luxe-gold/20 transition-all duration-700 pointer-events-none"></div>

                    <div className="flex flex-col lg:flex-row items-center gap-8 relative z-10">
                        {/* Left Side: Link & Info */}
                        <div className="flex-1 space-y-4 w-full text-center lg:text-left">
                            <div className="flex items-center gap-3 justify-center lg:justify-start">
                                <div className="p-2.5 bg-luxe-gold/20 rounded-xl">
                                    <Star className="w-6 h-6 text-luxe-gold" />
                                </div>
                                <h4 className="text-xl font-black text-white">Your Booking Portal</h4>
                            </div>
                            <p className="text-sm text-white/60">
                                Share this link on your Instagram, Facebook, or WhatsApp so clients can book appointments and automatically pay deposits 24/7.
                            </p>
                            
                            <div className="flex items-center gap-2 max-w-lg mx-auto lg:mx-0 bg-black/50 p-1.5 rounded-xl border border-white/10 overflow-hidden">
                                <input 
                                    readOnly 
                                    value={`https://voxali.net/book/${slug}`} 
                                    className="flex-1 bg-transparent border-none text-white/90 text-sm font-medium px-3 outline-none"
                                />
                                <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(`https://voxali.net/book/${slug}`);
                                        showToast('Booking link copied to clipboard!');
                                    }}
                                    className="bg-gold-gradient text-black px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider hover:opacity-90 transition-opacity whitespace-nowrap"
                                >
                                    Copy Link
                                </button>
                            </div>
                        </div>

                        {/* Right Side: QR Code Generator */}
                        <div className="flex flex-col items-center p-5 bg-black/40 border border-white/10 rounded-2xl min-w-[280px]">
                            <div className="bg-white p-3 rounded-xl mb-4 shadow-xl shadow-black/50 overflow-hidden group-hover:scale-105 transition-transform duration-500">
                                <QRCodeCanvas
                                    id="booking-qr-code"
                                    value={`https://voxali.net/book/${slug}`}
                                    size={160}
                                    bgColor={"#ffffff"}
                                    fgColor={"#000000"}
                                    level={"H"}
                                    includeMargin={false}
                                />
                            </div>
                            
                            <div className="text-center w-full">
                                <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">Share Offline</p>
                                <div className="flex gap-2 justify-center">
                                    <button 
                                        onClick={handleDownloadQR}
                                        className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors"
                                    >
                                        <Download className="w-3.5 h-3.5" /> Download
                                    </button>
                                    <button 
                                        onClick={handleShareQR}
                                        className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors text-luxe-gold border-luxe-gold/30 hover:bg-luxe-gold/10"
                                    >
                                        <Share2 className="w-3.5 h-3.5" /> Share
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Form */}
            {showForm && (
                <div className="glass-panel p-6 border border-luxe-gold/20 space-y-5 animate-in slide-in-from-top-2 duration-300">
                    {/* Template Cards */}
                    <div>
                        <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3 block flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-luxe-gold" /> Quick Templates
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {TEMPLATES.map((t) => (
                                <button
                                    key={t.name}
                                    onClick={() => handleSelectTemplate(t)}
                                    className={`bg-gradient-to-br ${t.color} border rounded-xl p-3 text-left hover:scale-[1.03] active:scale-[0.97] transition-all group`}
                                >
                                    <span className="text-lg">{t.icon}</span>
                                    <p className="text-[11px] font-bold text-white/80 mt-1 group-hover:text-white transition-colors">{t.name}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Form Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Campaign Name</label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                                placeholder="e.g. Valentine's Day Promo"
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Audience</label>
                                <select
                                    aria-label="Select audience"
                                    value={form.audience}
                                    onChange={(e) => setForm(p => ({ ...p, audience: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50"
                                    style={selectStyle}
                                >
                                    {Object.entries(AUDIENCE_LABELS).map(([k, v]) => (
                                        <option key={k} value={k} style={optionStyle}>{v}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Channel</label>
                                <select
                                    aria-label="Select channel"
                                    value={form.channel}
                                    onChange={(e) => setForm(p => ({ ...p, channel: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50"
                                    style={selectStyle}
                                >
                                    <option value="sms" style={optionStyle}>SMS</option>
                                    <option value="email" style={optionStyle}>Email</option>
                                    <option value="both" style={optionStyle}>SMS + Email</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Message</label>
                        <textarea
                            value={form.message}
                            onChange={(e) => setForm(p => ({ ...p, message: e.target.value }))}
                            placeholder={`Hi {name}! 💇‍♀️ Book this week at ${salonName} and get 20% off any color service...`}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 h-28 resize-none"
                        />
                        <p className="text-[10px] text-white/30 mt-1">
                            {form.message.length} / 160 characters (SMS limit) • Use <span className="text-luxe-gold">{'{name}'}</span> for client name
                        </p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving || !form.name.trim() || !form.message.trim()}
                        className="w-full bg-gold-gradient text-luxe-obsidian font-bold py-3 rounded-xl shadow-lg shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        SAVE AS DRAFT
                    </button>
                </div>
            )}

            {/* Campaign List */}
            {campaigns.length === 0 ? (
                <div className="glass-panel p-16 flex flex-col items-center justify-center text-center">
                    <Megaphone className="w-12 h-12 text-white/10 mb-4" />
                    <h4 className="font-bold text-lg text-white/50">No campaigns yet</h4>
                    <p className="text-white/30 text-sm mt-1">Create your first marketing campaign to reach your clients</p>
                </div>
            ) : (
                <div className="glass-panel overflow-hidden border border-white/5">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Campaign</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 text-center">Audience</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 text-center">Channel</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 text-center">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 text-center">Sent</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {campaigns.map((c) => {
                                const ChannelIcon = CHANNEL_ICONS[c.channel] ?? Send;
                                const isLaunching = launching === c.id;
                                return (
                                    <tr key={c.id} className="group hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-luxe-gold/10 flex items-center justify-center">
                                                    <Megaphone className="w-5 h-5 text-luxe-gold" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm">{c.name}</p>
                                                    <p className="text-[10px] text-white/40 truncate max-w-[200px]">{c.message}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className="text-xs bg-white/5 text-white/60 px-3 py-1 rounded-full flex items-center gap-1 mx-auto w-fit">
                                                <Users className="w-3 h-3" /> {AUDIENCE_LABELS[c.audience] ?? c.audience}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className="text-xs flex items-center gap-1 justify-center text-white/60">
                                                <ChannelIcon className="w-3.5 h-3.5" /> {c.channel.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${c.status === 'sent' ? 'bg-green-500/20 text-green-400' :
                                                c.status === 'sending' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    c.status === 'scheduled' ? 'bg-blue-500/20 text-blue-400' :
                                                        'bg-white/10 text-white/40'
                                                }`}>
                                                {c.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-center text-sm font-bold text-white/60">
                                            {c.sent_count > 0 ? c.sent_count : '—'}
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            {c.status === 'draft' && (
                                                <button
                                                    onClick={() => handlePreLaunch(c)}
                                                    disabled={isLaunching}
                                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-bold hover:bg-green-500/20 transition-all disabled:opacity-50"
                                                >
                                                    {isLaunching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
                                                    LAUNCH
                                                </button>
                                            )}
                                            {c.status === 'sent' && (
                                                <span className="text-xs text-white/30">{new Date(c.created_at).toLocaleDateString()}</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Client Selection Modal */}
            {showClientList && launchTarget && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setShowClientList(false); setLaunchTarget(null); }}>
                    <div className="bg-[#141417] border border-luxe-gold/20 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="p-5 border-b border-white/10">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <Rocket className="w-5 h-5 text-green-400" />
                                    Launch: {launchTarget.name}
                                </h3>
                                <button onClick={() => { setShowClientList(false); setLaunchTarget(null); }} className="text-white/30 hover:text-white transition">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <p className="text-xs text-white/40">
                                {AUDIENCE_LABELS[launchTarget.audience]} • {launchTarget.channel.toUpperCase()}
                            </p>
                            <div className="flex items-center justify-between mt-3">
                                <button
                                    onClick={toggleAll}
                                    className="text-xs text-luxe-gold hover:text-luxe-gold/80 font-bold transition"
                                >
                                    {selectedIds.size === clients.length ? '☐ Deselect All' : '☑ Select All'}
                                </button>
                                <span className="text-xs bg-luxe-gold/10 text-luxe-gold px-3 py-1 rounded-full font-bold">
                                    {selectedIds.size} of {clients.length} selected
                                </span>
                            </div>
                        </div>

                        {/* Client List */}
                        <div className="flex-1 overflow-y-auto p-2">
                            {loadingClients ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 text-luxe-gold animate-spin" />
                                </div>
                            ) : clients.length === 0 ? (
                                <div className="text-center py-12 text-white/40 text-sm">No clients match this audience</div>
                            ) : (
                                clients.map((c) => {
                                    const isSelected = selectedIds.has(c.id);
                                    return (
                                        <button
                                            key={c.id}
                                            onClick={() => toggleClient(c.id)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${isSelected ? 'bg-luxe-gold/10 border border-luxe-gold/20' : 'hover:bg-white/5 border border-transparent'
                                                }`}
                                        >
                                            {isSelected
                                                ? <CheckCircle2 className="w-5 h-5 text-luxe-gold flex-shrink-0" />
                                                : <Circle className="w-5 h-5 text-white/20 flex-shrink-0" />
                                            }
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm truncate">{c.name || 'Unknown'}</p>
                                                <p className="text-[11px] text-white/40 truncate">
                                                    {c.email || 'No email'} {c.phone ? `• ${c.phone}` : ''}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {/* Send Button */}
                        <div className="p-4 border-t border-white/10">
                            <button
                                onClick={handleLaunch}
                                disabled={!!launching || selectedIds.size === 0}
                                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-green-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {launching
                                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                                    : <><Send className="w-4 h-4" /> Send to {selectedIds.size} Client{selectedIds.size !== 1 ? 's' : ''}</>
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </FeatureLock>
    );
};
