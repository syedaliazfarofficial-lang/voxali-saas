import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { X, Shield, Building2, Loader2, Eye, EyeOff, Phone, Globe, Star, Mail, MessageSquare } from 'lucide-react';

interface AddTenantModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}

export const AddTenantModal: React.FC<AddTenantModalProps> = ({ isOpen, onClose, onCreated }) => {
    const [form, setForm] = useState({
        businessName: '',
        ownerEmail: '',
        ownerPhone: '',
        ownerPassword: '',
        confirmPassword: '',
        // New fields
        salonEmail: '',
        salonWebsite: '',
        googleReviewUrl: '',
        twilioPhoneNumber: '',
    });
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    const [showPw, setShowPw] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setError('');

        try {
            const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

            if (!serviceKey) {
                throw new Error('Service key not configured. Add VITE_SUPABASE_SERVICE_KEY to .env');
            }

            // Step 1: Create auth user
            const adminClient = createClient(supabaseUrl, serviceKey, {
                auth: { autoRefreshToken: false, persistSession: false }
            });

            const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
                email: form.ownerEmail,
                password: form.ownerPassword,
                phone: form.ownerPhone || undefined,
                email_confirm: true,
                user_metadata: { full_name: form.businessName + ' Owner', phone: form.ownerPhone }
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('Failed to create user');

            const newUserId = authData.user.id;

            // Step 2: Create tenant + profile via RPC
            const { data, error: rpcError } = await supabase.rpc('rpc_create_tenant_for_user', {
                p_user_id: newUserId,
                p_salon_name: form.businessName,
                p_owner_name: form.businessName + ' Owner',
                p_owner_email: form.ownerEmail,
            });

            if (rpcError) throw rpcError;
            if (data && !data.success) throw new Error(data.error);

            // Step 3: Update tenant with extra fields (Twilio, website, Google review, etc.)
            const tenantId = data?.tenant_id;
            if (tenantId) {
                await supabase.from('tenants').update({
                    salon_email: form.salonEmail || null,
                    salon_website: form.salonWebsite || null,
                    google_review_url: form.googleReviewUrl || null,
                    twilio_phone_number: form.twilioPhoneNumber || null,
                    salon_phone_owner: form.ownerPhone || null,
                    notifications_enabled: true,
                }).eq('id', tenantId);
            }

            setForm({
                businessName: '', ownerEmail: '', ownerPhone: '', ownerPassword: '', confirmPassword: '',
                salonEmail: '', salonWebsite: '', googleReviewUrl: '', twilioPhoneNumber: '',
            });
            onCreated();
            onClose();
        } catch (err: any) {
            console.error('Error creating tenant:', err);
            setError(err.message || 'Failed to create tenant');
        } finally {
            setCreating(false);
        }
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
                            <h3 className="text-lg font-bold text-sa-platinum">Add New Salon</h3>
                            <p className="text-xs text-sa-muted">Create a new salon with owner account & integrations</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-sa-muted hover:text-sa-platinum transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Business Name */}
                    <div>
                        <label className="text-[10px] font-bold text-sa-muted uppercase tracking-[0.15em] mb-2 block">
                            Salon Name *
                        </label>
                        <input
                            type="text"
                            required
                            value={form.businessName}
                            onChange={e => setForm({ ...form, businessName: e.target.value })}
                            className="w-full bg-sa-slate/50 border border-sa-border rounded-xl px-4 py-3 text-sm text-sa-platinum placeholder:text-sa-muted/40 outline-none focus:border-sa-accent/50 focus:bg-sa-slate/80 transition-all"
                            placeholder="e.g. Luxe Beauty Spa"
                        />
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
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-sa-muted uppercase tracking-[0.15em] mb-2 flex items-center gap-1">
                                    <MessageSquare className="w-3 h-3" /> Twilio SMS Number
                                </label>
                                <input
                                    type="tel"
                                    value={form.twilioPhoneNumber}
                                    onChange={e => setForm({ ...form, twilioPhoneNumber: e.target.value })}
                                    className="w-full bg-sa-slate/50 border border-sa-border rounded-xl px-4 py-3 text-sm text-sa-platinum placeholder:text-sa-muted/40 outline-none focus:border-sa-accent/50 focus:bg-sa-slate/80 transition-all font-mono"
                                    placeholder="+16592174925"
                                />
                                <p className="text-[10px] text-sa-muted/60 mt-1">Buy from Twilio → assign here. Used for SMS notifications.</p>
                            </div>
                        </div>
                    </div>

                    {/* ===== OWNER SECTION ===== */}
                    <div className="pt-4 border-t border-sa-border">
                        <div className="flex items-center gap-2 mb-4">
                            <Shield className="w-4 h-4 text-sa-accent" />
                            <h4 className="text-xs font-bold text-sa-accent uppercase tracking-wider">Owner Account</h4>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-sa-muted uppercase tracking-[0.15em] mb-2 block">
                                    Owner Email *
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={form.ownerEmail}
                                    onChange={e => setForm({ ...form, ownerEmail: e.target.value })}
                                    className="w-full bg-sa-slate/50 border border-sa-border rounded-xl px-4 py-3 text-sm text-sa-platinum placeholder:text-sa-muted/40 outline-none focus:border-sa-accent/50 focus:bg-sa-slate/80 transition-all"
                                    placeholder="owner@salon.com"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-sa-muted uppercase tracking-[0.15em] mb-2 flex items-center gap-1">
                                    <Phone className="w-3 h-3" /> Owner Phone *
                                </label>
                                <input
                                    type="tel"
                                    required
                                    value={form.ownerPhone}
                                    onChange={e => setForm({ ...form, ownerPhone: e.target.value })}
                                    className="w-full bg-sa-slate/50 border border-sa-border rounded-xl px-4 py-3 text-sm text-sa-platinum placeholder:text-sa-muted/40 outline-none focus:border-sa-accent/50 focus:bg-sa-slate/80 transition-all"
                                    placeholder="+92 300 1234567"
                                />
                                <p className="text-[10px] text-sa-muted/60 mt-1">For Bella AI call transfer to owner</p>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-sa-muted uppercase tracking-[0.15em] mb-2 block">
                                    Password *
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPw ? 'text' : 'password'}
                                        required
                                        minLength={6}
                                        value={form.ownerPassword}
                                        onChange={e => setForm({ ...form, ownerPassword: e.target.value })}
                                        className="w-full bg-sa-slate/50 border border-sa-border rounded-xl px-4 py-3 pr-10 text-sm text-sa-platinum placeholder:text-sa-muted/40 outline-none focus:border-sa-accent/50 focus:bg-sa-slate/80 transition-all"
                                        placeholder="Min 6 characters"
                                    />
                                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sa-muted hover:text-sa-platinum transition-colors">
                                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            {form.ownerPassword && (
                                <div>
                                    <label className="text-[10px] font-bold text-sa-muted uppercase tracking-[0.15em] mb-2 block">
                                        Confirm Password *
                                    </label>
                                    <input
                                        type={showPw ? 'text' : 'password'}
                                        required
                                        value={form.confirmPassword}
                                        onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                                        className={`w-full bg-sa-slate/50 border rounded-xl px-4 py-3 text-sm text-sa-platinum placeholder:text-sa-muted/40 outline-none transition-all ${form.confirmPassword && form.confirmPassword !== form.ownerPassword ? 'border-red-500/50' : 'border-sa-border focus:border-sa-accent/50'}`}
                                        placeholder="Re-enter password"
                                    />
                                    {form.confirmPassword && form.confirmPassword !== form.ownerPassword && (
                                        <p className="text-[10px] text-red-400 mt-1">⚠ Passwords do not match</p>
                                    )}
                                    {form.confirmPassword && form.confirmPassword === form.ownerPassword && (
                                        <p className="text-[10px] text-green-400 mt-1">✅ Passwords match</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Error */}
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
                            type="submit"
                            disabled={creating || form.ownerPassword !== form.confirmPassword || !form.ownerPhone}
                            className="flex-1 px-4 py-3 bg-sa-gradient text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-sa-accent/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {creating ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                            ) : (
                                'Create Salon'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
