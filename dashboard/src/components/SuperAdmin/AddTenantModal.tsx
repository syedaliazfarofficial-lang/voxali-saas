import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Shield, Building2, Loader2 } from 'lucide-react';

interface AddTenantModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}

export const AddTenantModal: React.FC<AddTenantModalProps> = ({ isOpen, onClose, onCreated }) => {
    const [form, setForm] = useState({
        businessName: '',
        ownerEmail: '',
        ownerPassword: '',
    });
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setError('');

        try {
            const { data, error: rpcError } = await supabase.rpc('rpc_create_tenant_and_owner', {
                p_salon_name: form.businessName,
                p_owner_name: form.businessName + ' Owner',
                p_owner_email: form.ownerEmail,
                p_owner_password: form.ownerPassword,
            });

            if (rpcError) throw rpcError;
            if (data && !data.success) throw new Error(data.error);

            setForm({ businessName: '', ownerEmail: '', ownerPassword: '' });
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
            <div className="bg-sa-navy border border-sa-border rounded-2xl w-full max-w-md shadow-2xl shadow-black/40">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-sa-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-sa-accent/10">
                            <Building2 className="w-5 h-5 text-sa-accent" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-sa-platinum">Add New Tenant</h3>
                            <p className="text-xs text-sa-muted">Create a new salon with an owner account</p>
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
                            Business Name
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

                    {/* Owner Section */}
                    <div className="pt-4 border-t border-sa-border">
                        <div className="flex items-center gap-2 mb-4">
                            <Shield className="w-4 h-4 text-sa-accent" />
                            <h4 className="text-xs font-bold text-sa-accent uppercase tracking-wider">Owner Account</h4>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-sa-muted uppercase tracking-[0.15em] mb-2 block">
                                    Owner Email
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
                                <label className="text-[10px] font-bold text-sa-muted uppercase tracking-[0.15em] mb-2 block">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    value={form.ownerPassword}
                                    onChange={e => setForm({ ...form, ownerPassword: e.target.value })}
                                    className="w-full bg-sa-slate/50 border border-sa-border rounded-xl px-4 py-3 text-sm text-sa-platinum placeholder:text-sa-muted/40 outline-none focus:border-sa-accent/50 focus:bg-sa-slate/80 transition-all"
                                    placeholder="Min 6 characters"
                                />
                            </div>
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
                            disabled={creating}
                            className="flex-1 px-4 py-3 bg-sa-gradient text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-sa-accent/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {creating ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                            ) : (
                                'Create Tenant'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
