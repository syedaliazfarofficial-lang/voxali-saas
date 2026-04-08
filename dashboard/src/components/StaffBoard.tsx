import React, { useState, useEffect, useCallback } from 'react';
import {
    BarChart3, TrendingUp, Trophy, ArrowUpRight, Scissors,
    Loader2, Ban, CheckCircle2, Undo2, Plus, X,
    UserMinus, Percent, UserPlus, Key, Lock, Eye, EyeOff,
    CalendarDays, Trash2, AlertTriangle, Pencil, Clock, Copy, Banknote
} from 'lucide-react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { useTenant } from '../context/TenantContext';
import { showToast } from './ui/ToastNotification';
import { StaffSkeleton } from './ui/Skeleton';
import { ConfirmModal } from './ui/ConfirmModal';
import { PayrollRunsView } from './PayrollRunsView';
import { useAuth } from '../context/AuthContext';

interface LeaveEntry { id: string; start_datetime: string; end_datetime: string; reason: string; }
interface ConflictBooking { booking_id: string; client_name: string; service_name: string; start_time: string; status: string; }

interface StaffMember {
    id: string; full_name: string; role: string; color: string;
    is_active: boolean; bookings_count: number; revenue: number;
    is_blocked_today: boolean; commission_rate: number; base_salary: number;
    email?: string; phone?: string;
}

export const StaffBoard: React.FC = () => {
    const { isOwner, isSuperAdmin } = useAuth();
    const isOwnerPrivilege = isOwner || isSuperAdmin;

    const [activeTab, setActiveTab] = useState<'directory' | 'payroll'>('directory');
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const { tenantId, planTier } = useTenant();
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
    const [aPassword, setAPassword] = useState('');
    const [aConfirmPw, setAConfirmPw] = useState('');
    const [showAPassword, setShowAPassword] = useState(false);
    const [aCanBook, setACanBook] = useState(true);

    // Commission form
    const [commRate, setCommRate] = useState('');
    const [salaryRate, setSalaryRate] = useState('');

    // Login form
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    // Change Password form
    const [changePwStaff, setChangePwStaff] = useState<StaffMember | null>(null);
    const [newPw, setNewPw] = useState('');

    // Leave Management
    const [leaveStaff, setLeaveStaff] = useState<StaffMember | null>(null);
    const [leaveStart, setLeaveStart] = useState('');
    const [leaveEnd, setLeaveEnd] = useState('');
    const [leaveReason, setLeaveReason] = useState('Vacation');
    const [conflicts, setConflicts] = useState<ConflictBooking[]>([]);
    const [conflictsChecked, setConflictsChecked] = useState(false);
    const [existingLeaves, setExistingLeaves] = useState<LeaveEntry[]>([]);
    const [loadingConflicts, setLoadingConflicts] = useState(false);

    // Permanent Delete
    const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);

    // Edit Staff
    const [editStaff, setEditStaff] = useState<StaffMember | null>(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editRole, setEditRole] = useState('');
    const [editComm, setEditComm] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [editConfirmPw, setEditConfirmPw] = useState('');
    const [showEditPassword, setShowEditPassword] = useState(false);
    const [editCanBook, setEditCanBook] = useState(true);
    const [showNewPw, setShowNewPw] = useState(false);

    // Working Hours
    const [hoursStaff, setHoursStaff] = useState<StaffMember | null>(null);
    const [staffHours, setStaffHours] = useState<{ day_of_week: number; start_time: string; end_time: string; is_active: boolean }[]>([]);
    const [loadingHours, setLoadingHours] = useState(false);
    const [savingHours, setSavingHours] = useState(false);

    // Ledger Modal
    const [showLedgerModal, setShowLedgerModal] = useState(false);
    const [ledgerStaff, setLedgerStaff] = useState<StaffMember | null>(null);
    const [ledgerAmount, setLedgerAmount] = useState('');
    const [ledgerType, setLedgerType] = useState('advance');
    const [ledgerNotes, setLedgerNotes] = useState('');
    const [ledgerHistory, setLedgerHistory] = useState<any[]>([]);

    const fetchStaff = useCallback(async () => {
        if (!tenantId) return;
        setLoading(true);
        const { data, error } = await supabase.rpc('rpc_staff_board', { p_tenant_id: tenantId });
        console.log('🔍 rpc_staff_board response:', { data, error, tenantId });
        if (data && Array.isArray(data)) {
            setStaff(data.map((s: any) => ({
                ...s,
                commission_rate: s.commission_percent ?? 15,
                base_salary: s.base_salary ?? 0,
            })));
        } else if (error) {
            console.error('❌ rpc_staff_board error:', error);
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchStaff(); }, [fetchStaff]);

    const openLedgerModal = async (s: StaffMember) => {
        setLedgerStaff(s);
        setLedgerAmount('');
        setLedgerType('advance');
        setLedgerNotes('');
        setShowLedgerModal(true);
        // Fetch history
        const { data } = await supabaseAdmin
            .from('staff_payments')
            .select('*')
            .eq('staff_id', s.id)
            .order('payment_date', { ascending: false })
            .limit(5);
        if (data) setLedgerHistory(data);
    };

    const handleSaveLedger = async () => {
        if (!ledgerStaff || !ledgerAmount) return;
        setSaving(true);
        try {
            const { error } = await supabaseAdmin.from('staff_payments').insert({
                tenant_id: tenantId,
                staff_id: ledgerStaff.id,
                amount: parseFloat(ledgerAmount),
                payment_type: ledgerType,
                notes: ledgerNotes
            });
            if (error) throw error;
            showToast('Payment recorded successfully', 'success');
            setShowLedgerModal(false);
            setLedgerAmount(''); setLedgerNotes('');
            fetchStaff(); // Ensure UI state refreshes
        } catch (err: any) {
            showToast(err.message, 'error');
        }
        setSaving(false);
    };

    const handleBlock = async (staffId: string, staffName: string) => {
        const { error } = await supabase.rpc('rpc_block_staff_today', { p_tenant_id: tenantId, p_staff_id: staffId });
        if (!error) { showToast(`${staffName} blocked for today`); fetchStaff(); }
    };

    const handleUnblock = async (staffId: string, staffName: string) => {
        const { error } = await supabase.rpc('rpc_unblock_staff_today', { p_tenant_id: tenantId, p_staff_id: staffId });
        if (!error) { showToast(`${staffName} unblocked`); fetchStaff(); }
    };

    const handleAddStaffClick = () => {
        const planLimits: Record<string, number> = {
            'basic': 2, 'Essentials': 2,
            'starter': 5, 'AI Starter': 5,
            'growth': 15, 'AI Growth': 15,
            'elite': 9999, 'Enterprise': 9999
        };
        const activeCount = staff.filter(s => s.is_active).length;
        const limit = planTier ? (planLimits[planTier] || 2) : 2;

        if (activeCount >= limit) {
            showToast(`Your plan is limited to ${limit} staff members. Please upgrade to add more.`, 'error');
            return;
        }
        setShowAddModal(true);
    };

    const handleAddStaff = async () => {
        if (!aName || !aEmail) { showToast('Name and Email are required', 'error'); return; }
        setSaving(true);
        const { data, error } = await supabase.rpc('rpc_add_staff', {
            p_tenant_id: tenantId,
            p_name: aName,
            p_email: aEmail || null,
            p_phone: aPhone || null,
            p_role: aRole,
            p_commission: parseFloat(aComm) || 15,
            p_can_take_bookings: aCanBook,
        });
        if (!error && data?.success) {
            const staffId = data.staff_id;

            // Update can_take_bookings
            if (staffId) await supabase.from('staff').update({ can_take_bookings: aCanBook }).eq('id', staffId);

            // If password provided, create auth login immediately
            if (aPassword && aPassword.length >= 6 && aEmail) {
                try {
                    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
                        email: aEmail,
                        password: aPassword,
                        email_confirm: true,
                        user_metadata: { full_name: aName, role: 'staff' },
                    });
                    if (!createErr && newUser?.user) {
                        await supabaseAdmin.from('profiles').upsert({
                            id: newUser.user.id,
                            user_id: newUser.user.id,
                            tenant_id: tenantId,
                            email: aEmail,
                            full_name: aName,
                            role: 'staff',
                            staff_id: staffId,
                            can_login: true,
                        }, { onConflict: 'id' });
                        showToast(`Staff added with login!`);
                    } else {
                        showToast(`Staff added but login failed: ${createErr?.message}`, 'error');
                    }
                } catch (err: any) {
                    showToast(`Staff added but login error: ${err.message}`, 'error');
                }
            } else {
                showToast('Staff added!');
            }

            setShowAddModal(false);
            setAName(''); setAEmail(''); setAPhone(''); setARole('stylist'); setAComm('15'); setAPassword(''); setACanBook(true);
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
            p_tenant_id: tenantId, p_staff_id: deactivateTarget.id,
        });
        if (!error) {
            // Ban auth user so they can't login
            if (deactivateTarget.email) {
                try {
                    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
                    const authUser = users?.users?.find((u: any) => u.email === deactivateTarget.email);
                    if (authUser) {
                        // Ban for 100 years
                        await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
                            ban_duration: '876600h',
                        });
                        await supabaseAdmin.from('profiles').update({ can_login: false }).eq('id', authUser.id);
                    }
                } catch (e) { console.error('[Deactivate] Ban error:', e); }
            }
            showToast(`${deactivateTarget.full_name} deactivated & login blocked`);
            fetchStaff();
        }
        setDeactivateTarget(null);
    };

    // ─── Permanent Delete ───
    const handlePermanentDelete = async () => {
        if (!deleteTarget) return;
        setSaving(true);

        // First delete auth user if they have an email/login
        if (deleteTarget.email) {
            try {
                const { data: users } = await supabaseAdmin.auth.admin.listUsers();
                const authUser = users?.users?.find((u: any) => u.email === deleteTarget.email);
                if (authUser) {
                    // Delete profile first (foreign key)
                    await supabaseAdmin.from('profiles').delete().eq('id', authUser.id);
                    // Delete auth user
                    await supabaseAdmin.auth.admin.deleteUser(authUser.id);
                    console.log('[Delete] Auth user deleted:', authUser.email);
                }
            } catch (e) { console.error('[Delete] Auth cleanup error:', e); }
        }

        // Then delete staff record
        const { data, error } = await supabase.rpc('rpc_delete_staff_permanent', {
            p_tenant_id: tenantId, p_staff_id: deleteTarget.id,
        });
        if (!error && data?.success) {
            showToast(`${deleteTarget.full_name} permanently deleted (login removed)`);
            fetchStaff();
        } else {
            showToast(error?.message || data?.error || 'Failed to delete', 'error');
        }
        setDeleteTarget(null);
        setSaving(false);
    };

    // ─── Leave Management ───
    const openLeaveModal = async (s: StaffMember) => {
        setLeaveStaff(s);
        setLeaveStart('');
        setLeaveEnd('');
        setLeaveReason('Vacation');
        setConflicts([]);
        setConflictsChecked(false);
        // Fetch existing leaves
        const { data } = await supabase.rpc('rpc_get_staff_leaves', { p_tenant_id: tenantId, p_staff_id: s.id });
        setExistingLeaves(Array.isArray(data) ? data : []);
    };

    const handleCheckConflicts = async () => {
        if (!leaveStaff || !leaveStart || !leaveEnd) return;
        setLoadingConflicts(true);
        const { data, error } = await supabase.rpc('rpc_check_leave_conflicts', {
            p_tenant_id: tenantId, p_staff_id: leaveStaff.id,
            p_start_date: leaveStart, p_end_date: leaveEnd,
        });
        if (!error && Array.isArray(data)) {
            setConflicts(data);
        } else {
            setConflicts([]);
        }
        setConflictsChecked(true);
        setLoadingConflicts(false);
    };

    const handleSetLeave = async () => {
        if (!leaveStaff || !leaveStart || !leaveEnd) return;
        setSaving(true);
        const { data, error } = await supabase.rpc('rpc_set_staff_leave', {
            p_tenant_id: tenantId, p_staff_id: leaveStaff.id,
            p_start_date: leaveStart, p_end_date: leaveEnd, p_reason: leaveReason,
        });
        if (!error && data?.success) {
            showToast(`Leave set for ${leaveStaff.full_name}`);
            setLeaveStaff(null);
            fetchStaff();
        } else {
            showToast(error?.message || 'Failed', 'error');
        }
        setSaving(false);
    };

    const handleCancelLeave = async (leaveId: string) => {
        const { error } = await supabase.rpc('rpc_cancel_staff_leave', {
            p_tenant_id: tenantId, p_leave_id: leaveId,
        });
        if (!error) {
            showToast('Leave cancelled');
            setExistingLeaves(prev => prev.filter(l => l.id !== leaveId));
            fetchStaff();
        }
    };

    // ─── Edit Staff ───
    const openEditModal = (s: StaffMember) => {
        setEditStaff(s);
        setEditName(s.full_name);
        setEditEmail(s.email || '');
        setEditPhone(s.phone || '');
        setEditRole(s.role);
        setEditComm(String(s.commission_rate || 15));
        setEditCanBook((s as any).can_take_bookings !== false);
        setEditPassword('');
    };

    const handleEditStaff = async () => {
        if (!editStaff || !editName) return;
        setSaving(true);
        const updates: any = {
            full_name: editName,
            role: editRole,
            commission_rate: parseFloat(editComm) || 15,
            can_take_bookings: editCanBook,
        };
        if (editEmail) updates.email = editEmail;
        if (editPhone) updates.phone = editPhone;

        const { error } = await supabase
            .from('staff')
            .update(updates)
            .eq('id', editStaff.id)
            .eq('tenant_id', tenantId);

        if (!error) {
            showToast(`${editName} updated!`);
            // Create login using Supabase Admin API (proper GoTrue method)
            if (editPassword && editPassword.length >= 6 && editEmail) {
                try {
                    // First check if user already exists
                    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
                    const existingUser = existingUsers?.users?.find((u: any) => u.email === editEmail);

                    let userId: string;

                    if (existingUser) {
                        // User exists — update password instead
                        const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
                            password: editPassword,
                        });
                        if (updateErr) {
                            showToast(updateErr.message, 'error');
                            setSaving(false);
                            return;
                        }
                        userId = existingUser.id;
                        showToast(`Password updated for ${editName}`);
                    } else {
                        // Create new auth user via Admin API (proper GoTrue method!)
                        const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
                            email: editEmail,
                            password: editPassword,
                            email_confirm: true,
                            user_metadata: { full_name: editName, role: 'staff' },
                        });
                        if (createErr || !newUser?.user) {
                            showToast(createErr?.message || 'Failed to create login', 'error');
                            setSaving(false);
                            return;
                        }
                        userId = newUser.user.id;
                        showToast(`Login created for ${editName}`);
                    }

                    // Ensure profile is properly linked
                    await supabaseAdmin.from('profiles').upsert({
                        id: userId,
                        user_id: userId,
                        tenant_id: tenantId,
                        email: editEmail,
                        full_name: editName,
                        role: 'staff',
                        staff_id: editStaff.id,
                        can_login: true,
                    }, { onConflict: 'id' });

                } catch (err: any) {
                    console.error('[CreateLogin] Exception:', err);
                    showToast(err.message || 'Login creation failed', 'error');
                }
            }
            setEditStaff(null);
            fetchStaff();
        } else {
            showToast(error.message, 'error');
        }
        setSaving(false);
    };

    const handleReactivate = async (s: StaffMember) => {
        const { error } = await supabase.rpc('rpc_reactivate_staff', {
            p_tenant_id: tenantId, p_staff_id: s.id,
        });
        if (!error) {
            // Unban auth user so they can login again
            if (s.email) {
                try {
                    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
                    const authUser = users?.users?.find((u: any) => u.email === s.email);
                    if (authUser) {
                        console.log('[Reactivate] Unbanning user:', authUser.id, authUser.email);
                        // Method 1: API unban
                        await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
                            ban_duration: 'none',
                        });
                        // Method 2: Direct SQL clear banned_until (fallback)
                        await supabaseAdmin.rpc('rpc_unban_user', { p_user_id: authUser.id });
                        // Update profile
                        await supabaseAdmin.from('profiles').update({ can_login: true }).eq('id', authUser.id);
                    } else {
                        console.warn('[Reactivate] No auth user found for email:', s.email);
                    }
                } catch (e) { console.error('[Reactivate] Unban error:', e); }
            }
            showToast(`${s.full_name} reactivated & login restored`);
            fetchStaff();
        }
    };

    const openCommModal = (s: StaffMember) => {
        setSelectedStaff(s);
        setCommRate(String(s.commission_rate));
        setSalaryRate(String(s.base_salary));
        setShowCommModal(true);
    };

    const handleUpdateComm = async () => {
        if (!selectedStaff) return;
        setSaving(true);
        const { error } = await supabase.rpc('rpc_update_payroll', {
            p_tenant_id: tenantId,
            p_staff_id: selectedStaff.id,
            p_commission: parseFloat(commRate) || 0,
            p_salary: parseFloat(salaryRate) || 0,
        });
        if (!error) {
            showToast(`Payroll settings updated`);
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
            p_tenant_id: tenantId,
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

    // ─── Working Hours ───
    const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const openHoursModal = async (s: StaffMember) => {
        setHoursStaff(s);
        setLoadingHours(true);
        const { data } = await supabase
            .from('staff_working_hours')
            .select('day_of_week, start_time, end_time')
            .eq('staff_id', s.id)
            .order('day_of_week');

        const hoursMap = new Map((data || []).map((h: any) => [h.day_of_week, h]));
        const allDays = Array.from({ length: 7 }, (_, i) => {
            const existing = hoursMap.get(i) as any;
            return {
                day_of_week: i,
                start_time: existing?.start_time?.substring(0, 5) || '09:00',
                end_time: existing?.end_time?.substring(0, 5) || '17:00',
                is_active: !!existing,
            };
        });
        setStaffHours(allDays);
        setLoadingHours(false);
    };

    const handleSaveHours = async () => {
        if (!hoursStaff) return;
        setSavingHours(true);
        // Delete existing hours for this staff
        await supabase.from('staff_working_hours').delete().eq('staff_id', hoursStaff.id);
        // Insert active days only
        const activeDays = staffHours.filter(h => h.is_active).map(h => ({
            staff_id: hoursStaff.id,
            tenant_id: tenantId,
            day_of_week: h.day_of_week,
            start_time: h.start_time + ':00',
            end_time: h.end_time + ':00',
        }));
        if (activeDays.length > 0) {
            const { error } = await supabase.from('staff_working_hours').insert(activeDays);
            if (error) {
                showToast(error.message, 'error');
                setSavingHours(false);
                return;
            }
        }
        showToast(`Working hours saved for ${hoursStaff.full_name}`);
        setHoursStaff(null);
        setSavingHours(false);
    };

    const handleCopyFromSalon = async () => {
        const { data } = await supabase
            .from('tenant_hours')
            .select('day_of_week, open_time, close_time, is_open')
            .eq('tenant_id', tenantId)
            .order('day_of_week');
        if (data && data.length > 0) {
            const salonMap = new Map((data as any[]).map(h => [h.day_of_week, h]));
            setStaffHours(prev => prev.map(h => {
                const salon = salonMap.get(h.day_of_week) as any;
                if (salon) {
                    return {
                        ...h,
                        start_time: salon.open_time?.substring(0, 5) || h.start_time,
                        end_time: salon.close_time?.substring(0, 5) || h.end_time,
                        is_active: salon.is_open !== false,
                    };
                }
                return h;
            }));
            showToast('Copied salon hours!');
        }
    };

    const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

    const activeStaff = staff.filter(s => s.is_active);
    const inactiveStaff = staff.filter(s => !s.is_active);
    const totalRev = activeStaff.reduce((s, m) => s + m.revenue, 0);
    const totalBookings = activeStaff.reduce((s, m) => s + m.bookings_count, 0);

    if (loading) return <StaffSkeleton />;

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

                {/* Tabs */}
                <div className="flex items-center gap-2 p-1 bg-white/[0.02] border border-white/5 rounded-2xl">
                    <button
                        onClick={() => setActiveTab('directory')}
                        className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${
                            activeTab === 'directory' ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        Directory
                    </button>
                    <button
                        onClick={() => setActiveTab('payroll')}
                        className={`px-6 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                            activeTab === 'payroll' ? 'bg-luxe-gold/20 text-luxe-gold border border-luxe-gold/30 shadow-[0_0_15px_rgba(238,206,165,0.2)]' : 'text-white/40 hover:text-luxe-gold hover:bg-luxe-gold/5'
                        }`}
                    >
                        <Banknote className="w-3.5 h-3.5" />
                        Payroll Runs
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    {activeTab === 'directory' && (
                        <>
                            <button
                                onClick={() => setShowInactive(!showInactive)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${showInactive ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/10 text-white/40'}`}
                            >
                                {showInactive ? 'Hide Inactive' : `Show Inactive (${inactiveStaff.length})`}
                            </button>
                            {isOwnerPrivilege && (
                                <button
                                    onClick={handleAddStaffClick}
                                    className="bg-gold-gradient text-luxe-obsidian px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                >
                                    <Plus className="w-5 h-5" /> ADD STAFF
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Content Switch */}
            {activeTab === 'payroll' ? (
                <PayrollRunsView />
            ) : (
                <>
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
                                {isOwnerPrivilege && (
                                    <>
                                        <th className="text-center px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Salary</th>
                                        <th className="text-center px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Commission %</th>
                                        <th className="text-center px-6 py-4 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Earned</th>
                                    </>
                                )}
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
                                        {isOwnerPrivilege && (
                                            <>
                                                <td className="px-6 py-5 text-center">
                                                    <button onClick={() => openCommModal(s)} className="font-bold text-sm text-white hover:underline cursor-pointer">
                                                        ${s.base_salary.toLocaleString()}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <button
                                                        onClick={() => openCommModal(s)}
                                                        className="font-bold text-sm text-luxe-gold hover:underline cursor-pointer"
                                                    >
                                                        {s.commission_rate}%
                                                    </button>
                                                </td>
                                                <td className="px-6 py-5 text-center font-bold text-sm text-luxe-gold">${commission.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                            </>
                                        )}
                                        <td className="px-6 py-5 text-center">
                                            {s.is_blocked_today ? (
                                                <span className="text-[9px] font-bold bg-red-500/10 text-red-400 px-3 py-1.5 rounded-full border border-red-500/20">BLOCKED</span>
                                            ) : (
                                                <span className="text-[9px] font-bold bg-green-500/10 text-green-400 px-3 py-1.5 rounded-full border border-green-500/20">ACTIVE</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {isOwnerPrivilege && (
                                                    <button onClick={() => openLedgerModal(s)} title="Ledger / Payments"
                                                        className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-emerald-400 hover:bg-emerald-400/10 transition-all">
                                                        <Banknote className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button onClick={() => openLeaveModal(s)} title="Manage Leave"
                                                    className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-orange-400 hover:bg-orange-400/10 transition-all">
                                                    <CalendarDays className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => openEditModal(s)} title="Edit Staff"
                                                    className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-green-400 hover:bg-green-400/10 transition-all">
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => {
                                                    setChangePwStaff(s);
                                                    setNewPw('');
                                                }} title="Change Password" aria-label="Change Password"
                                                    className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all">
                                                    <Lock className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => openHoursModal(s)} title="Working Hours"
                                                    className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-blue-400 hover:bg-blue-400/10 transition-all">
                                                    <Clock className="w-4 h-4" />
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
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleReactivate(s)}
                                        className="px-4 py-2 rounded-xl bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-bold hover:bg-green-500/20 transition-all">
                                        REACTIVATE
                                    </button>
                                    <button onClick={() => setDeleteTarget(s)}
                                        className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold hover:bg-red-500/20 transition-all flex items-center gap-1">
                                        <Trash2 className="w-3.5 h-3.5" /> DELETE
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            </>
            )}

            {/* ──────────────── MODALS ──────────────── */}
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
                                    <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Email *</label>
                                    <input value={aEmail} onChange={e => setAEmail(e.target.value)} placeholder="sarah@salon.com" required
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Phone *</label>
                                    <input value={aPhone} onChange={e => setAPhone(e.target.value)} placeholder="+1 555-0101" required
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Role</label>
                                    <select value={aRole} onChange={e => setARole(e.target.value)}
                                        className="w-full bg-zinc-900 text-white border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all">
                                        <option className="bg-zinc-900 text-white" value="manager">Manager</option>
                                        <option className="bg-zinc-900 text-white" value="receptionist">Receptionist</option>
                                        <option className="bg-zinc-900 text-white" value="stylist">Stylist</option>
                                        <option className="bg-zinc-900 text-white" value="colorist">Colorist</option>
                                        <option className="bg-zinc-900 text-white" value="barber">Barber</option>
                                        <option className="bg-zinc-900 text-white" value="nail_tech">Nail Tech</option>
                                        <option className="bg-zinc-900 text-white" value="esthetician">Esthetician</option>
                                        <option className="bg-zinc-900 text-white" value="makeup_artist">Makeup Artist</option>
                                        <option className="bg-zinc-900 text-white" value="lash_brow_tech">Lash/Brow Tech</option>
                                        <option className="bg-zinc-900 text-white" value="salon_assistant">Salon Assistant</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Commission %</label>
                                    <input type="number" value={aComm} onChange={e => setAComm(e.target.value)} min="0" max="100" step="1"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all" />
                                </div>
                                {/* Can Take Bookings Toggle */}
                                <div className="flex items-center justify-between gap-4 p-3 mt-3 bg-white/[0.04] border border-white/10 rounded-xl">
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-white">Can Take Bookings</p>
                                        <p className="text-[11px] text-white/40 mt-0.5">Allow AI to book appointments with this staff</p>
                                    </div>
                                    <button type="button" onClick={() => setACanBook(v => !v)} aria-label="Toggle can take bookings"
                                        className={aCanBook ? 'relative flex-shrink-0 w-11 h-6 rounded-full transition-all duration-200 focus:outline-none bg-green-500' : 'relative flex-shrink-0 w-11 h-6 rounded-full transition-all duration-200 focus:outline-none bg-white/20'}>
                                        <span className={aCanBook ? 'block w-5 h-5 bg-white rounded-full shadow-md transition-all duration-200 translate-x-5 mt-0.5' : 'block w-5 h-5 bg-white rounded-full shadow-md transition-all duration-200 translate-x-0.5 mt-0.5'} />
                                    </button>
                                </div>
                            </div>
                            {/* Optional Login Password */}
                            <div className="border-t border-white/5 pt-4 mt-2">
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <Key className="w-3 h-3" /> Create Login Password (Optional)
                                </label>
                                <div className="relative">
                                    <input type={showAPassword ? 'text' : 'password'} value={aPassword} onChange={e => setAPassword(e.target.value)} placeholder="Min 6 chars — leave empty for no login"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pr-10 text-sm outline-none focus:border-luxe-gold/50 transition-all" />
                                    <button type="button" onClick={() => setShowAPassword(!showAPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors" title="Toggle password visibility">
                                        {showAPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {aPassword && (
                                    <div className="mt-2">
                                        <div className="relative">
                                            <input type={showAPassword ? 'text' : 'password'} value={aConfirmPw} onChange={e => setAConfirmPw(e.target.value)} placeholder="Confirm password"
                                                className={`w-full bg-white/5 border rounded-xl p-3 text-sm outline-none transition-all ${aConfirmPw && aConfirmPw !== aPassword ? 'border-red-500/50' : 'border-white/10 focus:border-luxe-gold/50'}`} />
                                        </div>
                                        {aConfirmPw && aConfirmPw !== aPassword && (
                                            <p className="text-[10px] text-red-400 mt-1">⚠ Passwords do not match</p>
                                        )}
                                        {aConfirmPw && aConfirmPw === aPassword && (
                                            <p className="text-[10px] text-green-400 mt-1">✅ Passwords match</p>
                                        )}
                                    </div>
                                )}
                                <p className="text-[10px] text-white/20 mt-1">If set, staff can immediately login to their dashboard</p>
                            </div>
                        </div>
                        <button onClick={handleAddStaff} disabled={saving || !aName || !aEmail || (aPassword.length > 0 && (aPassword.length < 6 || aPassword !== aConfirmPw))}
                            className="w-full mt-6 bg-gold-gradient text-luxe-obsidian font-bold py-3 rounded-xl shadow-lg shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                            {saving ? 'ADDING...' : 'ADD STAFF'}
                        </button>
                    </div>
                </div>
            )}

            {/* Payroll Settings Modal */}
            {showCommModal && selectedStaff && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCommModal(false)}>
                    <div className="bg-luxe-obsidian border border-white/10 rounded-2xl p-8 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Percent className="w-6 h-6 text-luxe-gold" /> Payroll Settings
                            </h3>
                            <button onClick={() => setShowCommModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-white/50 text-sm mb-6">Set base salary and commission for <span className="text-white font-bold">{selectedStaff.full_name}</span></p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Monthly Base Salary</label>
                                <div className="flex items-center gap-3">
                                    <span className="text-xl font-bold text-white/40">$</span>
                                    <input type="number" value={salaryRate} onChange={e => setSalaryRate(e.target.value)} min="0" step="100"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-lg font-bold outline-none focus:border-luxe-gold/50 transition-all" />
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Service Commission Rate</label>
                                <div className="flex items-center gap-3">
                                    <input type="number" value={commRate} onChange={e => setCommRate(e.target.value)} min="0" max="100" step="1"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-lg font-bold outline-none focus:border-luxe-gold/50 transition-all" />
                                    <span className="text-xl font-bold text-white/40">%</span>
                                </div>
                            </div>
                        </div>

                        <p className="text-[10px] text-luxe-gold mt-4 font-bold bg-luxe-gold/5 p-3 rounded-lg border border-luxe-gold/10">
                            Current Take-Home: ${(parseFloat(salaryRate||'0') + (selectedStaff.revenue * parseFloat(commRate || '0') / 100)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                        
                        <button onClick={handleUpdateComm} disabled={saving}
                            className="w-full mt-6 bg-gold-gradient text-luxe-obsidian font-bold py-3 rounded-xl shadow-lg shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                            SAVE PAYROLL SETTINGS
                        </button>
                    </div>
                </div>
            )}

            {/* Ledger Modal */}
            {showLedgerModal && ledgerStaff && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowLedgerModal(false)}>
                    <div className="bg-luxe-obsidian border border-white/10 rounded-2xl p-8 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Banknote className="w-6 h-6 text-emerald-400" /> Staff Ledger
                            </h3>
                            <button onClick={() => setShowLedgerModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-white/50 text-sm mb-6">Record a payment for <span className="text-white font-bold">{ledgerStaff.full_name}</span></p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Amount</label>
                                <div className="flex items-center gap-3">
                                    <span className="text-xl font-bold text-white/40">$</span>
                                    <input type="number" value={ledgerAmount} onChange={e => setLedgerAmount(e.target.value)} min="0" step="10"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-lg font-bold outline-none focus:border-luxe-gold/50 transition-all" />
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Payment Type</label>
                                <select value={ledgerType} onChange={e => setLedgerType(e.target.value)}
                                    className="w-full bg-zinc-900 text-white border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all">
                                    <option className="bg-zinc-900 text-white" value="advance">Salary Advance</option>
                                    <option className="bg-zinc-900 text-white" value="salary_clearance">Salary Clearance</option>
                                    <option className="bg-zinc-900 text-white" value="commission_payout">Commission Payout</option>
                                    <option className="bg-zinc-900 text-white" value="tip_payout">Tip Payout</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Notes</label>
                                <input type="text" value={ledgerNotes} onChange={e => setLedgerNotes(e.target.value)} placeholder="e.g. Wedding advance"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all" />
                            </div>
                        </div>

                        {ledgerHistory.length > 0 && (
                            <div className="mt-6 border-t border-white/10 pt-4">
                                <h4 className="text-xs font-bold text-white/50 uppercase tracking-wider mb-3">Recent Payments</h4>
                                <div className="space-y-2">
                                    {ledgerHistory.map(hist => (
                                        <div key={hist.id} className="flex justify-between items-center text-sm p-2 bg-white/5 rounded-lg border border-white/5">
                                            <div>
                                                <p className="font-bold text-white/80">${hist.amount.toFixed(2)}</p>
                                                {hist.notes && <p className="text-[10px] text-white/50 italic py-0.5">"{hist.notes}"</p>}
                                                <p className="text-[10px] text-white/40 capitalize">{hist.payment_type.replace('_', ' ')}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-white/40">{new Date(hist.payment_date).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        <button onClick={handleSaveLedger} disabled={saving || !ledgerAmount}
                            className="w-full mt-6 bg-emerald-500 text-black font-bold py-3 rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                            RECORD PAYMENT
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
                            <div className="relative">
                                <input
                                    type={showNewPw ? 'text' : 'password'}
                                    value={newPw}
                                    onChange={e => setNewPw(e.target.value)}
                                    placeholder="Enter new password"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-10 text-sm outline-none focus:border-luxe-gold/50 transition-all"
                                />
                                <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors" title="Toggle password visibility">
                                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
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

            {/* Permanent Delete Confirmation */}
            <ConfirmModal
                open={!!deleteTarget}
                title="⚠️ Permanently Delete Staff"
                message={`This will PERMANENTLY delete ${deleteTarget?.full_name} from the database. All their leave records will be removed and their bookings will be unlinked. This action CANNOT be undone.`}
                confirmLabel="Delete Forever"
                danger
                onConfirm={handlePermanentDelete}
                onCancel={() => setDeleteTarget(null)}
            />

            {/* Edit Staff Modal */}
            {editStaff && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditStaff(null)}>
                    <div className="bg-luxe-obsidian border border-white/10 rounded-2xl p-8 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Pencil className="w-5 h-5 text-luxe-gold" /> Edit Staff
                            </h3>
                            <button onClick={() => setEditStaff(null)} className="p-2 hover:bg-white/10 rounded-xl transition-all" title="Close">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Full Name *</label>
                                <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Full Name"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Email</label>
                                    <input value={editEmail} onChange={e => setEditEmail(e.target.value)} placeholder="email@example.com"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Phone</label>
                                    <input value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="+1 555-0001"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Role</label>
                                    <select value={editRole} onChange={e => setEditRole(e.target.value)}
                                        className="w-full bg-zinc-900 text-white border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all">
                                        <option className="bg-zinc-900 text-white" value="manager">Manager</option>
                                        <option className="bg-zinc-900 text-white" value="receptionist">Receptionist</option>
                                        <option className="bg-zinc-900 text-white" value="stylist">Stylist</option>
                                        <option className="bg-zinc-900 text-white" value="colorist">Colorist</option>
                                        <option className="bg-zinc-900 text-white" value="barber">Barber</option>
                                        <option className="bg-zinc-900 text-white" value="nail_tech">Nail Tech</option>
                                        <option className="bg-zinc-900 text-white" value="esthetician">Esthetician</option>
                                        <option className="bg-zinc-900 text-white" value="makeup_artist">Makeup Artist</option>
                                        <option className="bg-zinc-900 text-white" value="lash_brow_tech">Lash/Brow Tech</option>
                                        <option className="bg-zinc-900 text-white" value="salon_assistant">Salon Assistant</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Commission %</label>
                                    <input type="number" value={editComm} onChange={e => setEditComm(e.target.value)} placeholder="15" min="0" max="100"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all" />
                                </div>
                                {/* Can Take Bookings Toggle */}
                                <div className="flex items-center justify-between gap-4 p-3 mt-3 bg-white/[0.04] border border-white/10 rounded-xl">
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-white">Can Take Bookings</p>
                                        <p className="text-[11px] text-white/40 mt-0.5">Allow AI to book appointments with this staff</p>
                                    </div>
                                    <button type="button" onClick={() => setEditCanBook(v => !v)} aria-label="Toggle can take bookings"
                                        className={editCanBook ? 'relative flex-shrink-0 w-11 h-6 rounded-full transition-all duration-200 focus:outline-none bg-green-500' : 'relative flex-shrink-0 w-11 h-6 rounded-full transition-all duration-200 focus:outline-none bg-white/20'}>
                                        <span className={editCanBook ? 'block w-5 h-5 bg-white rounded-full shadow-md transition-all duration-200 translate-x-5 mt-0.5' : 'block w-5 h-5 bg-white rounded-full shadow-md transition-all duration-200 translate-x-0.5 mt-0.5'} />
                                    </button>
                                </div>
                                {/* Dashboard Login Section */}
                                <div className="border-t border-white/10 mt-4 pt-4">
                                    <label className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 block flex items-center gap-1">
                                        <Key className="w-3 h-3" /> Dashboard Login (optional)
                                    </label>
                                    <p className="text-[10px] text-white/20 mb-3">Set a password to create login access. Leave empty to skip.</p>
                                    <div className="relative">
                                        <input type={showEditPassword ? 'text' : 'password'} value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="Min 6 characters (leave empty to skip)"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pr-10 text-sm outline-none focus:border-luxe-gold/50 transition-all" />
                                        <button type="button" onClick={() => setShowEditPassword(!showEditPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors" title="Toggle password visibility">
                                            {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                    {editPassword && (
                                        <div className="mt-2">
                                            <input type={showEditPassword ? 'text' : 'password'} value={editConfirmPw} onChange={e => setEditConfirmPw(e.target.value)} placeholder="Confirm password"
                                                className={`w-full bg-white/5 border rounded-xl p-3 text-sm outline-none transition-all ${editConfirmPw && editConfirmPw !== editPassword ? 'border-red-500/50' : 'border-white/10 focus:border-luxe-gold/50'}`} />
                                            {editConfirmPw && editConfirmPw !== editPassword && (
                                                <p className="text-[10px] text-red-400 mt-1">⚠ Passwords do not match</p>
                                            )}
                                            {editConfirmPw && editConfirmPw === editPassword && (
                                                <p className="text-[10px] text-green-400 mt-1">✅ Passwords match</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <button onClick={handleEditStaff} disabled={saving || !editName || (editPassword.length > 0 && (editPassword.length < 6 || editPassword !== editConfirmPw))}
                                    className="w-full mt-6 bg-gold-gradient text-luxe-obsidian font-bold py-3 rounded-xl shadow-lg shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                                    {saving ? 'SAVING...' : 'UPDATE STAFF'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Leave Management Modal */}
            {leaveStaff && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setLeaveStaff(null)}>
                    <div className="bg-luxe-obsidian border border-white/10 rounded-2xl p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <CalendarDays className="w-6 h-6 text-luxe-gold" /> Manage Leave
                            </h3>
                            <button onClick={() => setLeaveStaff(null)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-white/50 text-sm mb-6">Set leave for <span className="text-white font-bold">{leaveStaff.full_name}</span></p>

                        {/* Date Range Picker */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Start Date</label>
                                <input type="date" value={leaveStart} onChange={e => { setLeaveStart(e.target.value); setConflictsChecked(false); }}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all text-white" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">End Date</label>
                                <input type="date" value={leaveEnd} onChange={e => { setLeaveEnd(e.target.value); setConflictsChecked(false); }}
                                    min={leaveStart || new Date().toISOString().split('T')[0]}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all text-white" />
                            </div>
                        </div>
                        <div className="mb-4">
                            <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Reason</label>
                            <select value={leaveReason} onChange={e => setLeaveReason(e.target.value)}
                                className="w-full bg-zinc-900 text-white border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all">
                                <option className="bg-zinc-900 text-white" value="Vacation">🏖️ Vacation</option>
                                <option className="bg-zinc-900 text-white" value="Sick Leave">🤒 Sick Leave</option>
                                <option className="bg-zinc-900 text-white" value="Personal">👤 Personal</option>
                                <option className="bg-zinc-900 text-white" value="Training">📚 Training</option>
                                <option className="bg-zinc-900 text-white" value="Other">📝 Other</option>
                            </select>
                        </div>

                        {/* Check Conflicts Button */}
                        {!conflictsChecked && leaveStart && leaveEnd && (
                            <button onClick={handleCheckConflicts} disabled={loadingConflicts}
                                className="w-full mb-4 bg-orange-500/10 border border-orange-500/20 text-orange-400 font-bold py-3 rounded-xl hover:bg-orange-500/20 transition-all flex items-center justify-center gap-2">
                                {loadingConflicts ? <Loader2 className="w-5 h-5 animate-spin" /> : <AlertTriangle className="w-5 h-5" />}
                                Check for Booking Conflicts
                            </button>
                        )}

                        {/* Conflict Results */}
                        {conflictsChecked && conflicts.length > 0 && (
                            <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                                <p className="text-red-400 font-bold text-sm flex items-center gap-2 mb-3">
                                    <AlertTriangle className="w-4 h-4" /> ⚠️ {conflicts.length} booking{conflicts.length > 1 ? 's' : ''} affected!
                                </p>
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {conflicts.map(c => (
                                        <div key={c.booking_id} className="flex justify-between items-center text-xs bg-black/20 rounded-lg px-3 py-2">
                                            <span className="text-white/70">{c.client_name} — {c.service_name}</span>
                                            <span className="text-white/40">{new Date(c.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {conflictsChecked && conflicts.length === 0 && (
                            <div className="mb-4 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                                <p className="text-green-400 font-bold text-sm flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" /> No bookings affected. Safe to set leave.
                                </p>
                            </div>
                        )}

                        {/* Set Leave Button */}
                        {conflictsChecked && (
                            <button onClick={handleSetLeave} disabled={saving}
                                className={`w-full mb-6 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${conflicts.length > 0
                                    ? 'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30'
                                    : 'bg-gold-gradient text-luxe-obsidian shadow-lg shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98]'
                                    }`}>
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CalendarDays className="w-5 h-5" />}
                                {conflicts.length > 0 ? 'Set Leave Anyway (Override)' : 'Set Leave'}
                            </button>
                        )}

                        {/* Existing Leaves */}
                        {existingLeaves.length > 0 && (
                            <div className="border-t border-white/10 pt-4">
                                <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Upcoming Leaves</h4>
                                <div className="space-y-2">
                                    {existingLeaves.map(l => (
                                        <div key={l.id} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                                            <div>
                                                <p className="text-sm font-bold text-white/70">
                                                    {new Date(l.start_datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {new Date(l.end_datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                </p>
                                                <p className="text-[10px] text-white/40">{l.reason}</p>
                                            </div>
                                            <button onClick={() => handleCancelLeave(l.id)}
                                                className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold hover:bg-red-500/20 transition-all">
                                                CANCEL
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Working Hours Modal */}
            {hoursStaff && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setHoursStaff(null)}>
                    <div className="bg-luxe-obsidian border border-white/10 rounded-2xl p-8 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Clock className="w-6 h-6 text-luxe-gold" /> Working Hours
                            </h3>
                            <button onClick={() => setHoursStaff(null)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-white/50 text-sm mb-4">Set weekly schedule for <span className="text-white font-bold">{hoursStaff.full_name}</span></p>

                        <button onClick={handleCopyFromSalon}
                            className="w-full mb-4 bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold py-2.5 rounded-xl hover:bg-blue-500/20 transition-all flex items-center justify-center gap-2 text-xs">
                            <Copy className="w-4 h-4" /> Copy from Salon Hours
                        </button>

                        {loadingHours ? (
                            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-luxe-gold animate-spin" /></div>
                        ) : (
                            <div className="space-y-2">
                                {staffHours.map((h, i) => (
                                    <div key={h.day_of_week} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${h.is_active ? 'bg-white/[0.03] border-white/10' : 'bg-white/[0.01] border-white/5 opacity-50'}`}>
                                        <button
                                            onClick={() => setStaffHours(prev => prev.map((p, idx) => idx === i ? { ...p, is_active: !p.is_active } : p))}
                                            className={`w-16 text-[10px] font-black uppercase tracking-wider py-1.5 rounded-lg border transition-all ${h.is_active ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}
                                        >
                                            {h.is_active ? 'ON' : 'OFF'}
                                        </button>
                                        <span className="w-24 text-sm font-bold text-white/70">{DAY_NAMES[h.day_of_week]}</span>
                                        <input type="time" value={h.start_time} disabled={!h.is_active}
                                            onChange={e => setStaffHours(prev => prev.map((p, idx) => idx === i ? { ...p, start_time: e.target.value } : p))}
                                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-luxe-gold/50 transition-all text-white disabled:opacity-30" />
                                        <span className="text-white/20 text-xs">to</span>
                                        <input type="time" value={h.end_time} disabled={!h.is_active}
                                            onChange={e => setStaffHours(prev => prev.map((p, idx) => idx === i ? { ...p, end_time: e.target.value } : p))}
                                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-luxe-gold/50 transition-all text-white disabled:opacity-30" />
                                    </div>
                                ))}
                            </div>
                        )}

                        <button onClick={handleSaveHours} disabled={savingHours}
                            className="w-full mt-6 bg-gold-gradient text-luxe-obsidian font-bold py-3 rounded-xl shadow-lg shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                            {savingHours ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                            {savingHours ? 'SAVING...' : 'SAVE WORKING HOURS'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const PerformanceStat = ({ label, value, trend, icon: Icon }: { label: string; value: string; trend: string; icon: React.ElementType }) => (
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
