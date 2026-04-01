import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Tag, Users, Calendar, Clock, DollarSign, X, CheckCircle2, MoreHorizontal } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTenant } from '../context/TenantContext';
import { showToast } from './ui/ToastNotification';
import { Skeleton } from './ui/Skeleton';
import { GiftCardsTab } from './GiftCardsTab';

interface PackageTemplate {
    id: string;
    name: string;
    description: string;
    price: number;
    total_uses: number;
    validity_days: number | null;
    is_active: boolean;
}

interface ActivePackage {
    id: string;
    client_id: string;
    remaining_uses: number;
    status: string;
    expiry_date: string | null;
    client: { first_name: string; last_name: string } | any;
    template: { name: string; total_uses: number };
}

export const PackagesModule: React.FC = () => {
    const { tenantId } = useTenant();
    const [templates, setTemplates] = useState<PackageTemplate[]>([]);
    const [activePackages, setActivePackages] = useState<ActivePackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'templates' | 'active' | 'gift_cards'>('templates');

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [newTemplate, setNewTemplate] = useState({
        name: '', description: '', price: '', total_uses: '', validity_days: ''
    });

    const fetchPackages = async () => {
        if (!tenantId) return;
        setLoading(true);
        // Fetch templates
        const { data: tData } = await supabase
            .from('client_package_templates')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });
        if (tData) setTemplates(tData);

        // Fetch active packages
        // Assuming there is a relation to 'clients' if needed, otherwise we just fetch raw
        const { data: aData } = await supabase
            .from('client_active_packages')
            .select(`
                *,
                template:client_package_templates!inner(name, total_uses)
            `)
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        // We fetch clients separately since we might not know the exact alias for clients table
        if (aData) {
            const clientIds = [...new Set(aData.map(a => a.client_id))];
            if (clientIds.length > 0) {
                const { data: cData } = await supabase
                    .from('clients')
                    .select('id, first_name, last_name, phone')
                    .in('id', clientIds);
                
                const clientMap = (cData || []).reduce((acc: any, c: any) => {
                    acc[c.id] = c; return acc;
                }, {});

                aData.forEach(a => {
                    a.client = clientMap[a.client_id] || { first_name: 'Unknown', last_name: 'Client' };
                });
            }
            setActivePackages(aData);
        }

        setLoading(false);
    };

    useEffect(() => { fetchPackages(); }, [tenantId]);

    const handleCreateTemplate = async () => {
        if (!tenantId) return;
        if (!newTemplate.name || !newTemplate.price || !newTemplate.total_uses) {
            showToast('Please fill all required fields', 'error');
            return;
        }

        setSaving(true);
        const { error } = await supabase.from('client_package_templates').insert({
            tenant_id: tenantId,
            name: newTemplate.name,
            description: newTemplate.description,
            price: parseFloat(newTemplate.price),
            total_uses: parseInt(newTemplate.total_uses),
            validity_days: newTemplate.validity_days ? parseInt(newTemplate.validity_days) : null
        });

        if (!error) {
            showToast('Package Template Created Successfully!', 'success');
            setShowModal(false);
            setNewTemplate({ name: '', description: '', price: '', total_uses: '', validity_days: '' });
            fetchPackages();
        } else {
            showToast('Error creating package: ' + error.message, 'error');
        }
        setSaving(false);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-luxe-gold/10 rounded-2xl border border-luxe-gold/20">
                        <Package className="w-8 h-8 text-luxe-gold" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-tight">Packages</h2>
                        <p className="text-sm text-white/40 uppercase tracking-widest mt-1">Sell bundles & track client redemptions</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-gold-gradient text-luxe-obsidian px-6 py-3 rounded-xl font-bold shadow-lg shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                    <Plus className="w-5 h-5" /> NEW PACKAGE
                </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-white/5 p-1 rounded-xl w-max">
                <button
                    onClick={() => setTab('templates')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all \${tab === 'templates' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/60'}`}
                >
                    Package Templates
                </button>
                <button
                    onClick={() => setTab('active')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all \${tab === 'active' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/60'}`}
                >
                    Active Client Packages
                </button>
                <button
                    onClick={() => setTab('gift_cards')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all \${tab === 'gift_cards' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/60'}`}
                >
                    Gift Cards
                </button>
            </div>

            {/* List Content */}
            {tab === 'gift_cards' ? (
                <GiftCardsTab />
            ) : loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <div key={i} className="glass-panel h-48"><Skeleton variant="rect" height="100%" className="rounded-xl" /></div>)}
                </div>
            ) : tab === 'templates' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.length === 0 ? (
                        <div className="col-span-full py-12 text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
                            <Tag className="w-12 h-12 text-white/20 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-white mb-1">No Packages Yet</h3>
                            <p className="text-sm text-white/40">Create a bundle like "5 Haircuts for $100" to boost retention.</p>
                        </div>
                    ) : (
                        templates.map(p => (
                            <div key={p.id} className="glass-panel border border-white/5 p-6 hover:border-luxe-gold/30 transition-all flex flex-col h-full bg-gradient-to-b from-white/[0.02] to-transparent">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-white/5 rounded-lg border border-white/10"><Package className="w-5 h-5 text-luxe-gold" /></div>
                                    <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded border border-green-500/20">{p.is_active ? 'ACTIVE' : 'DRAFT'}</span>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">{p.name}</h3>
                                {p.description && <p className="text-sm text-white/50 mb-4 line-clamp-2">{p.description}</p>}
                                <div className="mt-auto pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Price</p>
                                        <p className="text-lg font-black text-luxe-gold">${p.price}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Total Uses</p>
                                        <p className="text-lg font-bold text-white">{p.total_uses} <span className="text-xs text-white/50 font-normal">credits</span></p>
                                    </div>
                                </div>
                                {p.validity_days && <p className="text-xs text-white/30 font-medium mt-3 flex items-center gap-1"><Clock className="w-3 h-3"/> Valid for {p.validity_days} days</p>}
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="bg-[#121212] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#1A1A1A] text-xs uppercase tracking-wider text-white/50 border-b border-white/10">
                            <tr>
                                <th className="px-6 py-4 font-bold">Client</th>
                                <th className="px-6 py-4 font-bold">Package Name</th>
                                <th className="px-6 py-4 font-bold text-center">Remaining Uses</th>
                                <th className="px-6 py-4 font-bold text-center">Status</th>
                                <th className="px-6 py-4 font-bold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {activePackages.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-white/40">No active packages found. Sell a package via POS.</td>
                                </tr>
                            ) : (
                                activePackages.map(ap => (
                                    <tr key={ap.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-white">{ap.client?.first_name} {ap.client?.last_name}</div>
                                            <div className="text-xs text-white/40 font-mono">{ap.client?.phone}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-white font-medium">{ap.template?.name}</div>
                                            <div className="text-xs text-white/30">Total: {ap.template?.total_uses} uses</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                <div className={`px-3 py-1 rounded-full text-xs font-bold \${ap.remaining_uses > 0 ? 'bg-luxe-gold/10 text-luxe-gold border border-luxe-gold/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                                    {ap.remaining_uses} / {ap.template?.total_uses} left
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-xs font-bold px-2 py-1 rounded uppercase \${ap.status === 'active' ? 'text-green-400' : 'text-white/40'}`}>
                                                {ap.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-white/40 hover:text-white p-2 transition-colors"><MoreHorizontal className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <div className="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-lg relative shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-[#1A1A1A]">
                            <h3 className="text-xl font-bold flex items-center gap-2"><Package className="w-5 h-5 text-luxe-gold" /> New Package Template</h3>
                            <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Package Name *</label>
                                <input 
                                    value={newTemplate.name} onChange={e => setNewTemplate({...newTemplate, name: e.target.value})}
                                    placeholder="e.g. 5x Premium Haircut" 
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-luxe-gold"
                                    autoFocus
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Price ($) *</label>
                                    <input 
                                        type="number" value={newTemplate.price} onChange={e => setNewTemplate({...newTemplate, price: e.target.value})}
                                        placeholder="e.g. 150" 
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-luxe-gold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Total Uses (Credits) *</label>
                                    <input 
                                        type="number" value={newTemplate.total_uses} onChange={e => setNewTemplate({...newTemplate, total_uses: e.target.value})}
                                        placeholder="e.g. 5" 
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-luxe-gold"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Validity Days (Optional)</label>
                                <input 
                                    type="number" value={newTemplate.validity_days} onChange={e => setNewTemplate({...newTemplate, validity_days: e.target.value})}
                                    placeholder="e.g. 90 (Leave empty for no expiry)" 
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-luxe-gold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Description</label>
                                <textarea 
                                    value={newTemplate.description} onChange={e => setNewTemplate({...newTemplate, description: e.target.value})}
                                    placeholder="Internal notes or terms of service..." 
                                    rows={3}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-luxe-gold resize-none"
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-white/10 bg-[#1A1A1A] flex justify-end gap-3">
                            <button onClick={() => setShowModal(false)} className="px-6 py-2.5 rounded-xl font-bold text-white/60 hover:text-white transition-colors">Cancel</button>
                            <button onClick={handleCreateTemplate} disabled={saving} className="bg-luxe-gold text-luxe-obsidian px-6 py-2.5 rounded-xl font-bold hover:bg-yellow-400 disabled:opacity-50 transition-colors flex items-center gap-2">
                                {saving ? "Saving..." : "Create Package"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
