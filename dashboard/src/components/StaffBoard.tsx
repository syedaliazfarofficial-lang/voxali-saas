import React, { useState, useEffect, useCallback } from 'react';
import {
    BarChart3, TrendingUp, Trophy, ArrowUpRight, Scissors,
    Loader2, Ban, CheckCircle2, Undo2, Plus, X,
    UserMinus, Percent, UserPlus, Key, Lock
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TENANT_ID } from '../config/constants';
import { showToast } from './ui/ToastNotification';
import { ConfirmModal } from './ui/ConfirmModal';

interface StaffMember {
    id: string; full_name: string; role: string; color: string;
    is_active: boolean; bookings_count: number; revenue: number;
    is_blocked_today: boolean; commission_rate: number;
    email?: string; // Added email
}

export const StaffBoard: React.FC = () => {
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showCommModal, setShowCommModal] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
    const [saving, setSaving] = useState(false);
    const [showInactive, setShowInactive] = useState(false);

    // Deactivate confirm
    const [deactivateTarget, setDeactivateTarget] = useState<StaffMember | null>(null);

    // Add form
    const [aName, setAName] = useState('');
    const [aEmail, setAEmail] = useState('');
    const [aPhone, setAPhone] = useState('');
    const [aRole, setARole] = useState('stylist');
    const [aComm, setAComm] = useState('15');

    // Commission form
    const [commRate, setCommRate] = useState('');

    // Login form
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    // Change Password form
    const [changePwStaff, setChangePwStaff] = useState<StaffMember | null>(null);
    const [newPw, setNewPw] = useState('');

    const fetchStaff = useCallback(async () => {
        if (!TENANT_ID) return;
        setLoading(true);
        const { data, error } = await supabase.rpc('rpc_staff_board', { p_tenant_id: TENANT_ID });
        if (data && Array.isArray(data)) {
            setStaff(data.map((s: any) => ({
                ...s,
                commission_rate: s.commission_rate ?? 15,
            })));
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchStaff(); }, [fetchStaff]);

    const handleBlock = async (staffId: string, staffName: string) => {
        const { error } = await supabase.rpc('rpc_block_staff_today', { p_tenant_id: TENANT_ID, p_staff_id: staffId });
        if (!error) { showToast(`${staffName} blocked for today`); fetchStaff(); }
    };

    const handleUnblock = async (staffId: string, staffName: string) => {
        const { error } = await supabase.rpc('rpc_unblock_staff_today', { p_tenant_id: TENANT_ID, p_staff_id: staffId });
        if (!error) { showToast(`${staffName} unblocked`); fetchStaff(); }
    };

    const handleAddStaff = async () => {
        if (!aName) return;
        setSaving(true);
        const { data, error } = await supabase.rpc('rpc_add_staff', {
            p_tenant_id: TENANT_ID,
            p_name: aName,
            p_email: aEmail || null,
            p_phone: aPhone || null,
            p_role: aRole,
            p_commission: parseFloat(aComm) || 15,
        });
        if (!error && data?.success) {
            showToast('Staff added!');
            setShowAddModal(false);
            setAName(''); setAEmail(''); setAPhone(''); setARole('stylist'); setAComm('15');
            fetchStaff();
        } else {
            showToast(error?.message || 'Failed', 'error');
        }
        setSaving(false);
    };

    const handleChangePassword = async () => {
        if (!changePwStaff || !newPw) return;
        setSaving(true);

        // Fetch email first
        const { data: staffData, error: fetchError } = await supabase
            .from('staff')
            .select('email')
            .eq('id', changePwStaff.id)
            .single();

        if (fetchError || !staffData?.email) {
            showToast('Could not find staff email', 'error');
            setSaving(false);
            return;
        }

        const { error } = await supabase.rpc('rpc_change_staff_password', {
            p_staff_email: staffData.email,
            p_new_password: newPw
        });

        if (!error) {
            showToast('Password updated successfully');
            setChangePwStaff(null);
            setNewPw('');
        } else {
            showToast(error.message || 'Failed to update password', 'error');
        }
        setSaving(false);
    };

    const handleDeactivate = async () => {
        if (!deactivateTarget) return;
        const { error } = await supabase.rpc('rpc_deactivate_staff', {
            p_tenant_id: TENANT_ID, p_staff_id: deactivateTarget.id,
        });
        if (!error) { showToast(`${deactivateTarget.full_name} deactivated`); fetchStaff(); }
        setDeactivateTarget(null);
    };

    const handleReactivate = async (s: StaffMember) => {
        const { error } = await supabase.rpc('rpc_reactivate_staff', {
            p_tenant_id: TENANT_ID, p_staff_id: s.id,
        });
        if (!error) { showToast(`${s.full_name} reactivated`); fetchStaff(); }
    };

    const openCommModal = (s: StaffMember) => {
        setSelectedStaff(s);
        setCommRate(String(s.commission_rate));
        setShowCommModal(true);
    };

    const handleUpdateComm = async () => {
        if (!selectedStaff) return;
        setSaving(true);
        const { error } = await supabase.rpc('rpc_update_commission', {
            p_tenant_id: TENANT_ID,
            p_staff_id: selectedStaff.id,
            p_rate: parseFloat(commRate) || 15,
        });
        if (!error) {
            showToast(`Commission updated to ${commRate}%`);
            setShowCommModal(false);
            fetchStaff();
        }
        setSaving(false);
    };

    // Staff Login
    const openLoginModal = (s: StaffMember) => {
        setSelectedStaff(s);
        setLoginEmail(s.full_name.replace(/\s+/g, '.').toLowerCase() + '@salon.com');
        setLoginPassword('');
        setShowLoginModal(true);
    };

    const handleCreateLogin = async () => {
        if (!selectedStaff || !loginEmail || !loginPassword) return;
        if (loginPassword.length < 6) {
            showToast('Password must be at least 6 characters', 'error');
            return;
        }
        setSaving(true);

        const { data, error } = await supabase.rpc('rpc_create_staff_login', {
            p_tenant_id: TENANT_ID,
            p_staff_id: selectedStaff.id,
            p_email: loginEmail,
            p_password: loginPassword,
        });

        if (!error && data?.success) {
            showToast(`Login created for ${selectedStaff.full_name}`);
            setShowLoginModal(false);
        } else {
            showToast(error?.message || data?.error || 'Failed to create login', 'error');
        }
        setSaving(false);
    };

    const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

    const activeStaff = staff.filter(s => s.is_active);
    const inactiveStaff = staff.filter(s => !s.is_active);
    const totalRev = activeStaff.reduce((s, m) => s + m.revenue, 0);
    const totalBookings = activeStaff.reduce((s, m) => s + m.bookings_count, 0);

    if (loading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-luxe-gold animate-spin" /></div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-luxe-gold/10 rounded-2xl border border-luxe-gold/20">
                        <Scissors className="w-6 h-6 text-luxe-gold" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">Staff Board</h3>
                        <p className="text-xs text-white/40 uppercase tracking-widest">Team Performance & Management</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowInactive(!showInactive)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${showInactive ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/10 text-white/40'}`}
                    >
                        {showInactive ? 'Hide Inactive' : `Show Inactive (${inactiveStaff.length})`}
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-gold-gradient text-luxe-obsidian px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        <Plus className="w-5 h-5" /> ADD STAFF
                    </button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <PerformanceStat label="Active Staff" value={String(activeStaff.length)} trend="+1 this month" icon={Scissors} />
                <PerformanceStat label="Total Revenue" value={`$${fmt(totalRev)}`} trend="This month" icon={TrendingUp} />
                <PerformanceStat label="Total Bookings" value={String(totalBookings)} trend="This month" icon={BarChart3} />
                <PerformanceStat label="Top Earner" value={activeStaff.length > 0 ? activeStaff.sort((a, b) => b.revenue - a.revenue)[0].full_name.split(' ')[0] : '—'} trend="🏆" icon={Trophy} />
            </div>

            {/* Staff Table */}
            <div className="glass-panel border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                <th className="text-left px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Stylist</th>
                                <th className="text-center px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Bookings</th>
                                <th className="text-center px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Revenue</th>
                                <th className="text-center px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Commission %</th>
                                <th className="text-center px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Earned</th>
                                <th className="text-center px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Status</th>
                                <th className="text-center px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeStaff.map((s) => {
                                const commission = s.revenue * (s.commission_rate / 100);
                                return (
                                    <tr key={s.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black border border-white/10" style={{ color: s.color, backgroundColor: `${s.color}15` }}>
                                                    {s.full_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm">{s.full_name}</p>
                                                    <p className="text-[10px] text-white/30 uppercase tracking-wider">{s.role}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center font-bold text-sm">{s.bookings_count}</td>
                                        <td className="px-6 py-5 text-center font-bold text-sm text-green-400">${s.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                        <td className="px-6 py-5 text-center">
                                            <button
                                                onClick={() => openCommModal(s)}
                                                className="font-bold text-sm text-luxe-gold hover:underline cursor-pointer"
                                            >
                                                {s.commission_rate}%
                                            </button>
                                        </td>
                                        <td className="px-6 py-5 text-center font-bold text-sm text-luxe-gold">${commission.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                        <td className="px-6 py-5 text-center">
                                            {s.is_blocked_today ? (
                                                <span className="text-[9px] font-bold bg-red-500/10 text-red-400 px-3 py-1.5 rounded-full border border-red-500/20">BLOCKED</span>
                                            ) : (
                                                <span className="text-[9px] font-bold bg-green-500/10 text-green-400 px-3 py-1.5 rounded-full border border-green-500/20">ACTIVE</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {s.is_blocked_today ? (
                                                    <button onClick={() => handleUnblock(s.id, s.full_name)} title="Unblock"
                                                        className="p-2 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-all">
                                                        <Undo2 className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <button onClick={() => handleBlock(s.id, s.full_name)} title="Block Today (Leave/Sick)"
                                                        className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all">
                                                        <Ban className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button onClick={() => openLoginModal(s)} title="Create Login"
                                                    className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-blue-400 hover:bg-blue-400/10 transition-all">
                                                    <Key className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => {
                                                    setChangePwStaff(s);
                                                    setNewPw('');
                                                }} title="Change Password" aria-label="Change Password"
                                                    className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all">
                                                    <Lock className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => setDeactivateTarget(s)} title="Remove Staff"
                                                    className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all">
                                                    <UserMinus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Inactive Staff */}
            {showInactive && inactiveStaff.length > 0 && (
                <div className="glass-panel p-6 border border-white/5">
                    <h4 className="font-bold text-sm text-white/50 mb-4 flex items-center gap-2">
                        <UserMinus className="w-4 h-4" /> Inactive Staff
                    </h4>
                    <div className="space-y-3">
                        {inactiveStaff.map(s => (
                            <div key={s.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-white/40">{s.full_name.charAt(0)}</div>
                                    <div>
                                        <p className="text-sm font-bold text-white/50">{s.full_name}</p>
                                        <p className="text-[10px] text-white/30">{s.role}</p>
                                    </div>
                                </div>
                                <button onClick={() => handleReactivate(s)}
                                    className="px-4 py-2 rounded-xl bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-bold hover:bg-green-500/20 transition-all">
                                    REACTIVATE
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Add Staff Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
                    <div className="bg-luxe-obsidian border border-white/10 rounded-2xl p-8 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <UserPlus className="w-6 h-6 text-luxe-gold" /> Add New Staff
                            </h3>
                            <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Full Name *</label>
                                <input value={aName} onChange={e => setAName(e.target.value)} placeholder="Sarah Johnson"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Email</label>
                                    <input value={aEmail} onChange={e => setAEmail(e.target.value)} placeholder="sarah@salon.com"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Phone</label>
                                    <input value={aPhone} onChange={e => setAPhone(e.target.value)} placeholder="+1 555-0101"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Role</label>
                                    <select value={aRole} onChange={e => setARole(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all">
                                        <option value="stylist">Stylist</option>
                                        <option value="manager">Manager</option>
                                        <option value="nail_tech">Nail Tech</option>
                                        <option value="barber">Barber</option>
                                        <option value="colorist">Colorist</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Commission %</label>
                                    <input type="number" value={aComm} onChange={e => setAComm(e.target.value)} min="0" max="100" step="1"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all" />
                                </div>
                            </div>
                        </div>
                        <button onClick={handleAddStaff} disabled={saving || !aName}
                            className="w-full mt-6 bg-gold-gradient text-luxe-obsidian font-bold py-3 rounded-xl shadow-lg shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                            {saving ? 'ADDING...' : 'ADD STAFF'}
                        </button>
                    </div>
                </div>
            )}

            {/* Commission Modal */}
            {showCommModal && selectedStaff && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCommModal(false)}>
                    <div className="bg-luxe-obsidian border border-white/10 rounded-2xl p-8 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Percent className="w-6 h-6 text-luxe-gold" /> Set Commission
                            </h3>
                            <button onClick={() => setShowCommModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-white/50 text-sm mb-4">Commission rate for <span className="text-white font-bold">{selectedStaff.full_name}</span></p>
                        <div className="flex items-center gap-3">
                            <input type="number" value={commRate} onChange={e => setCommRate(e.target.value)} min="0" max="100" step="1"
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-lg font-bold text-center outline-none focus:border-luxe-gold/50 transition-all" />
                            <span className="text-2xl font-bold text-white/40">%</span>
                        </div>
                        <p className="text-[10px] text-white/30 mt-2">
                            Current revenue: ${selectedStaff.revenue.toLocaleString()} → Earned: ${(selectedStaff.revenue * parseFloat(commRate || '0') / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                        <button onClick={handleUpdateComm} disabled={saving}
                            className="w-full mt-6 bg-gold-gradient text-luxe-obsidian font-bold py-3 rounded-xl shadow-lg shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                            UPDATE COMMISSION
                        </button>
                    </div>
                </div>
            )}

            {/* Create Login Modal */}
            {showLoginModal && selectedStaff && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowLoginModal(false)}>
                    <div className="bg-luxe-obsidian border border-white/10 rounded-2xl p-8 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Key className="w-6 h-6 text-luxe-gold" /> Create Staff Login
                            </h3>
                            <button onClick={() => setShowLoginModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-white/50 text-sm mb-6">
                            Create a dashboard login for <span className="text-white font-bold">{selectedStaff.full_name}</span> so they can access the system.
                        </p>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Email *</label>
                                <input value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="staff@salon.com"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Temporary Password *</label>
                                <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Min 6 characters"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all" />
                                <p className="text-[10px] text-white/20 mt-1">Staff member should change this on first login</p>
                            </div>
                        </div>
                        <button
                            onClick={handleCreateLogin}
                            disabled={saving || !loginEmail || loginPassword.length < 6}
                            className="w-full mt-6 bg-gold-gradient text-luxe-obsidian font-bold py-3 rounded-xl shadow-lg shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Key className="w-5 h-5" />}
                            {saving ? 'CREATING...' : 'CREATE LOGIN'}
                        </button>
                    </div>
                </div>
            )}

            {/* Change Password Modal */}
            {changePwStaff && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-md bg-luxe-obsidian border border-white/10 rounded-2xl p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Lock className="w-5 h-5 text-luxe-gold" />
                                Change Password
                            </h3>
                            <button onClick={() => setChangePwStaff(null)} className="text-white/40 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="mb-6">
                            <p className="text-sm text-white/60 mb-4">
                                Setting new password for <span className="text-white font-bold">{changePwStaff.full_name}</span>.
                            </p>

                            <label className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2 block">New Password</label>
                            <input
                                type="text"
                                value={newPw}
                                onChange={e => setNewPw(e.target.value)}
                                placeholder="Enter new password"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-luxe-gold/50 transition-all"
                            />
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setChangePwStaff(null)}
                                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white/40 hover:bg-white/5 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleChangePassword}
                                disabled={saving || !newPw}
                                className="px-6 py-2 rounded-xl bg-gold-gradient text-luxe-obsidian text-xs font-bold uppercase tracking-wider hover:shadow-lg hover:shadow-luxe-gold/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Deactivate Confirmation */}
            <ConfirmModal
                open={!!deactivateTarget}
                title="Deactivate Staff"
                message={`Remove ${deactivateTarget?.full_name} from active staff? They won't appear in booking options but their history will be preserved.`}
                confirmLabel="Deactivate"
                danger
                onConfirm={handleDeactivate}
                onCancel={() => setDeactivateTarget(null)}
            />
        </div>
    );
};

const PerformanceStat: React.FC<{ label: string; value: string; trend: string; icon: React.ElementType }> = ({ label, value, trend, icon: Icon }) => (
    <div className="glass-panel p-6 group hover:gold-border transition-all">
        <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">{label}</p>
            <div className="p-2 rounded-xl bg-luxe-gold/10 group-hover:bg-luxe-gold/20 transition-all">
                <Icon className="w-4 h-4 text-luxe-gold" />
            </div>
        </div>
        <p className="text-2xl font-black">{value}</p>
        <p className="text-[10px] text-luxe-gold mt-1 font-bold flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> {trend}
        </p>
    </div>
);
