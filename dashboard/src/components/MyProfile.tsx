import React, { useState, useEffect } from 'react';
import { User, Lock, Save, Loader2, CheckCircle2, Phone, Mail, Shield, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';
import { showToast } from './ui/ToastNotification';

export const MyProfile: React.FC = () => {
    const { user, profile, staffRecord } = useAuth();
    const { tenantId } = useTenant();
    const [saving, setSaving] = useState(false);

    // Profile fields
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState('');

    // Password change
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [changingPw, setChangingPw] = useState(false);
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);

    // Load profile data
    useEffect(() => {
        if (staffRecord) {
            setFullName((staffRecord as any).full_name || '');
            setEmail((staffRecord as any).email || user?.email || '');
            setPhone((staffRecord as any).phone || '');
            setRole((staffRecord as any).role || 'staff');
        } else if (profile) {
            setFullName((profile as any).full_name || '');
            setEmail((profile as any).email || user?.email || '');
            setPhone('');
            setRole((profile as any).role || 'owner');
        }
    }, [staffRecord, profile, user]);

    const handleSaveProfile = async () => {
        if (!fullName) return;
        setSaving(true);

        // If staff, update staff table
        if (staffRecord) {
            const staffId = (staffRecord as any).id || (profile as any)?.staff_id;
            if (staffId) {
                const updates: any = { full_name: fullName };
                if (phone) updates.phone = phone;

                const { error } = await supabase
                    .from('staff')
                    .update(updates)
                    .eq('id', staffId)
                    .eq('tenant_id', tenantId);

                if (!error) {
                    showToast('Profile updated!');
                } else {
                    showToast(error.message, 'error');
                }
            }
        }
        setSaving(false);
    };

    const handleChangePassword = async () => {
        if (!currentPw || !newPw) return;
        if (newPw.length < 6) {
            showToast('Password must be at least 6 characters', 'error');
            return;
        }
        if (newPw !== confirmPw) {
            showToast('Passwords do not match', 'error');
            return;
        }

        setChangingPw(true);

        // Supabase requires re-authentication, then update
        const { error } = await supabase.auth.updateUser({
            password: newPw,
        });

        if (!error) {
            showToast('Password changed successfully!');
            setCurrentPw('');
            setNewPw('');
            setConfirmPw('');
        } else {
            showToast(error.message, 'error');
        }
        setChangingPw(false);
    };

    const roleLabels: Record<string, string> = {
        owner: 'Salon Owner',
        manager: 'Manager',
        staff: 'Staff',
        stylist: 'Stylist',
        colorist: 'Colorist',
        barber: 'Barber',
        nail_tech: 'Nail Tech',
        esthetician: 'Esthetician',
        makeup_artist: 'Makeup Artist',
        lash_brow_tech: 'Lash/Brow Tech',
        salon_assistant: 'Salon Assistant',
        receptionist: 'Receptionist',
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl">
            {/* Profile Info Card */}
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-luxe-gold/10 rounded-2xl border border-luxe-gold/20">
                        <User className="w-6 h-6 text-luxe-gold" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">My Profile</h3>
                        <p className="text-xs text-white/40 uppercase tracking-widest">Personal Information</p>
                    </div>
                </div>

                {/* Avatar + Role Badge */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-luxe-gold/20 border border-luxe-gold/30 flex items-center justify-center text-2xl font-black text-luxe-gold">
                        {fullName.charAt(0) || '?'}
                    </div>
                    <div>
                        <p className="text-lg font-bold">{fullName || 'Staff Member'}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <Shield className="w-3 h-3 text-luxe-gold" />
                            <span className="text-xs font-bold text-luxe-gold uppercase tracking-wider">
                                {roleLabels[role] || role}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Edit Fields */}
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Full Name</label>
                        <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name"
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block flex items-center gap-1">
                                <Mail className="w-3 h-3" /> Email
                            </label>
                            <input value={email} disabled
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none text-white/40 cursor-not-allowed" />
                            <p className="text-[10px] text-white/20 mt-1">Contact admin to change email</p>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block flex items-center gap-1">
                                <Phone className="w-3 h-3" /> Phone
                            </label>
                            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555-0001"
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all" />
                        </div>
                    </div>
                </div>

                <button onClick={handleSaveProfile} disabled={saving || !fullName}
                    className="w-full mt-6 bg-gold-gradient text-luxe-obsidian font-bold py-3 rounded-xl shadow-lg shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {saving ? 'SAVING...' : 'SAVE PROFILE'}
                </button>
            </div>

            {/* Password Change Card */}
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-red-500/10 rounded-2xl border border-red-500/20">
                        <Lock className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">Change Password</h3>
                        <p className="text-xs text-white/40 uppercase tracking-widest">Security Settings</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Current Password</label>
                        <div className="relative">
                            <input type={showCurrentPw ? 'text' : 'password'} value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Enter current password"
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pr-10 text-sm outline-none focus:border-luxe-gold/50 transition-all" />
                            <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors" title="Toggle password visibility">
                                {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">New Password</label>
                            <div className="relative">
                                <input type={showNewPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min 6 characters"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pr-10 text-sm outline-none focus:border-luxe-gold/50 transition-all" />
                                <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors" title="Toggle password visibility">
                                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Confirm Password</label>
                            <div className="relative">
                                <input type={showConfirmPw ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Repeat password"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pr-10 text-sm outline-none focus:border-luxe-gold/50 transition-all" />
                                <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors" title="Toggle password visibility">
                                    {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <button onClick={handleChangePassword} disabled={changingPw || !currentPw || !newPw || !confirmPw}
                    className="w-full mt-6 bg-red-500/20 text-red-400 border border-red-500/30 font-bold py-3 rounded-xl hover:bg-red-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {changingPw ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    {changingPw ? 'CHANGING...' : 'CHANGE PASSWORD'}
                </button>
            </div>
        </div>
    );
};
