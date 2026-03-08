import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CreditCard, Eye, EyeOff, Save, Loader2, Key, Shield, RefreshCw } from 'lucide-react';

interface ConfigItem { key: string; value: string; updated_at: string; }

export const PlatformSettings: React.FC = () => {
    const [configs, setConfigs] = useState<ConfigItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
    const [edits, setEdits] = useState<Record<string, string>>({});

    const fetchConfigs = async () => {
        const { data } = await supabase.from('platform_config').select('*').order('key');
        if (data) {
            setConfigs(data);
            const editMap: Record<string, string> = {};
            data.forEach(c => editMap[c.key] = c.value);
            setEdits(editMap);
        }
        setLoading(false);
    };

    useEffect(() => { fetchConfigs(); }, []);

    const handleSave = async () => {
        setSaving(true);
        for (const [key, value] of Object.entries(edits)) {
            const existing = configs.find(c => c.key === key);
            if (existing && existing.value !== value) {
                await supabase.from('platform_config').update({ value, updated_at: new Date().toISOString() }).eq('key', key);
            } else if (!existing && value) {
                await supabase.from('platform_config').insert({ key, value });
            }
        }
        await fetchConfigs();
        setSaving(false);
    };

    const maskValue = (val: string) => {
        if (!val) return '';
        if (val.length <= 12) return '•'.repeat(val.length);
        return val.substring(0, 7) + '•'.repeat(Math.min(val.length - 11, 20)) + val.substring(val.length - 4);
    };

    const configFields = [
        { key: 'stripe_secret_key', label: 'Stripe Secret Key', icon: Key, sensitive: true, placeholder: 'sk_test_...' },
        { key: 'stripe_publishable_key', label: 'Stripe Publishable Key', icon: CreditCard, sensitive: false, placeholder: 'pk_test_...' },
        { key: 'stripe_webhook_secret', label: 'Webhook Signing Secret', icon: Shield, sensitive: true, placeholder: 'whsec_...' },
        { key: 'platform_fee_percent', label: 'Platform Fee %', icon: CreditCard, sensitive: false, placeholder: '3' },
    ];

    const hasChanges = configs.some(c => edits[c.key] !== c.value) ||
        configFields.some(f => !configs.find(c => c.key === f.key) && edits[f.key]);

    if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-sa-accent animate-spin" /></div>;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-black text-sa-platinum tracking-tight">Platform Settings</h1>
                <p className="text-sa-muted mt-1">Manage Stripe API keys and platform configuration</p>
            </div>

            {/* Stripe Keys */}
            <div className="bg-sa-navy rounded-2xl border border-sa-border overflow-hidden">
                <div className="px-6 py-4 border-b border-sa-border flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-violet-500/10">
                        <CreditCard className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-sa-platinum">Stripe Configuration</h2>
                        <p className="text-xs text-sa-muted">These keys are used for all payment processing across all salons</p>
                    </div>
                </div>

                <div className="p-6 space-y-5">
                    {configFields.map(field => {
                        const val = edits[field.key] || '';
                        const isShown = showSecrets[field.key] || false;
                        return (
                            <div key={field.key}>
                                <label className="text-xs font-bold text-sa-muted/70 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <field.icon className="w-3.5 h-3.5" />
                                    {field.label}
                                </label>
                                <div className="relative">
                                    <input
                                        type={field.sensitive && !isShown ? 'password' : 'text'}
                                        value={field.sensitive && !isShown ? maskValue(val) : val}
                                        onChange={e => setEdits(prev => ({ ...prev, [field.key]: e.target.value }))}
                                        onFocus={() => { if (field.sensitive) setShowSecrets(prev => ({ ...prev, [field.key]: true })); }}
                                        onBlur={() => { if (field.sensitive) setTimeout(() => setShowSecrets(prev => ({ ...prev, [field.key]: false })), 200); }}
                                        placeholder={field.placeholder}
                                        className={`w-full bg-sa-slate/50 border border-sa-border rounded-xl px-4 py-3 text-sm outline-none
                                            focus:border-sa-accent/50 transition-all font-mono
                                            ${field.key === 'platform_fee_percent' ? 'max-w-[120px] font-sans' : ''}`}
                                    />
                                    {field.sensitive && (
                                        <button
                                            onClick={() => setShowSecrets(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-lg transition-all"
                                        >
                                            {isShown ? <EyeOff className="w-4 h-4 text-sa-muted" /> : <Eye className="w-4 h-4 text-sa-muted" />}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="px-6 pb-6 flex items-center gap-3">
                    <button
                        onClick={handleSave}
                        disabled={saving || !hasChanges}
                        className="bg-sa-gradient px-6 py-3 rounded-xl font-bold text-white shadow-lg shadow-sa-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'SAVING...' : 'SAVE SETTINGS'}
                    </button>
                    <button
                        onClick={fetchConfigs}
                        className="px-4 py-3 rounded-xl font-medium text-sm text-sa-muted hover:text-sa-platinum hover:bg-white/[0.03] border border-sa-border transition-all flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" /> Reload
                    </button>
                </div>
            </div>

            {/* Info Box */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
                <p className="text-sm text-amber-400 font-medium">⚠️ Important</p>
                <p className="text-xs text-amber-400/60 mt-1">
                    Changing the Stripe Secret Key will affect all payment processing. To also update the Edge Function secret,
                    run: <code className="bg-white/5 px-2 py-0.5 rounded font-mono">supabase secrets set STRIPE_SECRET_KEY=sk_xxx</code>
                </p>
            </div>
        </div>
    );
};
