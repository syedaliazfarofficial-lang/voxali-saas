import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import {
    Shield, Key, Lock, Download, CreditCard,
    CheckCircle, AlertTriangle, Loader2, FileText, Eye, EyeOff
} from 'lucide-react';

interface PaymentRecord {
    id: string;
    tenant_name: string;
    tenant_email: string;
    amount: number;
    currency: string;
    status: string;
    period_start: string;
    period_end: string;
    created_at: string;
    notes: string;
}

export const SuperAdminProfile: React.FC = () => {
    const { user } = useAuth();

    // Password
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // PIN
    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [pinSaving, setPinSaving] = useState(false);
    const [pinMsg, setPinMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [storedPin, setStoredPin] = useState(import.meta.env.VITE_SUPER_PIN || '545537');

    // Payments
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [paymentsLoading, setPaymentsLoading] = useState(true);

    // Fetch payments
    useEffect(() => {
        fetchPayments();
        // Load PIN from database
        supabase.from('super_admin_settings').select('value').eq('key', 'super_pin').maybeSingle()
            .then(({ data }) => { if (data?.value) setStoredPin(data.value); });
    }, []);

    const fetchPayments = async () => {
        setPaymentsLoading(true);
        try {
            const { data, error } = await supabase
                .from('subscription_payments')
                .select('*, tenants(name, salon_name)')
                .order('created_at', { ascending: false });

            if (data) {
                setPayments(data.map((p: Record<string, unknown>) => ({
                    id: p.id as string,
                    tenant_name: ((p.tenants as Record<string, unknown>)?.name || (p.tenants as Record<string, unknown>)?.salon_name || 'Unknown') as string,
                    tenant_email: (p.tenant_email || '') as string,
                    amount: (p.amount || 0) as number,
                    currency: (p.currency || 'USD') as string,
                    status: (p.status || 'paid') as string,
                    period_start: (p.period_start || '') as string,
                    period_end: (p.period_end || '') as string,
                    created_at: (p.created_at || '') as string,
                    notes: (p.notes || '') as string,
                })));
            }
            if (error && error.code !== '42P01') {
                console.error('Payments fetch error:', error);
            }
        } catch {
            // Table might not exist yet
        } finally {
            setPaymentsLoading(false);
        }
    };

    // Change Password
    const handleChangePassword = async () => {
        if (!oldPassword) {
            setPasswordMsg({ type: 'error', text: 'Enter your current password' });
            return;
        }
        if (newPassword.length < 6) {
            setPasswordMsg({ type: 'error', text: 'New password must be at least 6 characters' });
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordMsg({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        setPasswordSaving(true);
        setPasswordMsg(null);
        try {
            // Verify old password by signing in
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user?.email || '',
                password: oldPassword,
            });
            if (signInError) {
                setPasswordMsg({ type: 'error', text: 'Current password is incorrect' });
                return;
            }

            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            setPasswordMsg({ type: 'success', text: 'Password updated successfully! ✅' });
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: unknown) {
            setPasswordMsg({ type: 'error', text: (err as Error).message || 'Failed to update password' });
        } finally {
            setPasswordSaving(false);
        }
    };

    // Change PIN
    const handleChangePin = async () => {
        if (currentPin !== storedPin) {
            setPinMsg({ type: 'error', text: 'Current PIN is incorrect' });
            return;
        }
        if (newPin.length < 4) {
            setPinMsg({ type: 'error', text: 'PIN must be at least 4 digits' });
            return;
        }
        if (newPin !== confirmPin) {
            setPinMsg({ type: 'error', text: 'PINs do not match' });
            return;
        }

        setPinSaving(true);
        setPinMsg(null);
        try {
            // Store PIN in super_admin_settings table
            await supabase.from('super_admin_settings').upsert({
                key: 'super_pin',
                value: newPin,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'key' });

            setStoredPin(newPin);
            setPinMsg({ type: 'success', text: 'PIN updated successfully! ✅ New PIN is now active.' });
            setCurrentPin('');
            setNewPin('');
            setConfirmPin('');
        } catch {
            setPinMsg({ type: 'error', text: 'Failed to update PIN. Table may not exist yet.' });
        } finally {
            setPinSaving(false);
        }
    };

    // Download payments as CSV
    const downloadCSV = () => {
        if (payments.length === 0) return;

        const headers = ['Date', 'Salon', 'Amount', 'Currency', 'Status', 'Period Start', 'Period End', 'Notes'];
        const rows = payments.map(p => [
            new Date(p.created_at).toLocaleDateString(),
            p.tenant_name,
            p.amount.toFixed(2),
            p.currency,
            p.status,
            p.period_start ? new Date(p.period_start).toLocaleDateString() : '',
            p.period_end ? new Date(p.period_end).toLocaleDateString() : '',
            p.notes,
        ]);

        const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `voxali-payments-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-sa-platinum tracking-tight">Profile & Security</h1>
                <p className="text-sa-muted mt-1">Manage your account, security PIN, and payment records</p>
            </div>

            {/* Admin Info */}
            <div className="bg-sa-navy rounded-2xl border border-sa-border p-6">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-sa-gradient flex items-center justify-center shadow-lg shadow-sa-accent/20">
                        <Shield className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-sa-platinum">Super Admin</h2>
                        <p className="text-sm text-sa-muted">{user?.email || 'super@voxali.com'}</p>
                    </div>
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Change Password */}
                <div className="bg-sa-navy rounded-2xl border border-sa-border p-6 space-y-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                            <Key className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-sa-platinum">Change Password</h3>
                            <p className="text-xs text-sa-muted">Update your login password</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-sa-muted uppercase tracking-[0.15em] mb-2 block">Current Password</label>
                            <input
                                type="password"
                                value={oldPassword}
                                onChange={e => setOldPassword(e.target.value)}
                                className="w-full bg-sa-slate/50 border border-sa-border rounded-xl px-4 py-3 text-sm text-sa-platinum outline-none focus:border-sa-accent/50 transition-all"
                                placeholder="Enter current password"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-sa-muted uppercase tracking-[0.15em] mb-2 block">New Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    className="w-full bg-sa-slate/50 border border-sa-border rounded-xl px-4 py-3 text-sm text-sa-platinum outline-none focus:border-sa-accent/50 transition-all pr-10"
                                    placeholder="Min 6 characters"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sa-muted hover:text-sa-platinum"
                                    title={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-sa-muted uppercase tracking-[0.15em] mb-2 block">Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="w-full bg-sa-slate/50 border border-sa-border rounded-xl px-4 py-3 text-sm text-sa-platinum outline-none focus:border-sa-accent/50 transition-all"
                                placeholder="Re-enter password"
                            />
                        </div>
                    </div>

                    {passwordMsg && (
                        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${passwordMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                            {passwordMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                            {passwordMsg.text}
                        </div>
                    )}

                    <button
                        onClick={handleChangePassword}
                        disabled={passwordSaving || !oldPassword || !newPassword || !confirmPassword}
                        className="w-full px-4 py-3 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl font-bold text-sm hover:bg-blue-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {passwordSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                        {passwordSaving ? 'Updating...' : 'Update Password'}
                    </button>
                </div>

                {/* Change PIN */}
                <div className="bg-sa-navy rounded-2xl border border-sa-border p-6 space-y-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/10">
                            <Lock className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-sa-platinum">Change Super PIN</h3>
                            <p className="text-xs text-sa-muted">Security PIN for delete/suspend actions</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-sa-muted uppercase tracking-[0.15em] mb-2 block">Current PIN</label>
                            <input
                                type="password"
                                value={currentPin}
                                onChange={e => setCurrentPin(e.target.value)}
                                className="w-full bg-sa-slate/50 border border-sa-border rounded-xl px-4 py-3 text-sm text-sa-platinum text-center tracking-[0.5em] font-mono outline-none focus:border-sa-accent/50 transition-all"
                                placeholder="••••••"
                                maxLength={10}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-sa-muted uppercase tracking-[0.15em] mb-2 block">New PIN</label>
                            <input
                                type="password"
                                value={newPin}
                                onChange={e => setNewPin(e.target.value)}
                                className="w-full bg-sa-slate/50 border border-sa-border rounded-xl px-4 py-3 text-sm text-sa-platinum text-center tracking-[0.5em] font-mono outline-none focus:border-sa-accent/50 transition-all"
                                placeholder="••••••"
                                maxLength={10}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-sa-muted uppercase tracking-[0.15em] mb-2 block">Confirm New PIN</label>
                            <input
                                type="password"
                                value={confirmPin}
                                onChange={e => setConfirmPin(e.target.value)}
                                className="w-full bg-sa-slate/50 border border-sa-border rounded-xl px-4 py-3 text-sm text-sa-platinum text-center tracking-[0.5em] font-mono outline-none focus:border-sa-accent/50 transition-all"
                                placeholder="••••••"
                                maxLength={10}
                            />
                        </div>
                    </div>

                    {pinMsg && (
                        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${pinMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                            {pinMsg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                            {pinMsg.text}
                        </div>
                    )}

                    <button
                        onClick={handleChangePin}
                        disabled={pinSaving || !currentPin || !newPin || !confirmPin}
                        className="w-full px-4 py-3 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl font-bold text-sm hover:bg-amber-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {pinSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                        {pinSaving ? 'Updating...' : 'Update PIN'}
                    </button>
                </div>
            </div>

            {/* Payment Records */}
            <div className="bg-sa-navy rounded-2xl border border-sa-border overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-sa-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-emerald-500/10">
                            <CreditCard className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-sa-platinum">Payment Records</h3>
                            <p className="text-xs text-sa-muted">Subscription payments from all salons</p>
                        </div>
                    </div>
                    <button
                        onClick={downloadCSV}
                        disabled={payments.length === 0}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-xs font-semibold disabled:opacity-30"
                        title="Download as CSV"
                    >
                        <Download className="w-4 h-4" />
                        Download CSV
                    </button>
                </div>

                {paymentsLoading ? (
                    <div className="px-6 py-12 text-center">
                        <Loader2 className="w-6 h-6 text-sa-accent animate-spin mx-auto" />
                    </div>
                ) : payments.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <FileText className="w-10 h-10 text-sa-muted/30 mx-auto mb-3" />
                        <p className="text-sa-muted text-sm">No payment records yet</p>
                        <p className="text-sa-muted/50 text-xs mt-1">Records will appear once salons make subscription payments</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-sa-border">
                                <th className="text-left px-6 py-3 text-[10px] font-bold text-sa-muted uppercase tracking-[0.15em]">Date</th>
                                <th className="text-left px-6 py-3 text-[10px] font-bold text-sa-muted uppercase tracking-[0.15em]">Salon</th>
                                <th className="text-left px-6 py-3 text-[10px] font-bold text-sa-muted uppercase tracking-[0.15em]">Amount</th>
                                <th className="text-left px-6 py-3 text-[10px] font-bold text-sa-muted uppercase tracking-[0.15em]">Status</th>
                                <th className="text-left px-6 py-3 text-[10px] font-bold text-sa-muted uppercase tracking-[0.15em]">Period</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-sa-border">
                            {payments.map((p) => (
                                <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-3 text-sm text-sa-muted">
                                        {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </td>
                                    <td className="px-6 py-3 text-sm text-sa-platinum font-medium">{p.tenant_name}</td>
                                    <td className="px-6 py-3 text-sm text-emerald-400 font-bold">${p.amount.toFixed(2)}</td>
                                    <td className="px-6 py-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : p.status === 'overdue' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                            {p.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-xs text-sa-muted">
                                        {p.period_start && p.period_end ? (
                                            `${new Date(p.period_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(p.period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                                        ) : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
