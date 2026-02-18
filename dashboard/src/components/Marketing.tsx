import React, { useState, useEffect, useCallback } from 'react';
import {
    Megaphone,
    Send,
    Plus,
    Loader2,
    Users,
    MessageSquare,
    Mail,
    X,
    Rocket
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TENANT_ID } from '../config/constants';
import { showToast } from './ui/ToastNotification';
import { ConfirmModal } from './ui/ConfirmModal';

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

export const Marketing: React.FC = () => {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: '', message: '', audience: 'all_clients', channel: 'sms' });
    const [launching, setLaunching] = useState<string | null>(null);
    const [launchTarget, setLaunchTarget] = useState<Campaign | null>(null);

    const fetchCampaigns = useCallback(async () => {
        if (!TENANT_ID) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('marketing_campaigns')
            .select('*')
            .eq('tenant_id', TENANT_ID)
            .order('created_at', { ascending: false });
        if (!error && data) setCampaigns(data as Campaign[]);
        setLoading(false);
    }, []);

    useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

    const handleSave = async () => {
        if (!form.name.trim() || !form.message.trim()) return;
        setSaving(true);
        const { error } = await supabase.from('marketing_campaigns').insert({
            tenant_id: TENANT_ID,
            name: form.name.trim(),
            message: form.message.trim(),
            audience: form.audience,
            channel: form.channel,
            status: 'draft',
        });
        if (!error) {
            setForm({ name: '', message: '', audience: 'all_clients', channel: 'sms' });
            setShowForm(false);
            showToast('Campaign saved as draft');
            fetchCampaigns();
        } else {
            showToast(error.message, 'error');
        }
        setSaving(false);
    };

    const handleLaunch = async () => {
        if (!launchTarget) return;
        setLaunching(launchTarget.id);

        // Update status to 'sending'
        await supabase.from('marketing_campaigns')
            .update({ status: 'sending' })
            .eq('id', launchTarget.id);

        // Count target audience
        let audienceCount = 0;
        const { count } = await supabase
            .from('clients')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', TENANT_ID);
        audienceCount = count || 0;

        // Update to sent with count
        const { error } = await supabase.from('marketing_campaigns')
            .update({
                status: 'sent',
                sent_count: audienceCount,
            })
            .eq('id', launchTarget.id);

        if (!error) {
            showToast(`🚀 Campaign launched to ${audienceCount} clients!`);
        } else {
            showToast('Launch failed: ' + error.message, 'error');
        }

        setLaunching(null);
        setLaunchTarget(null);
        fetchCampaigns();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-luxe-gold animate-spin" />
            </div>
        );
    }

    return (
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

            {/* Create Form */}
            {showForm && (
                <div className="glass-panel p-6 border border-luxe-gold/20 space-y-4 animate-in slide-in-from-top-2 duration-300">
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
                                >
                                    {Object.entries(AUDIENCE_LABELS).map(([k, v]) => (
                                        <option key={k} value={k}>{v}</option>
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
                                >
                                    <option value="sms">SMS</option>
                                    <option value="email">Email</option>
                                    <option value="both">SMS + Email</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Message</label>
                        <textarea
                            value={form.message}
                            onChange={(e) => setForm(p => ({ ...p, message: e.target.value }))}
                            placeholder="Hi {name}! 💇‍♀️ Book this week and get 20% off any color service..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 h-28 resize-none"
                        />
                        <p className="text-[10px] text-white/30 mt-1">{form.message.length} / 160 characters (SMS limit)</p>
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
                                                    onClick={() => setLaunchTarget(c)}
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

            {/* Launch Confirmation */}
            <ConfirmModal
                open={!!launchTarget}
                title="Launch Campaign"
                message={`Launch "${launchTarget?.name}" to ${AUDIENCE_LABELS[launchTarget?.audience || ''] || launchTarget?.audience} via ${launchTarget?.channel?.toUpperCase()}? This will send the campaign immediately.`}
                confirmLabel="🚀 Launch Now"
                loading={!!launching}
                onConfirm={handleLaunch}
                onCancel={() => setLaunchTarget(null)}
            />
        </div>
    );
};
