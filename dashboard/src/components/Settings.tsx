import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Clock, Plus, Edit3, Upload, Building2, Trash2,
    Loader2, X, Scissors, Save, ToggleLeft, ToggleRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TENANT_ID } from '../config/constants';
import { useTenant } from '../context/TenantContext';
import { showToast } from './ui/ToastNotification';

interface Service {
    id: string; name: string; duration: number; price: number;
    category: string; is_active: boolean;
}

interface BusinessHour {
    id: string; day_of_week: number; open_time: string;
    close_time: string; is_open: boolean;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const CATEGORIES = ['Hair', 'Nails', 'Skin', 'Makeup', 'Treatment', 'Barber', 'Other'];

export const Settings: React.FC = () => {
    const { salonName, salonTagline, logoUrl, ownerName, updateBranding, refetch } = useTenant();

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
    const [sPrice, setSPrice] = useState('');
    const [sCategory, setSCategory] = useState('Hair');



    // Sync branding form when context updates
    useEffect(() => {
        setBName(salonName);
        setBTagline(salonTagline);
        setBOwner(ownerName);
        setBLogoPreview(logoUrl);
    }, [salonName, salonTagline, ownerName, logoUrl]);

    const fetchAll = useCallback(async () => {
        if (!TENANT_ID) return;
        setLoading(true);

        const { data: svcData } = await supabase
            .from('services').select('*')
            .eq('tenant_id', TENANT_ID).order('category').order('name');

        const { data: hourData } = await supabase
            .from('business_hours').select('*')
            .eq('tenant_id', TENANT_ID).order('day_of_week');

        if (svcData) setServices(svcData);
        if (hourData) setHours(hourData);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // -- Branding --
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !TENANT_ID) return;

        // Show local preview immediately
        const reader = new FileReader();
        reader.onload = (ev) => setBLogoPreview(ev.target?.result as string);
        reader.readAsDataURL(file);

        setLogoUploading(true);
        const ext = file.name.split('.').pop() || 'png';
        const path = `${TENANT_ID}/logo.${ext}`;

        const { error: upErr } = await supabase.storage
            .from('logos')
            .upload(path, file, { upsert: true, contentType: file.type });

        if (!upErr) {
            const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path);
            setBLogoPreview(urlData.publicUrl);
            showToast('✅ Logo uploaded!');
        } else {
            showToast('❌ Upload failed: ' + upErr.message);
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
        setSName(''); setSDuration('60'); setSPrice(''); setSCategory('Hair');
        setShowSvcModal(true);
    };

    const openEditService = (s: Service) => {
        setEditSvc(s);
        setSName(s.name); setSDuration(String(s.duration)); setSPrice(String(s.price)); setSCategory(s.category);
        setShowSvcModal(true);
    };

    const handleSaveService = async () => {
        if (!sName || !sPrice) return;
        setSaving(true);
        const { error } = await supabase.rpc('rpc_upsert_service', {
            p_tenant_id: TENANT_ID,
            p_name: sName,
            p_duration: parseInt(sDuration) || 60,
            p_price: parseFloat(sPrice) || 0,
            p_category: sCategory,
            p_service_id: editSvc?.id || null,
        });
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

    // -- Business Hours --
    const updateHour = async (day: number, field: 'open_time' | 'close_time' | 'is_open', value: string | boolean) => {
        const existing = hours.find(h => h.day_of_week === day);
        const openT = field === 'open_time' ? value as string : (existing?.open_time || '09:00');
        const closeT = field === 'close_time' ? value as string : (existing?.close_time || '21:00');
        const isO = field === 'is_open' ? value as boolean : (existing?.is_open ?? true);

        const { error } = await supabase.rpc('rpc_update_hours', {
            p_tenant_id: TENANT_ID,
            p_day: day,
            p_open: openT,
            p_close: closeT,
            p_is_open: isO,
        });
        if (!error) {
            showToast(`${DAY_NAMES[day]} updated`);
            fetchAll();
        }
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-luxe-gold animate-spin" /></div>;
    }

    const grouped = CATEGORIES.map(cat => ({
        category: cat,
        items: services.filter(s => s.category === cat),
    })).filter(g => g.items.length > 0);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">


            {/* ============ BRANDING SECTION ============ */}
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
            </div>

            {/* ============ SERVICES SECTION ============ */}
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
                    <button onClick={openAddService}
                        className="bg-gold-gradient text-luxe-obsidian px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                        <Plus className="w-5 h-5" /> ADD SERVICE
                    </button>
                </div>

                {/* Service Groups */}
                <div className="space-y-6">
                    {grouped.map(g => (
                        <div key={g.category} className="glass-panel border border-white/5 overflow-hidden">
                            <div className="px-6 py-3 bg-white/5 border-b border-white/5">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-luxe-gold">{g.category}</span>
                            </div>
                            <div className="divide-y divide-white/5">
                                {g.items.map(svc => (
                                    <div key={svc.id} className={`flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors ${!svc.is_active ? 'opacity-40' : ''}`}>
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="w-10 h-10 rounded-xl bg-luxe-gold/10 flex items-center justify-center">
                                                <Scissors className="w-5 h-5 text-luxe-gold" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-sm">{svc.name}</p>
                                                <p className="text-[10px] text-white/30">{svc.duration} min</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-lg font-black text-green-400">${svc.price}</span>
                                            <button onClick={() => openEditService(svc)} title="Edit"
                                                className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-luxe-gold hover:bg-luxe-gold/10 transition-all">
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => toggleService(svc)} title={svc.is_active ? 'Deactivate' : 'Activate'}
                                                className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white transition-all">
                                                {svc.is_active ? <ToggleRight className="w-5 h-5 text-green-400" /> : <ToggleLeft className="w-5 h-5 text-red-400" />}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {grouped.length === 0 && (
                        <div className="glass-panel p-12 text-center">
                            <Scissors className="w-12 h-12 text-white/10 mx-auto mb-4" />
                            <p className="text-white/40">No services yet. Add your first service!</p>
                        </div>
                    )}
                </div>
            </div>

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
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all">
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Duration (min)</label>
                                    <select value={sDuration} onChange={e => setSDuration(e.target.value)} title="Select duration"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all">
                                        {[15, 30, 45, 60, 75, 90, 120, 150, 180].map(d => (
                                            <option key={d} value={String(d)}>{d} min</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Price ($) *</label>
                                    <input type="number" value={sPrice} onChange={e => setSPrice(e.target.value)} placeholder="0.00" min="0" step="5"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all" />
                                </div>
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
