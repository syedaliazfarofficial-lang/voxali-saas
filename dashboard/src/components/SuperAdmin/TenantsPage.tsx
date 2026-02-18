import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Building2, Plus, Eye, Search, RefreshCw } from 'lucide-react';
import { AddTenantModal } from './AddTenantModal';

interface TenantsPageProps {
    onImpersonate: (tenantId: string, tenantName?: string) => void;
}

export const TenantsPage: React.FC<TenantsPageProps> = ({ onImpersonate }) => {
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        fetchTenants();
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

    const filteredTenants = tenants.filter(t =>
        (t.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (t.owner?.email || '').toLowerCase().includes(search.toLowerCase())
    );

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
                <button
                    onClick={fetchTenants}
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
                                <tr key={tenant.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-sa-slate flex items-center justify-center text-sa-accent">
                                                <Building2 className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-sm text-sa-platinum">{tenant.name || tenant.salon_name || 'Unnamed'}</div>
                                                <div className="text-[11px] text-sa-muted/50">{tenant.id?.slice(0, 8)}...</div>
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
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                            Active
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-sa-muted">
                                        {new Date(tenant.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => onImpersonate(tenant.id, tenant.name || tenant.salon_name)}
                                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-sa-accent/10 text-sa-accent border border-sa-accent/20 hover:bg-sa-accent/20 hover:border-sa-accent/40 transition-all text-xs font-semibold opacity-0 group-hover:opacity-100"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            Access Dashboard
                                        </button>
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
        </div>
    );
};
