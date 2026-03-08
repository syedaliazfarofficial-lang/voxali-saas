import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Building2, Loader2, Phone, Globe, Star, Mail, MessageSquare, Save } from 'lucide-react';

interface EditTenantModalProps {
    isOpen: boolean;
    tenant: any;
    onClose: () => void;
    onSaved: () => void;
}

export const EditTenantModal: React.FC<EditTenantModalProps> = ({ isOpen, tenant, onClose, onSaved }) => {
    const [form, setForm] = useState({
        salonName: '',
        salonEmail: '',
        salonWebsite: '',
        googleReviewUrl: '',
        twilioPhoneNumber: '',
        salonPhoneOwner: '',
        notificationsEnabled: true,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Load tenant data when modal opens
    useEffect(() => {
        if (!isOpen || !tenant) return;
        (async () => {
            const { data } = await supabase
                .from('tenants')
                .select('salon_name, salon_email, salon_website, google_review_url, twilio_phone_number, salon_phone_owner, notifications_enabled')
                .eq('id', tenant.id)
                .single();
            if (data) {
                setForm({
                    salonName: data.salon_name || '',
                    salonEmail: data.salon_email || '',
                    salonWebsite: data.salon_website || '',
                    googleReviewUrl: data.google_review_url || '',
                    twilioPhoneNumber: data.twilio_phone_number || '',
                    salonPhoneOwner: data.salon_phone_owner || '',
                    notificationsEnabled: data.notifications_enabled ?? true,
                });
            }
        })();
        setSuccess(false);
        setError('');
    }, [isOpen, tenant]);

    if (!isOpen || !tenant) return null;

    const handleSave = async () => {
        setSaving(true);
        setError('');
        setSuccess(false);

        const { error: updateErr } = await supabase
            .from('tenants')
            .update({
                salon_name: form.salonName || null,
                salon_email: form.salonEmail || null,
                salon_website: form.salonWebsite || null,
                google_review_url: form.googleReviewUrl || null,
                twilio_phone_number: form.twilioPhoneNumber || null,
                salon_phone_owner: form.salonPhoneOwner || null,
                notifications_enabled: form.notificationsEnabled,
            })
            .eq('id', tenant.id);

        if (updateErr) {
            setError(updateErr.message);
        } else {
            setSuccess(true);
            onSaved();
            setTimeout(() => onClose(), 800);
        }
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-sa-navy border border-sa-border rounded-2xl w-full max-w-lg shadow-2xl shadow-black/40 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-sa-border sticky top-0 bg-sa-navy z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-sa-accent/10">
                            <Building2 className="w-5 h-5 text-sa-accent" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-sa-platinum">Edit Salon</h3>
                            <p className="text-xs text-sa-muted">{tenant.name || tenant.salon_name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-sa-muted hover:text-sa-platinum transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <div className="p-6 space-y-5">
                    {/* Salon Name */}
                    <div>
                        <label className="text-[10px] font-bold text-sa-muted uppercase tracking-[0.15em] mb-2 block">
                            Salon Name
                        </label>
                        <input
                            type="text"
                            value={form.salonName}
                            onChange={e => setForm({ ...form, salonName: e.target.value })}
                            className="w-full bg-sa-slate/50 border border-sa-border rounded-xl px-4 py-3 text-sm text-sa-platinum placeholder:text-sa-muted/40 outline-none focus:border-sa-accent/50 focus:bg-sa-slate/80 transition-all"
                            placeholder="e.g. Golden Glam Studio"
                        />
                    </div>

                    {/* ===== INTEGRATIONS SECTION ===== */}
                    <div className="pt-4 border-t border-sa-border">
                        <div className="flex items-center gap-2 mb-4">
                            <MessageSquare className="w-4 h-4 text-sa-accent" />
                            <h4 className="text-xs font-bold text-sa-accent uppercase tracking-wider">Twilio & Notifications</h4>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-sa-muted uppercase tracking-[0.15em] mb-2 flex items-center gap-1">
                                    <Phone className="w-3 h-3" /> Twilio SMS Number
                                </label>
                                <input
                                    type="tel"
                                    value={form.twilioPhoneNumber}
                                    onChange={e => setForm({ ...form, twilioPhoneNumber: e.target.value })}
                                    className="w-full bg-sa-slate/50 border border-sa-border rounded-xl px-4 py-3 text-sm text-sa-platinum placeholder:text-sa-muted/40 outline-none focus:border-sa-accent/50 focus:bg-sa-slate/80 transition-all font-mono"
                                    placeholder="+16592174925"
                                />
                                <p className="text-[10px] text-sa-muted/60 mt-1">Twilio number assigned to this salon for SMS</p>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-sa-muted uppercase tracking-[0.15em] mb-2 flex items-center gap-1">
                                    <Phone className="w-3 h-3" /> Owner Phone (Call Transfer)
                                </label>
                                <input
                                    type="tel"
                                    value={form.salonPhoneOwner}
                                    onChange={e => setForm({ ...form, salonPhoneOwner: e.target.value })}
                                    className="w-full bg-sa-slate/50 border border-sa-border rounded-xl px-4 py-3 text-sm text-sa-platinum placeholder:text-sa-muted/40 outline-none focus:border-sa-accent/50 focus:bg-sa-slate/80 transition-all"
                                    placeholder="+92 300 1234567"
                                />
                                <p className="text-[10px] text-sa-muted/60 mt-1">Bella AI transfers calls to this number</p>
                            </div>
                            <div className="flex items-center justify-between bg-sa-slate/30 rounded-xl p-4 border border-sa-border">
                                <div>
                                    <div className="text-sm font-semibold text-sa-platinum">Auto Notifications</div>
                                    <div className="text-[10px] text-sa-muted mt-0.5">SMS & Email on booking events</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, notificationsEnabled: !form.notificationsEnabled })}
                                    className={`w-12 h-6 rounded-full transition-all relative ${form.notificationsEnabled ? 'bg-emerald-500' : 'bg-sa-border'}`}
                                >
                                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all ${form.notificationsEnabled ? 'left-6' : 'left-0.5'}`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ===== SALON DETAILS SECTION ===== */}
                    <div className="pt-4 border-t border-sa-border">
                        <div className="flex items-center gap-2 mb-4">
                            <Globe className="w-4 h-4 text-sa-accent" />
                            <h4 className="text-xs font-bold text-sa-accent uppercase tracking-wider">Salon Details</h4>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-sa-muted uppercase tracking-[0.15em] mb-2 flex items-center gap-1">
                                    <Mail className="w-3 h-3" /> Salon Email
                                </label>
                                <input
                                    type="email"
                                    value={form.salonEmail}
                                    onChange={e => setForm({ ...form, salonEmail: e.target.value })}
                                    className="w-full bg-sa-slate/50 border border-sa-border rounded-xl px-4 py-3 text-sm text-sa-platinum placeholder:text-sa-muted/40 outline-none focus:border-sa-accent/50 focus:bg-sa-slate/80 transition-all"
                                    placeholder="info@salon.com"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-sa-muted uppercase tracking-[0.15em] mb-2 flex items-center gap-1">
                                    <Globe className="w-3 h-3" /> Website
                                </label>
                                <input
                                    type="url"
                                    value={form.salonWebsite}
                                    onChange={e => setForm({ ...form, salonWebsite: e.target.value })}
                                    className="w-full bg-sa-slate/50 border border-sa-border rounded-xl px-4 py-3 text-sm text-sa-platinum placeholder:text-sa-muted/40 outline-none focus:border-sa-accent/50 focus:bg-sa-slate/80 transition-all"
                                    placeholder="https://www.salon.com"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-sa-muted uppercase tracking-[0.15em] mb-2 flex items-center gap-1">
                                    <Star className="w-3 h-3" /> Google Review Link
                                </label>
                                <input
                                    type="url"
                                    value={form.googleReviewUrl}
                                    onChange={e => setForm({ ...form, googleReviewUrl: e.target.value })}
                                    className="w-full bg-sa-slate/50 border border-sa-border rounded-xl px-4 py-3 text-sm text-sa-platinum placeholder:text-sa-muted/40 outline-none focus:border-sa-accent/50 focus:bg-sa-slate/80 transition-all"
                                    placeholder="https://g.page/r/your-salon/review"
                                />
                                <p className="text-[10px] text-sa-muted/60 mt-1">Shown in "Thank You" emails for Google rating</p>
                            </div>
                        </div>
                    </div>

                    {/* Success / Error */}
                    {success && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl text-sm font-medium">
                            ✅ Salon updated successfully!
                        </div>
                    )}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm font-medium">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl border border-sa-border text-sa-muted hover:text-sa-platinum hover:bg-white/[0.03] transition-all font-medium text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 px-4 py-3 bg-sa-gradient text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-sa-accent/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {saving ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                            ) : (
                                <><Save className="w-4 h-4" /> Save Changes</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
