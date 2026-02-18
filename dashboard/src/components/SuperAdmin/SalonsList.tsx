import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Building2, Plus, MoreVertical, Shield } from 'lucide-react';
import { showToast } from '../ui/ToastNotification';

export const SalonsList = () => {
    const [salons, setSalons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Form State
    const [newSalon, setNewSalon] = useState({
        name: '',
        ownerName: '',
        ownerEmail: '',
        ownerPassword: ''
    });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchSalons();
    }, []);

    const fetchSalons = async () => {
        try {
            const { data, error } = await supabase
                .from('tenants')
                .select(`
                    *,
                    profiles:profiles(full_name, email, role)
                `)
                .order('created_at', { ascending: false });

            if (data) {
                // Filter to find the 'owner' profile for each tenant
                const processed = data.map(tenant => ({
                    ...tenant,
                    owner: tenant.profiles?.find((p: any) => p.role === 'owner')
                }));
                setSalons(processed);
            }
        } catch (error) {
            console.error('Error fetching salons:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSalon = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);

        try {
            const { data, error } = await supabase.rpc('rpc_create_tenant_and_owner', {
                p_salon_name: newSalon.name,
                p_owner_name: newSalon.ownerName,
                p_owner_email: newSalon.ownerEmail,
                p_owner_password: newSalon.ownerPassword
            });

            if (error) throw error;
            if (data && !data.success) throw new Error(data.error);

            showToast('Salon created successfully!', 'success');
            setIsCreateModalOpen(false);
            setNewSalon({ name: '', ownerName: '', ownerEmail: '', ownerPassword: '' });
            fetchSalons(); // Refresh list
        } catch (error: any) {
            console.error('Error creating salon:', error);
            showToast(error.message || 'Failed to create salon', 'error');
        } finally {
            setCreating(false);
        }
    };

    if (loading) return <div className="text-white p-8">Loading Salons...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">All Salons</h2>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="px-4 py-2 bg-luxe-gold text-luxe-obsidian rounded-lg font-bold hover:bg-yellow-500 transition-colors flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Add Salon
                </button>
            </div>

            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-white/5 border-b border-white/10">
                        <tr>
                            <th className="text-left p-4 text-white/60 text-sm font-medium">Salon Name</th>
                            <th className="text-left p-4 text-white/60 text-sm font-medium">Owner</th>
                            <th className="text-left p-4 text-white/60 text-sm font-medium">Status</th>
                            <th className="text-left p-4 text-white/60 text-sm font-medium">Created At</th>
                            <th className="text-right p-4 text-white/60 text-sm font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {salons.map((salon) => (
                            <tr key={salon.id} className="hover:bg-white/5 transition-colors">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white">
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-white">{salon.name}</div>
                                            <div className="text-xs text-white/40">{salon.slug}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    {salon.owner ? (
                                        <div>
                                            <div className="text-white text-sm">{salon.owner.full_name}</div>
                                            <div className="text-white/40 text-xs">{salon.owner.email}</div>
                                        </div>
                                    ) : (
                                        <span className="text-red-400 text-xs">No Owner Found</span>
                                    )}
                                </td>
                                <td className="p-4">
                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/20">
                                        Active
                                    </span>
                                </td>
                                <td className="p-4 text-white/60 text-sm">
                                    {new Date(salon.created_at).toLocaleDateString()}
                                </td>
                                <td className="p-4 text-right">
                                    <button aria-label="Actions" className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors">
                                        <MoreVertical className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create Salon Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-luxe-obsidian border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-6">Add New Salon</h3>
                        <form onSubmit={handleCreateSalon} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-white/60 mb-1">Salon Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newSalon.name}
                                    onChange={e => setNewSalon({ ...newSalon, name: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-luxe-gold/50"
                                    placeholder="e.g. Luxe Beauty Spa"
                                />
                            </div>

                            <div className="pt-4 border-t border-white/10">
                                <h4 className="text-sm font-bold text-luxe-gold mb-3 flex items-center gap-2">
                                    <Shield className="w-4 h-4" /> Owner Account
                                </h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-white/60 mb-1">Owner Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={newSalon.ownerName}
                                            onChange={e => setNewSalon({ ...newSalon, ownerName: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-luxe-gold/50"
                                            placeholder="Full Name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-white/60 mb-1">Owner Email</label>
                                        <input
                                            type="email"
                                            required
                                            value={newSalon.ownerEmail}
                                            onChange={e => setNewSalon({ ...newSalon, ownerEmail: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-luxe-gold/50"
                                            placeholder="owner@salon.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-white/60 mb-1">Password</label>
                                        <input
                                            type="password"
                                            required
                                            value={newSalon.ownerPassword}
                                            onChange={e => setNewSalon({ ...newSalon, ownerPassword: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-luxe-gold/50"
                                            placeholder="Min 6 characters"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="flex-1 px-4 py-3 bg-luxe-gold text-luxe-obsidian rounded-xl font-bold hover:bg-yellow-500 transition-colors disabled:opacity-50"
                                >
                                    {creating ? 'Creating...' : 'Create Salon'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
