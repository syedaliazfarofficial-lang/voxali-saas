import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { Building2, Plus, Eye, Search, RefreshCw, Ban, Trash2, CheckCircle, AlertTriangle, X, Pencil } from 'lucide-react';
import { AddTenantModal } from './AddTenantModal';
import { EditTenantModal } from './EditTenantModal';

interface TenantsPageProps {
    onImpersonate: (tenantId: string, tenantName?: string) => void;
}

export const TenantsPage: React.FC<TenantsPageProps> = ({ onImpersonate }) => {
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editTenant, setEditTenant] = useState<any>(null);
    const [confirmAction, setConfirmAction] = useState<{ type: 'suspend' | 'unsuspend' | 'delete'; tenant: any } | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [showDeleted, setShowDeleted] = useState(false);
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState(false);
    const [storedPin, setStoredPin] = useState(import.meta.env.VITE_SUPER_PIN || '545537');

    useEffect(() => {
        fetchTenants();
        // Load PIN from database
        supabase.from('super_admin_settings').select('value').eq('key', 'super_pin').maybeSingle()
            .then(({ data }) => { if (data?.value) setStoredPin(data.value); });
    }, []);

    const fetchTenants = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('tenants')
                .select(`
                    *,
                    profiles:profiles(full_name, email, role)
                `)
                .order('created_at', { ascending: false });

            if (data) {
                const processed = data.map(tenant => ({
                    ...tenant,
                    owner: tenant.profiles?.find((p: any) => p.role === 'owner'),
                }));
                setTenants(processed);
            }
            if (error) console.error('Error:', error);
        } catch (error) {
            console.error('Error fetching tenants:', error);
        } finally {
            setLoading(false);
        }
    };

    // Suspend: ban user login + mark tenant as suspended
    const handleSuspend = async (tenant: any) => {
        setActionLoading(true);
        try {
            const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const adminClient = createClient(supabaseUrl, serviceKey, {
                auth: { autoRefreshToken: false, persistSession: false }
            });

            // Get owner user_id from profiles
            const { data: profiles } = await supabase
                .from('profiles')
                .select('user_id')
                .eq('tenant_id', tenant.id)
                .eq('role', 'owner');

            // Ban all owner users for this tenant
            if (profiles) {
                for (const p of profiles) {
                    await adminClient.auth.admin.updateUserById(p.user_id, {
                        ban_duration: '876000h' // ~100 years = effectively permanent
                    });
                }
            }

            // Mark tenant as suspended
            await supabase.from('tenants').update({ status: 'suspended' }).eq('id', tenant.id);

            // Optimistic update - instantly update local state
            setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, status: 'suspended' } : t));
            setConfirmAction(null);
            setPin('');
            setPinError(false);
        } catch (err: any) {
            console.error('Suspend error:', err);
            alert('Failed to suspend: ' + err.message);
        } finally {
            setActionLoading(false);
        }
    };

    // Unsuspend: unban user login + reactivate tenant
    const handleUnsuspend = async (tenant: any) => {
        setActionLoading(true);
        try {
            const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const adminClient = createClient(supabaseUrl, serviceKey, {
                auth: { autoRefreshToken: false, persistSession: false }
            });

            const { data: profiles } = await supabase
                .from('profiles')
                .select('user_id')
                .eq('tenant_id', tenant.id)
                .eq('role', 'owner');

            if (profiles) {
                for (const p of profiles) {
                    await adminClient.auth.admin.updateUserById(p.user_id, {
                        ban_duration: 'none'
                    });
                }
            }

            await supabase.from('tenants').update({ status: 'active' }).eq('id', tenant.id);

            // Optimistic update - instantly update local state
            setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, status: 'active' } : t));
            setConfirmAction(null);
            setPin('');
            setPinError(false);
        } catch (err: any) {
            console.error('Unsuspend error:', err);
            alert('Failed to unsuspend: ' + err.message);
        } finally {
            setActionLoading(false);
        }
    };

    // Delete: remove user from auth, delete all data, mark tenant as deleted
    const handleDelete = async (tenant: any) => {
        setActionLoading(true);
        try {
            const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY;
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const adminClient = createClient(supabaseUrl, serviceKey, {
                auth: { autoRefreshToken: false, persistSession: false }
            });

            // Get ALL users for this tenant (owners, staff, etc.) via profiles
            const { data: profiles } = await supabase
                .from('profiles')
                .select('user_id')
                .eq('tenant_id', tenant.id);

            // Delete all auth users found via profiles
            if (profiles) {
                for (const p of profiles) {
                    try {
                        await adminClient.auth.admin.deleteUser(p.user_id);
                    } catch { /* user might already be deleted */ }
                }
            }

            // Also find staff with emails and delete their auth users
            const { data: staffList } = await supabase
                .from('staff')
                .select('email')
                .eq('tenant_id', tenant.id)
                .not('email', 'is', null);

            if (staffList) {
                const { data: allUsers } = await adminClient.auth.admin.listUsers();
                if (allUsers?.users) {
                    for (const staff of staffList) {
                        if (!staff.email) continue;
                        const authUser = allUsers.users.find((u: any) => u.email === staff.email);
                        if (authUser) {
                            try {
                                await adminClient.auth.admin.deleteUser(authUser.id);
                            } catch { /* already deleted */ }
                        }
                    }
                }
            }

            // Delete profiles for this tenant (using adminClient to bypass RLS!)
            await adminClient.from('profiles').delete().eq('tenant_id', tenant.id);

            // Delete staff leaves for this tenant's staff
            if (staffList && staffList.length > 0) {
                for (const s of staffList) {
                    await adminClient.from('staff_leaves').delete().eq('staff_id', (s as any).id);
                }
            }
            // Also fetch staff IDs for leave cleanup
            const { data: staffIds } = await adminClient.from('staff').select('id').eq('tenant_id', tenant.id);
            if (staffIds) {
                for (const s of staffIds) {
                    await adminClient.from('staff_leaves').delete().eq('staff_id', s.id);
                }
            }

            // Delete staff records (using adminClient to bypass RLS!)
            await adminClient.from('staff').delete().eq('tenant_id', tenant.id);

            // Delete services for this tenant
            await adminClient.from('services').delete().eq('tenant_id', tenant.id);

            // Delete business hours for this tenant
            await adminClient.from('business_hours').delete().eq('tenant_id', tenant.id);

            // Delete call logs for this tenant
            await adminClient.from('call_logs').delete().eq('tenant_id', tenant.id);

            // Delete bookings for this tenant
            await adminClient.from('bookings').delete().eq('tenant_id', tenant.id);

            // Delete clients for this tenant
            await adminClient.from('clients').delete().eq('tenant_id', tenant.id);

            // Mark tenant as deleted (soft delete for audit trail)
            await adminClient.from('tenants').update({ status: 'deleted' }).eq('id', tenant.id);

            // Optimistic update - instantly update local state
            setTenants(prev => prev.map(t => t.id === tenant.id ? { ...t, status: 'deleted' } : t));
            setConfirmAction(null);
            setPin('');
            setPinError(false);
        } catch (err: any) {
            console.error('Delete error:', err);
            alert('Failed to delete: ' + err.message);
        } finally {
            setActionLoading(false);
        }
    };
    const filteredTenants = tenants.filter(t => {
        const matchesSearch = (t.name || '').toLowerCase().includes(search.toLowerCase()) ||
            (t.owner?.email || '').toLowerCase().includes(search.toLowerCase());
        const matchesFilter = showDeleted ? true : (t.status !== 'deleted');
        return matchesSearch && matchesFilter;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'suspended':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Ban className="w-3 h-3" />
                        Suspended
                    </span>
                );
            case 'deleted':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                        <Trash2 className="w-3 h-3" />
                        Deleted
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Active
                    </span>
                );
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-black text-sa-platinum tracking-tight">Tenants</h1>
                    <p className="text-sa-muted mt-1">Manage all salons on the platform</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-5 py-2.5 bg-sa-gradient text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-sa-accent/20 transition-all flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Add Tenant
                </button>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sa-muted/50" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by name or email..."
                        className="w-full bg-sa-navy border border-sa-border rounded-xl pl-11 pr-4 py-2.5 text-sm text-sa-platinum placeholder:text-sa-muted/40 outline-none focus:border-sa-accent/50 transition-all"
                    />
                </div>
                <label className="flex items-center gap-2 text-xs text-sa-muted cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={showDeleted}
                        onChange={e => setShowDeleted(e.target.checked)}
                        className="accent-sa-accent"
                    />
                    Show Deleted
                </label>
                <button
                    onClick={() => { setSearch(''); fetchTenants(); }}
                    className="p-2.5 rounded-xl border border-sa-border text-sa-muted hover:text-sa-platinum hover:bg-white/[0.03] transition-all"
                    title="Refresh"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Table */}
            <div className="bg-sa-navy rounded-2xl border border-sa-border overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-sa-border">
                            <th className="text-left px-6 py-4 text-[10px] font-bold text-sa-muted uppercase tracking-[0.15em]">Salon Name</th>
                            <th className="text-left px-6 py-4 text-[10px] font-bold text-sa-muted uppercase tracking-[0.15em]">Owner Email</th>
                            <th className="text-left px-6 py-4 text-[10px] font-bold text-sa-muted uppercase tracking-[0.15em]">Status</th>
                            <th className="text-left px-6 py-4 text-[10px] font-bold text-sa-muted uppercase tracking-[0.15em]">Created</th>
                            <th className="text-right px-6 py-4 text-[10px] font-bold text-sa-muted uppercase tracking-[0.15em]">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-sa-border">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-sa-muted text-sm">
                                    Loading tenants...
                                </td>
                            </tr>
                        ) : filteredTenants.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-sa-muted text-sm">
                                    {search ? 'No tenants match your search' : 'No tenants found. Create one to get started.'}
                                </td>
                            </tr>
                        ) : (
                            filteredTenants.map((tenant) => (
                                <tr key={tenant.id} className={`hover:bg-white/[0.02] transition-colors group ${tenant.status === 'deleted' ? 'opacity-40' : tenant.status === 'suspended' ? 'opacity-70' : ''}`}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tenant.status === 'suspended' ? 'bg-amber-500/10 text-amber-400' : tenant.status === 'deleted' ? 'bg-red-500/10 text-red-400' : 'bg-sa-slate text-sa-accent'}`}>
                                                <Building2 className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-sm text-sa-platinum">{tenant.name || tenant.salon_name || 'Unnamed'}</div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(tenant.id); const btn = e.currentTarget; btn.textContent = '✅ Copied!'; setTimeout(() => { btn.textContent = `🔑 ${tenant.id?.slice(0, 8)}... (click to copy)`; }, 1500); }}
                                                    className="text-[11px] text-sa-muted/50 hover:text-sa-accent cursor-pointer transition-colors"
                                                    title={`Copy Tenant ID: ${tenant.id}`}
                                                >🔑 {tenant.id?.slice(0, 8)}... (click to copy)</button>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {tenant.owner ? (
                                            <span className="text-sm text-sa-platinum">{tenant.owner.email}</span>
                                        ) : (
                                            <span className="text-xs text-red-400/70 italic">No owner</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(tenant.status || 'active')}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-sa-muted">
                                        {new Date(tenant.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                            {tenant.status !== 'deleted' && (
                                                <>
                                                    {/* Edit Salon */}
                                                    <button
                                                        onClick={() => setEditTenant(tenant)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all text-xs font-semibold"
                                                        title="Edit salon details"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                        Edit
                                                    </button>

                                                    {/* Access Dashboard */}
                                                    <button
                                                        onClick={() => onImpersonate(tenant.id, tenant.name || tenant.salon_name)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sa-accent/10 text-sa-accent border border-sa-accent/20 hover:bg-sa-accent/20 transition-all text-xs font-semibold"
                                                        title="Access Dashboard"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        View
                                                    </button>

                                                    {/* Suspend / Unsuspend */}
                                                    {tenant.status === 'suspended' ? (
                                                        <button
                                                            onClick={() => setConfirmAction({ type: 'unsuspend', tenant })}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-xs font-semibold"
                                                            title="Reactivate this tenant"
                                                        >
                                                            <CheckCircle className="w-3.5 h-3.5" />
                                                            Activate
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => setConfirmAction({ type: 'suspend', tenant })}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all text-xs font-semibold"
                                                            title="Temporarily suspend this tenant"
                                                        >
                                                            <Ban className="w-3.5 h-3.5" />
                                                            Suspend
                                                        </button>
                                                    )}

                                                    {/* Delete */}
                                                    <button
                                                        onClick={() => setConfirmAction({ type: 'delete', tenant })}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all text-xs font-semibold"
                                                        title="Permanently delete this tenant"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        Delete
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <AddTenantModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreated={fetchTenants}
            />

            <EditTenantModal
                isOpen={!!editTenant}
                tenant={editTenant}
                onClose={() => setEditTenant(null)}
                onSaved={fetchTenants}
            />

            {/* Confirmation Modal */}
            {confirmAction && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-sa-navy border border-sa-border rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl ${confirmAction.type === 'delete' ? 'bg-red-500/10' : confirmAction.type === 'suspend' ? 'bg-amber-500/10' : 'bg-emerald-500/10'}`}>
                                    {confirmAction.type === 'delete' ? <Trash2 className="w-5 h-5 text-red-400" /> :
                                        confirmAction.type === 'suspend' ? <Ban className="w-5 h-5 text-amber-400" /> :
                                            <CheckCircle className="w-5 h-5 text-emerald-400" />}
                                </div>
                                <h3 className="text-lg font-bold text-sa-platinum capitalize">{confirmAction.type} Tenant</h3>
                            </div>
                            <button onClick={() => setConfirmAction(null)} className="p-1.5 rounded-lg hover:bg-white/5 text-sa-muted">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <p className="text-sm text-sa-muted">
                                {confirmAction.type === 'delete' ? (
                                    <>Are you sure you want to <span className="text-red-400 font-bold">permanently delete</span> this tenant? All users, data, and login access will be removed forever.</>
                                ) : confirmAction.type === 'suspend' ? (
                                    <>Are you sure you want to <span className="text-amber-400 font-bold">suspend</span> this tenant? Owner won't be able to login and bookings will be disabled.</>
                                ) : (
                                    <>Are you sure you want to <span className="text-emerald-400 font-bold">reactivate</span> this tenant? Owner will be able to login again.</>
                                )}
                            </p>

                            <div className="bg-sa-slate/50 rounded-xl px-4 py-3 border border-sa-border">
                                <div className="text-sm font-semibold text-sa-platinum">{confirmAction.tenant.name || confirmAction.tenant.salon_name}</div>
                                <div className="text-xs text-sa-muted">{confirmAction.tenant.owner?.email || 'No owner'}</div>
                            </div>

                            {confirmAction.type === 'delete' && (
                                <div className="flex items-start gap-2 bg-red-500/5 border border-red-500/10 rounded-xl px-3 py-2.5">
                                    <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                                    <p className="text-xs text-red-300/80">This action cannot be undone. All salon data, staff accounts, bookings, and client records will be permanently erased.</p>
                                </div>
                            )}

                            {/* Super PIN Input */}
                            <div>
                                <label className="text-[10px] font-bold text-sa-muted uppercase tracking-[0.15em] mb-2 block">
                                    🔐 Enter Super PIN to confirm
                                </label>
                                <input
                                    type="password"
                                    value={pin}
                                    onChange={e => { setPin(e.target.value); setPinError(false); }}
                                    placeholder="Enter PIN"
                                    maxLength={10}
                                    className={`w-full bg-sa-slate/50 border rounded-xl px-4 py-3 text-sm text-sa-platinum text-center tracking-[0.5em] font-mono placeholder:text-sa-muted/40 placeholder:tracking-normal outline-none transition-all ${pinError ? 'border-red-500 bg-red-500/5 animate-shake' : 'border-sa-border focus:border-sa-accent/50'
                                        }`}
                                    autoFocus
                                />
                                {pinError && (
                                    <p className="text-xs text-red-400 mt-1.5 text-center font-medium">❌ Wrong PIN! Access denied.</p>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setConfirmAction(null); setPin(''); setPinError(false); }}
                                disabled={actionLoading}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-sa-border text-sa-muted hover:text-sa-platinum hover:bg-white/[0.03] transition-all font-medium text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (pin !== storedPin) {
                                        setPinError(true);
                                        return;
                                    }
                                    if (confirmAction.type === 'delete') handleDelete(confirmAction.tenant);
                                    else if (confirmAction.type === 'suspend') handleSuspend(confirmAction.tenant);
                                    else handleUnsuspend(confirmAction.tenant);
                                    setPin('');
                                }}
                                disabled={actionLoading || !pin}
                                className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 ${confirmAction.type === 'delete' ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' :
                                    confirmAction.type === 'suspend' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30' :
                                        'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                                    }`}
                            >
                                {actionLoading ? 'Processing...' : `Yes, ${confirmAction.type}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
