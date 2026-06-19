import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    BarChart3, TrendingUp, Trophy, ArrowUpRight, Scissors,
    Loader2, Ban, CheckCircle2, Undo2, Plus, X,
    UserMinus, Percent, UserPlus, Key, Lock, Eye, EyeOff,
    CalendarDays, Trash2, AlertTriangle, Pencil, Clock, Copy, Banknote, Camera, Upload,
    Search, Filter, Inbox
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
    email?: string; phone?: string; photo_url?: string;
}

export const StaffBoard: React.FC = () => {
    const { isOwner, isSuperAdmin } = useAuth();
    const isOwnerPrivilege = isOwner || isSuperAdmin;

    const [staff, setStaff] = useState<StaffMember[]>([]);
    const { tenantId, planTier } = useTenant();
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
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
    const [aSalary, setASalary] = useState('0');
    const [aPhotoFile, setAPhotoFile] = useState<File | null>(null);
    const [aPhotoPreviewUrl, setAPhotoPreviewUrl] = useState<string>('');
    const [aPassword, setAPassword] = useState('');
    const [aConfirmPw, setAConfirmPw] = useState('');
    const [showAPassword, setShowAPassword] = useState(false);
    const [aCanBook, setACanBook] = useState(true);
    const [aCreateLogin, setACreateLogin] = useState(false);

    // Permanent Delete
    const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);

    // Working Hours loading/saving states
    const [savingHours, setSavingHours] = useState(false);

    // Unified Modal States
    const [profileStaff, setProfileStaff] = useState<StaffMember | null>(null);
    const [activeProfileTab, setActiveProfileTab] = useState<'financials' | 'ledger' | 'schedule'>('financials');
    const [profileTips, setProfileTips] = useState<number>(0);
    const [profilePayments, setProfilePayments] = useState<any[]>([]);
    const [profileHours, setProfileHours] = useState<{ day_of_week: number; start_time: string; end_time: string; is_active: boolean }[]>([]);
    const [profileLeaves, setProfileLeaves] = useState<LeaveEntry[]>([]);
    const [loadingProfileData, setLoadingProfileData] = useState<boolean>(false);
    
    // Unified Modal Edit Form States
    const [profileName, setProfileName] = useState('');
    const [profileEmail, setProfileEmail] = useState('');
    const [profilePhone, setProfilePhone] = useState('');
    const [profileRole, setProfileRole] = useState('');
    const [profileComm, setProfileComm] = useState('');
    const [profileSalary, setProfileSalary] = useState('');
    const [profileCanBook, setProfileCanBook] = useState(true);
    const [profileNewPassword, setProfileNewPassword] = useState('');
    const [profileConfirmPassword, setProfileConfirmPassword] = useState('');
    const [showProfilePassword, setShowProfilePassword] = useState(false);

    // Unified Modal Ledger Form States
    const [profileLedgerAmount, setProfileLedgerAmount] = useState('');
    const [profileLedgerType, setProfileLedgerType] = useState('advance');
    const [profileLedgerNotes, setProfileLedgerNotes] = useState('');

    // Unified Modal Leave Form States
    const [profileLeaveStart, setProfileLeaveStart] = useState('');
    const [profileLeaveEnd, setProfileLeaveEnd] = useState('');
    const [profileLeaveReason, setProfileLeaveReason] = useState('Vacation');
    const [profileConflicts, setProfileConflicts] = useState<ConflictBooking[]>([]);
    const [profileConflictsChecked, setProfileConflictsChecked] = useState(false);
    const [loadingProfileConflicts, setLoadingProfileConflicts] = useState(false);

    // Photo Upload
    const [photoUploadStaff, setPhotoUploadStaff] = useState<StaffMember | null>(null);
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const photoInputRef = useRef<HTMLInputElement>(null);

    // Crop Modal
    const [showCropModal, setShowCropModal] = useState(false);
    const [cropSrc, setCropSrc] = useState<string | null>(null);
    const [cropStaff, setCropStaff] = useState<StaffMember | null>(null);
    const [cropZoom, setCropZoom] = useState(1);
    const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
    const [cropDragging, setCropDragging] = useState(false);
    const [cropDragStart, setCropDragStart] = useState({ x: 0, y: 0 });
    const cropCanvasRef = useRef<HTMLCanvasElement>(null);
    const cropImgRef = useRef<HTMLImageElement | null>(null);

    // Search and filter state removed

    const fetchStaff = useCallback(async () => {
        if (!tenantId) return;
        setLoading(true);
        const { data, error } = await supabase.rpc('rpc_staff_board', { p_tenant_id: tenantId });
        console.log('🔍 rpc_staff_board response:', { data, error, tenantId });
        if (data && Array.isArray(data)) {
            setStaff(data.map((s: any) => ({
                ...s,
                commission_rate: s.commission_rate ?? 15,
                base_salary: s.base_salary ?? 0,
            })));
        } else if (error) {
            console.error('❌ rpc_staff_board error:', error);
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchStaff(); }, [fetchStaff]);

    // ─── Unified Stylist Profile & Payroll Dashboard Helpers ───
    const openUnifiedProfile = async (s: StaffMember, tab: 'financials' | 'ledger' | 'schedule', focusPassword = false) => {
        setProfileStaff(s);
        setActiveProfileTab(tab);
        setLoadingProfileData(true);
        
        // Populate edit fields
        setProfileName(s.full_name);
        setProfileEmail(s.email || '');
        setProfilePhone(s.phone || '');
        setProfileRole(s.role);
        setProfileComm(String(s.commission_rate || 15));
        setProfileSalary(String(s.base_salary || 0));
        setProfileCanBook((s as any).can_take_bookings !== false);
        setProfileNewPassword('');
        setProfileConfirmPassword('');
        setShowProfilePassword(focusPassword);

        // Reset ledger input fields
        setProfileLedgerAmount('');
        setProfileLedgerType('advance');
        setProfileLedgerNotes('');

        // Reset leave builder fields
        setProfileLeaveStart('');
        setProfileLeaveEnd('');
        setProfileLeaveReason('Vacation');
        setProfileConflicts([]);
        setProfileConflictsChecked(false);

        try {
            // Fetch everything in parallel
            const [tipsRes, paymentsRes, hoursRes, leavesRes] = await Promise.all([
                supabase.from('payments').select('tip_amount, bookings!inner(stylist_id)').eq('bookings.stylist_id', s.id),
                supabase.from('staff_payments').select('*').eq('staff_id', s.id).order('payment_date', { ascending: false }),
                supabase.from('staff_working_hours').select('day_of_week, start_time, end_time').eq('staff_id', s.id).order('day_of_week'),
                supabase.rpc('rpc_get_staff_leaves', { p_tenant_id: tenantId, p_staff_id: s.id })
            ]);

            if (tipsRes.data) {
                const totalTips = tipsRes.data.reduce((sum: number, p: any) => sum + (p.tip_amount || 0), 0);
                setProfileTips(totalTips);
            } else {
                setProfileTips(0);
            }

            if (paymentsRes.data) {
                setProfilePayments(paymentsRes.data);
            } else {
                setProfilePayments([]);
            }

            if (hoursRes.data) {
                const hoursMap = new Map((hoursRes.data || []).map((h: any) => [h.day_of_week, h]));
                const allDays = Array.from({ length: 7 }, (_, i) => {
                    const existing = hoursMap.get(i) as any;
                    return {
                        day_of_week: i,
                        start_time: existing?.start_time?.substring(0, 5) || '09:00',
                        end_time: existing?.end_time?.substring(0, 5) || '17:00',
                        is_active: !!existing,
                    };
                });
                setProfileHours(allDays);
            } else {
                const defaultDays = Array.from({ length: 7 }, (_, i) => ({
                    day_of_week: i,
                    start_time: '09:00',
                    end_time: '17:00',
                    is_active: i !== 0,
                }));
                setProfileHours(defaultDays);
            }

            if (leavesRes.data) {
                setProfileLeaves(Array.isArray(leavesRes.data) ? leavesRes.data : []);
            } else {
                setProfileLeaves([]);
            }
        } catch (err) {
            console.error('Error fetching unified profile data:', err);
            showToast('Error loading profile data', 'error');
        } finally {
            setLoadingProfileData(false);
        }
    };

    const refreshUnifiedProfileData = async (staffId: string) => {
        try {
            const [tipsRes, paymentsRes, hoursRes, leavesRes] = await Promise.all([
                supabase.from('payments').select('tip_amount, bookings!inner(stylist_id)').eq('bookings.stylist_id', staffId),
                supabase.from('staff_payments').select('*').eq('staff_id', staffId).order('payment_date', { ascending: false }),
                supabase.from('staff_working_hours').select('day_of_week, start_time, end_time').eq('staff_id', staffId).order('day_of_week'),
                supabase.rpc('rpc_get_staff_leaves', { p_tenant_id: tenantId, p_staff_id: staffId })
            ]);

            if (tipsRes.data) {
                const totalTips = tipsRes.data.reduce((sum: number, p: any) => sum + (p.tip_amount || 0), 0);
                setProfileTips(totalTips);
            }
            if (paymentsRes.data) setProfilePayments(paymentsRes.data);
            if (hoursRes.data) {
                const hoursMap = new Map((hoursRes.data || []).map((h: any) => [h.day_of_week, h]));
                const allDays = Array.from({ length: 7 }, (_, i) => {
                    const existing = hoursMap.get(i) as any;
                    return {
                        day_of_week: i,
                        start_time: existing?.start_time?.substring(0, 5) || '09:00',
                        end_time: existing?.end_time?.substring(0, 5) || '17:00',
                        is_active: !!existing,
                    };
                });
                setProfileHours(allDays);
            }
            if (leavesRes.data) setProfileLeaves(Array.isArray(leavesRes.data) ? leavesRes.data : []);
        } catch (err) {
            console.error('Error refreshing unified profile data:', err);
        }
    };

    const handleSaveProfile = async () => {
        if (!profileStaff || !profileName) return;
        setSaving(true);
        try {
            const updates: any = {
                full_name: profileName,
                role: profileRole,
                commission_rate: parseFloat(profileComm) || 0,
                base_salary: parseFloat(profileSalary) || 0,
                can_take_bookings: profileCanBook,
            };
            if (profileEmail) updates.email = profileEmail;
            if (profilePhone) updates.phone = profilePhone;

            const { error: staffErr } = await supabase
                .from('staff')
                .update(updates)
                .eq('id', profileStaff.id)
                .eq('tenant_id', tenantId);

            if (staffErr) throw staffErr;

            if (profileNewPassword && profileNewPassword.length >= 6 && profileEmail) {
                const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
                const existingUser = existingUsers?.users?.find((u: any) => u.email === profileEmail);

                let userId: string;

                if (existingUser) {
                    const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
                        password: profileNewPassword,
                    });
                    if (updateErr) throw updateErr;
                    userId = existingUser.id;
                    showToast(`Password updated successfully`);
                } else {
                    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
                        email: profileEmail,
                        password: profileNewPassword,
                        email_confirm: true,
                        user_metadata: { full_name: profileName, role: 'staff' },
                    });
                    if (createErr || !newUser?.user) throw createErr || new Error('Failed to create auth user');
                    userId = newUser.user.id;
                    showToast(`Login created for ${profileName}`);
                }

                await supabaseAdmin.from('profiles').upsert({
                    id: userId,
                    user_id: userId,
                    tenant_id: tenantId,
                    email: profileEmail,
                    full_name: profileName,
                    role: 'staff',
                    staff_id: profileStaff.id,
                    can_login: true,
                }, { onConflict: 'id' });
            }

            showToast('Profile saved successfully', 'success');
            
            setStaff(prev => prev.map(s => s.id === profileStaff.id ? {
                ...s,
                full_name: profileName,
                email: profileEmail,
                phone: profilePhone,
                role: profileRole,
                commission_rate: parseFloat(profileComm) || 0,
                base_salary: parseFloat(profileSalary) || 0,
                can_take_bookings: profileCanBook
            } : s));

            setProfileStaff(null);
            fetchStaff();
        } catch (err: any) {
            console.error('Error saving profile settings:', err);
            showToast(err.message || 'Failed to save profile', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleAddLedgerRecord = async () => {
        if (!profileStaff || !profileLedgerAmount) return;
        setSaving(true);
        try {
            const { error } = await supabaseAdmin.from('staff_payments').insert({
                tenant_id: tenantId,
                staff_id: profileStaff.id,
                amount: parseFloat(profileLedgerAmount),
                payment_type: profileLedgerType,
                notes: profileLedgerNotes || null
            });
            if (error) throw error;
            showToast('Payment recorded successfully', 'success');
            setProfileLedgerAmount('');
            setProfileLedgerNotes('');
            await refreshUnifiedProfileData(profileStaff.id);
            fetchStaff();
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteLedgerRecord = async (paymentId: string) => {
        if (!profileStaff) return;
        try {
            const { error } = await supabaseAdmin
                .from('staff_payments')
                .delete()
                .eq('id', paymentId);
            if (error) throw error;
            showToast('Ledger record deleted', 'success');
            await refreshUnifiedProfileData(profileStaff.id);
            fetchStaff();
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    const handleSaveProfileHours = async () => {
        if (!profileStaff) return;
        setSavingHours(true);
        try {
            await supabase.from('staff_working_hours').delete().eq('staff_id', profileStaff.id);
            const activeDays = profileHours.filter(h => h.is_active).map(h => ({
                staff_id: profileStaff.id,
                tenant_id: tenantId,
                day_of_week: h.day_of_week,
                start_time: h.start_time + ':00',
                end_time: h.end_time + ':00',
            }));
            if (activeDays.length > 0) {
                const { error } = await supabase.from('staff_working_hours').insert(activeDays);
                if (error) throw error;
            }
            showToast(`Working hours saved successfully`, 'success');
            await refreshUnifiedProfileData(profileStaff.id);
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setSavingHours(false);
        }
    };

    const handleCopySalonHoursToProfile = async () => {
        const { data } = await supabase
            .from('tenant_hours')
            .select('day_of_week, open_time, close_time, is_open')
            .eq('tenant_id', tenantId)
            .order('day_of_week');
        if (data && data.length > 0) {
            const salonMap = new Map((data as any[]).map(h => [h.day_of_week, h]));
            setProfileHours(prev => prev.map(h => {
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

    const handleCheckProfileConflicts = async () => {
        if (!profileStaff || !profileLeaveStart || !profileLeaveEnd) return;
        setLoadingProfileConflicts(true);
        try {
            const { data, error } = await supabase.rpc('rpc_check_leave_conflicts', {
                p_tenant_id: tenantId, p_staff_id: profileStaff.id,
                p_start_date: profileLeaveStart, p_end_date: profileLeaveEnd,
            });
            if (error) throw error;
            setProfileConflicts(Array.isArray(data) ? data : []);
            setProfileConflictsChecked(true);
        } catch (err: any) {
            showToast(err.message, 'error');
            setProfileConflicts([]);
        } finally {
            setLoadingProfileConflicts(false);
        }
    };

    const handleAddProfileLeave = async () => {
        if (!profileStaff || !profileLeaveStart || !profileLeaveEnd) return;
        setSaving(true);
        try {
            const { data, error } = await supabase.rpc('rpc_set_staff_leave', {
                p_tenant_id: tenantId, p_staff_id: profileStaff.id,
                p_start_date: profileLeaveStart, p_end_date: profileLeaveEnd, p_reason: profileLeaveReason,
            });
            if (error) throw error;
            if (data?.success) {
                showToast(`Leave set successfully`, 'success');
                setProfileLeaveStart('');
                setProfileLeaveEnd('');
                setProfileLeaveReason('Vacation');
                setProfileConflicts([]);
                setProfileConflictsChecked(false);
                await refreshUnifiedProfileData(profileStaff.id);
            } else {
                throw new Error(data?.error || 'Failed to set leave');
            }
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleCancelProfileLeave = async (leaveId: string) => {
        if (!profileStaff) return;
        try {
            const { error } = await supabase.rpc('rpc_cancel_staff_leave', {
                p_tenant_id: tenantId, p_leave_id: leaveId,
            });
            if (error) throw error;
            showToast('Leave cancelled', 'success');
            await refreshUnifiedProfileData(profileStaff.id);
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    // ─── Photo Upload (Cloudinary) ───
    const handlePhotoUpload = async (file: File, staffMember: StaffMember) => {
        if (!file || !staffMember) return;
        setUploadingPhoto(true);
        try {
            // Upload to Cloudinary using unsigned preset
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', 'voxali_uploads');
            formData.append('folder', `voxali/staff/${tenantId}`);

            const res = await fetch('https://api.cloudinary.com/v1_1/dntw71eel/image/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error('Cloudinary upload failed');
            const cloudData = await res.json();
            const publicUrl = cloudData.secure_url;

            // Save URL to Supabase staff table
            const { error: updateError } = await supabase
                .from('staff')
                .update({ photo_url: publicUrl })
                .eq('id', staffMember.id)
                .eq('tenant_id', tenantId);

            if (updateError) throw updateError;

            showToast(`Photo updated for ${staffMember.full_name}! ✅`);
            setPhotoUploadStaff(null);
            
            // If unified profile is open, update photo_url immediately
            if (profileStaff && profileStaff.id === staffMember.id) {
                setProfileStaff(prev => prev ? { ...prev, photo_url: publicUrl } : null);
            }
            
            fetchStaff();
        } catch (err: any) {
            showToast(err.message || 'Photo upload failed', 'error');
        }
        setUploadingPhoto(false);
    };

    // ─── Open Crop Modal ───
    const openCropModal = (file: File, staffMember: StaffMember) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            setCropSrc(e.target?.result as string);
            setCropStaff(staffMember);
            setCropZoom(1);
            setCropOffset({ x: 0, y: 0 });
            setShowCropModal(true);
        };
        reader.readAsDataURL(file);
    };

    // ─── Crop Confirm: Draw on canvas → Blob → Upload ───
    const handleCropConfirm = async () => {
        if (!cropSrc || !cropStaff) return;
        setShowCropModal(false);
        setUploadingPhoto(true);
        try {
            const SIZE = 400;
            const canvas = document.createElement('canvas');
            canvas.width = SIZE; canvas.height = SIZE;
            const ctx = canvas.getContext('2d')!;

            // Draw circular clip
            ctx.beginPath();
            ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
            ctx.clip();

            // Draw image
            const img = new window.Image();
            img.src = cropSrc;
            await new Promise(r => { img.onload = r; });

            const scaledW = img.naturalWidth * cropZoom;
            const scaledH = img.naturalHeight * cropZoom;
            const drawX = (SIZE - scaledW) / 2 + cropOffset.x;
            const drawY = (SIZE - scaledH) / 2 + cropOffset.y;
            ctx.drawImage(img, drawX, drawY, scaledW, scaledH);

            // Canvas to Blob
            const blob: Blob = await new Promise(res => canvas.toBlob(b => res(b!), 'image/jpeg', 0.92));
            const file = new File([blob], 'staff-photo.jpg', { type: 'image/jpeg' });
            if (cropStaff.id === 'new') {
                setAPhotoFile(file);
                if (aPhotoPreviewUrl) URL.revokeObjectURL(aPhotoPreviewUrl);
                setAPhotoPreviewUrl(URL.createObjectURL(file));
                setUploadingPhoto(false);
                setPhotoUploadStaff(null);
            } else {
                await handlePhotoUpload(file, cropStaff);
            }
        } catch (err: any) {
            showToast(err.message || 'Crop failed', 'error');
            setUploadingPhoto(false);
        }
        setCropSrc(null);
        setCropStaff(null);
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
        setAName(''); setAEmail(''); setAPhone(''); setARole('stylist'); setAComm('15'); setASalary('0'); setAPassword(''); setAConfirmPw(''); setACanBook(true); setACreateLogin(false);
        setAPhotoFile(null);
        if (aPhotoPreviewUrl) {
            URL.revokeObjectURL(aPhotoPreviewUrl);
            setAPhotoPreviewUrl('');
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

            // Update details including base_salary and can_take_bookings
            if (staffId) {
                const updates: any = {
                    can_take_bookings: aCanBook,
                    base_salary: parseFloat(aSalary) || 0
                };
                await supabase.from('staff').update(updates).eq('id', staffId);
            }

            // If a photo was selected, upload it
            if (aPhotoFile && staffId) {
                await handlePhotoUpload(aPhotoFile, { id: staffId, full_name: aName, role: aRole } as StaffMember);
            }

            // If dashboard login is enabled and password provided, create auth login immediately
            if (aCreateLogin && aPassword && aPassword.length >= 6 && aEmail) {
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
                if (!aPhotoFile) {
                    showToast('Staff added!');
                }
            }

            setShowAddModal(false);
            setAName(''); setAEmail(''); setAPhone(''); setARole('stylist'); setAComm('15'); setASalary('0'); setAPassword(''); setAConfirmPw(''); setACanBook(true); setACreateLogin(false);
            setAPhotoFile(null);
            if (aPhotoPreviewUrl) {
                URL.revokeObjectURL(aPhotoPreviewUrl);
                setAPhotoPreviewUrl('');
            }
            fetchStaff();
        } else {
            showToast(error?.message || 'Failed', 'error');
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

    // DAY_NAMES array used by shifts scheduler
    const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Reactivate helper remains in scope
    const handleReactivate = async (s: StaffMember) => {
        const { error } = await supabase.rpc('rpc_reactivate_staff', {
            p_tenant_id: tenantId, p_staff_id: s.id,
        });
        if (!error) {
            if (s.email) {
                try {
                    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
                    const authUser = users?.users?.find((u: any) => u.email === s.email);
                    if (authUser) {
                        console.log('[Reactivate] Unbanning user:', authUser.id, authUser.email);
                        await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
                            ban_duration: 'none',
                        });
                        await supabaseAdmin.rpc('rpc_unban_user', { p_user_id: authUser.id });
                        await supabaseAdmin.from('profiles').update({ can_login: true }).eq('id', authUser.id);
                    }
                } catch (e) { console.error('[Reactivate] Unban error:', e); }
            }
            showToast(`${s.full_name} reactivated & login restored`);
            fetchStaff();
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
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-4">
                <div className="flex items-center gap-2.5 flex-shrink-0">
                    <div className="p-2 bg-luxe-gold/10 rounded-xl border border-luxe-gold/20">
                        <Scissors className="w-5 h-5 text-luxe-gold" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold whitespace-nowrap text-white">Staff Board</h3>
                        <p className="text-[9px] text-white/40 uppercase tracking-widest whitespace-nowrap">Team Performance & Management</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
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
                </div>
            </div>

            {/* Summary Stats */}
                    {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in duration-500">
                <PerformanceStat label="Active Staff" value={String(activeStaff.length)} trend="+1 this month" icon={Scissors} color="indigo" />
                <PerformanceStat label="Total Revenue" value={`$${fmt(totalRev)}`} trend="This month" icon={TrendingUp} color="emerald" />
                <PerformanceStat label="Total Bookings" value={String(totalBookings)} trend="This month" icon={BarChart3} color="sky" />
                <PerformanceStat label="Top Performer" value={activeStaff.length > 0 ? activeStaff.sort((a, b) => b.revenue - a.revenue)[0].full_name.split(' ')[0] : '—'} trend="Top Performer 🏆" icon={Trophy} color="amber" />
            </div>

            {/* Search and Filters Toolbar removed */}

            {/* Staff Table */}
            <div className="glass-panel border border-white/5 overflow-hidden transition-all duration-300">
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
                            {(() => {
                                const filteredActiveStaff = activeStaff;

                                if (filteredActiveStaff.length === 0) {
                                    return (
                                        <tr>
                                            <td colSpan={isOwnerPrivilege ? 8 : 5} className="py-16 text-center">
                                                <div className="flex flex-col items-center justify-center gap-2 text-white/30">
                                                    <div className="p-3 bg-white/5 rounded-2xl border border-white/5 mb-1">
                                                        <Inbox className="w-6 h-6 text-white/20" />
                                                    </div>
                                                    <p className="text-sm font-bold text-white/50">No Stylists Found</p>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }

                                return filteredActiveStaff.map((s) => {
                                    const commission = s.revenue * (s.commission_rate / 100);
                                    return (
                                        <tr key={s.id} onClick={() => { if (isOwnerPrivilege) { openUnifiedProfile(s, 'financials'); } }} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors duration-300 cursor-pointer">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="relative group cursor-pointer" onClick={(e) => { e.stopPropagation(); if (isOwnerPrivilege) { setPhotoUploadStaff(s); photoInputRef.current?.click(); } }}>
                                                        {s.photo_url ? (
                                                            <img
                                                                src={s.photo_url}
                                                                alt={s.full_name}
                                                                className="w-11 h-11 rounded-2xl object-cover border border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.2)] transition-all duration-300 group-hover:scale-105 group-hover:border-white/20"
                                                            />
                                                        ) : (
                                                            <div 
                                                                className="w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black border transition-all duration-300 group-hover:scale-105" 
                                                                style={{ 
                                                                    color: s.color, 
                                                                    backgroundColor: `${s.color}12`,
                                                                    borderColor: `${s.color}30`,
                                                                    boxShadow: `0 0 15px ${s.color}10`
                                                                }}
                                                            >
                                                                {s.full_name.charAt(0)}
                                                            </div>
                                                        )}
                                                        {/* Circular status overlay dot */}
                                                        <span 
                                                            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0D0D0D] shadow-sm flex items-center justify-center ${s.is_blocked_today ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                                                            title={s.is_blocked_today ? 'Blocked Today' : 'Available/Active'}
                                                        />
                                                        {isOwnerPrivilege && (
                                                            <div className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <Camera className="w-4 h-4 text-white" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-white/95">{s.full_name}</p>
                                                        <p className="text-[10px] text-white/30 uppercase tracking-wider">{s.role.replace('_', ' ')}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center font-bold text-sm text-white">{s.bookings_count}</td>
                                            <td className="px-6 py-5 text-center font-bold text-sm text-emerald-400">${s.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                            {isOwnerPrivilege && (
                                                <>
                                                    <td className="px-6 py-5 text-center">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); openUnifiedProfile(s, 'financials'); }} 
                                                            className="font-semibold text-xs text-white/90 bg-white/[0.03] border border-white/10 hover:border-white/20 hover:bg-white/[0.06] hover:text-white px-2.5 py-1 rounded-lg cursor-pointer transition-all duration-300"
                                                            title="Edit Salary Settings"
                                                        >
                                                            ${s.base_salary.toLocaleString()}
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-5 text-center">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); openUnifiedProfile(s, 'financials'); }}
                                                            className="font-semibold text-xs text-[#E5C158] bg-[#E5C158]/5 border border-[#E5C158]/10 hover:border-[#E5C158]/20 hover:bg-[#E5C158]/15 px-2.5 py-1 rounded-lg cursor-pointer transition-all duration-300"
                                                            title="Edit Commission Settings"
                                                        >
                                                            {s.commission_rate}%
                                                        </button>
                                                    </td>
                                                    <td className="px-6 py-5 text-center font-black text-sm text-[#E5C158]">${commission.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                                </>
                                            )}
                                            <td className="px-6 py-5 text-center">
                                                {s.is_blocked_today ? (
                                                    <span className="text-[9px] font-black tracking-wider bg-rose-500/10 text-rose-400 px-3 py-1 rounded-full border border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.05)]">BLOCKED</span>
                                                ) : (
                                                    <span className="text-[9px] font-black tracking-wider bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.05)]">ACTIVE</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5 text-center min-w-[120px]">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={(e) => { e.stopPropagation(); openUnifiedProfile(s, 'financials'); }} title="Manage Stylist"
                                                        className="w-9 h-9 rounded-xl bg-sky-500/5 text-sky-400/70 border border-sky-500/10 hover:text-sky-400 hover:bg-sky-500/15 hover:border-sky-500/30 transition-all duration-300 flex items-center justify-center cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); setDeactivateTarget(s); }} title="Remove Staff"
                                                        className="w-9 h-9 rounded-xl bg-rose-500/5 text-rose-400/70 border border-rose-500/10 hover:text-rose-400 hover:bg-rose-500/15 hover:border-rose-500/30 transition-all duration-300 flex items-center justify-center cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
                                                        <UserMinus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                });
                            })()}
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


            {showAddModal && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
                    <div className="bg-gradient-to-b from-[#161618] to-[#0A0A0B] border border-white/10 rounded-2xl p-5 w-full max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        
                        {/* Header */}
                        <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-4 shrink-0">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <UserPlus className="w-4.5 h-4.5 text-luxe-gold" />
                                Add New Staff Member
                            </h3>
                            <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-white/10 rounded-lg transition-all text-white/40 hover:text-white">
                                <X className="w-4.5 h-4.5" />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1.5 scrollbar-none">
                            {/* Profile Image & Full Name side-by-side */}
                            <div className="grid grid-cols-[72px_1fr] gap-4 items-center bg-white/[0.01] border border-white/5 p-3 rounded-xl">
                                {/* Profile Image Upload Selector */}
                                <div className="flex flex-col items-center justify-center">
                                    <div className="relative group cursor-pointer" onClick={() => {
                                        setPhotoUploadStaff({ id: 'new', full_name: aName || 'New Staff', role: aRole } as StaffMember);
                                        photoInputRef.current?.click();
                                    }}>
                                        {aPhotoPreviewUrl ? (
                                            <div className="relative">
                                                <img
                                                    src={aPhotoPreviewUrl}
                                                    alt="Preview"
                                                    className="w-18 h-18 rounded-2xl object-cover border border-white/10 shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:border-white/20"
                                                />
                                                <div className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Camera className="w-4 h-4 text-white" />
                                                </div>
                                                {/* Clear photo button */}
                                                <button 
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setAPhotoFile(null);
                                                        if (aPhotoPreviewUrl) URL.revokeObjectURL(aPhotoPreviewUrl);
                                                        setAPhotoPreviewUrl('');
                                                    }}
                                                    className="absolute -top-1.5 -right-1.5 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow"
                                                    title="Remove photo"
                                                >
                                                    <X className="w-2.5 h-2.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="w-18 h-18 rounded-2xl border-2 border-dashed border-white/10 hover:border-luxe-gold/40 hover:bg-white/[0.02] transition-all flex flex-col items-center justify-center gap-1 text-white/30 hover:text-white/60">
                                                <Upload className="w-4 h-4 text-white/20" />
                                                <span className="text-[9px] font-bold uppercase tracking-wider">Upload</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Full Name Input */}
                                <div>
                                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-1.5 block">Full Name *</label>
                                    <input value={aName} onChange={e => setAName(e.target.value)} placeholder="Sarah Johnson" required
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-luxe-gold/50 transition-all text-white" />
                                </div>
                            </div>

                            {/* Email & Phone */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-1.5 block">Email *</label>
                                    <input value={aEmail} onChange={e => setAEmail(e.target.value)} placeholder="sarah@salon.com" required
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-luxe-gold/50 transition-all text-white" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-1.5 block">Phone *</label>
                                    <input value={aPhone} onChange={e => setAPhone(e.target.value)} placeholder="+1 555-0101" required
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-luxe-gold/50 transition-all text-white" />
                                </div>
                            </div>

                            {/* Role, Commission %, Base Salary */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-1.5 block">Role</label>
                                    <select value={aRole} onChange={e => setARole(e.target.value)}
                                        className="w-full bg-zinc-900 text-white border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-luxe-gold/50 transition-all cursor-pointer font-medium">
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
                                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-1.5 block">Commission %</label>
                                    <input type="number" value={aComm} onChange={e => setAComm(e.target.value)} min="0" max="100" step="1"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-luxe-gold/50 transition-all text-white font-bold" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-1.5 block">Base Salary ($)</label>
                                    <input type="number" value={aSalary} onChange={e => setASalary(e.target.value)} min="0" step="100"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-luxe-gold/50 transition-all text-white font-bold" />
                                </div>
                            </div>

                            {/* Can Take Bookings Toggle */}
                            <div className="flex items-center justify-between gap-4 p-3 bg-white/[0.01] border border-white/5 rounded-xl">
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-white">Can Take Bookings</p>
                                    <p className="text-[10px] text-white/40 mt-0.5">Allow AI to book appointments with this staff</p>
                                </div>
                                <button type="button" onClick={() => setACanBook(v => !v)} aria-label="Toggle can take bookings"
                                    className={aCanBook ? 'relative flex-shrink-0 w-9 h-5 rounded-full transition-all duration-200 focus:outline-none bg-green-500' : 'relative flex-shrink-0 w-9 h-5 rounded-full transition-all duration-200 focus:outline-none bg-white/20'}>
                                    <span className={aCanBook ? 'block w-4 h-4 bg-white rounded-full shadow-md transition-all duration-200 translate-x-4 mt-0.5 ml-0.5' : 'block w-4 h-4 bg-white rounded-full shadow-md transition-all duration-200 translate-x-0.5 mt-0.5 ml-0.5'} />
                                </button>
                            </div>

                            {/* Enable Dashboard Login Option */}
                            <div className="flex items-center justify-between gap-4 p-3 bg-white/[0.01] border border-white/5 rounded-xl">
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-white flex items-center gap-2">
                                        <Key className="w-3.5 h-3.5 text-luxe-gold/80" />
                                        Enable Dashboard Login
                                    </p>
                                    <p className="text-[10px] text-white/40 mt-0.5">Allow this staff member to sign in to their portal</p>
                                </div>
                                <button type="button" onClick={() => setACreateLogin(v => !v)} aria-label="Toggle enable dashboard login"
                                    className={aCreateLogin ? 'relative flex-shrink-0 w-9 h-5 rounded-full transition-all duration-200 focus:outline-none bg-luxe-gold' : 'relative flex-shrink-0 w-9 h-5 rounded-full transition-all duration-200 focus:outline-none bg-white/10'}>
                                    <span className={aCreateLogin ? 'block w-4 h-4 bg-luxe-obsidian rounded-full shadow-md transition-all duration-200 translate-x-4 mt-0.5 ml-0.5' : 'block w-4 h-4 bg-white/60 rounded-full shadow-md transition-all duration-200 translate-x-0.5 mt-0.5 ml-0.5'} />
                                </button>
                            </div>

                            {/* Dashboard Password inputs (expandable) */}
                            {aCreateLogin && (
                                <div className="space-y-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl animate-in slide-in-from-top-3 duration-200">
                                    <div>
                                        <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-1.5 block">Login Password *</label>
                                        <div className="relative">
                                            <input type={showAPassword ? 'text' : 'password'} value={aPassword} onChange={e => setAPassword(e.target.value)} placeholder="Min 6 characters" required
                                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pr-10 text-xs outline-none focus:border-luxe-gold/50 transition-all text-white" />
                                            <button type="button" onClick={() => setShowAPassword(!showAPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors" title="Toggle password visibility">
                                                {showAPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-1.5 block">Confirm Password *</label>
                                        <input type={showAPassword ? 'text' : 'password'} value={aConfirmPw} onChange={e => setAConfirmPw(e.target.value)} placeholder="Confirm password" required
                                            className={`w-full bg-white/5 border rounded-xl p-3 text-xs outline-none transition-all text-white ${aConfirmPw && aConfirmPw !== aPassword ? 'border-red-500/50 focus:border-red-500/50' : 'border-white/10 focus:border-luxe-gold/50'}`} />
                                        {aConfirmPw && aConfirmPw !== aPassword && (
                                            <p className="text-[9px] text-red-400 mt-1">⚠ Passwords do not match</p>
                                        )}
                                        {aConfirmPw && aConfirmPw === aPassword && (
                                            <p className="text-[9px] text-green-400 mt-1">✅ Passwords match</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="pt-3 border-t border-white/5 mt-4 shrink-0">
                            <button onClick={handleAddStaff} disabled={saving || !aName || !aEmail || (aCreateLogin && (!aPassword || aPassword.length < 6 || aPassword !== aConfirmPw))}
                                className="w-full bg-gold-gradient text-luxe-obsidian font-bold py-3 rounded-xl shadow-lg shadow-luxe-gold/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs uppercase tracking-wider">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                {saving ? 'ADDING...' : 'ADD NEW STAFF'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Unified Stylist Profile & Payroll Dashboard Modal */}
            {profileStaff && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-2 overflow-hidden animate-in fade-in duration-300" onClick={() => setProfileStaff(null)}>
                    <div className="bg-luxe-obsidian border border-white/10 rounded-2xl w-full max-w-4xl max-h-[96vh] shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        
                        {/* Header */}
                        <div className="flex justify-between items-center px-4 py-3 border-b border-white/5 bg-white/[0.01] shrink-0">
                            <div>
                                <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                                    <Scissors className="w-4 h-4 text-luxe-gold" />
                                    Stylist Profile & Payroll Dashboard
                                </h3>
                                <p className="text-[9px] text-white/40 uppercase tracking-widest mt-0.5">Manage Personal Details, Earnings, Shifts, and Leaves</p>
                            </div>
                            <button onClick={() => setProfileStaff(null)} className="p-1.5 hover:bg-white/10 rounded-xl transition-all text-white/60 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Two Column Layout */}
                        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-white/5 min-h-0 overflow-hidden">
                            
                            {/* Left Column - Profile Settings */}
                            <div className="lg:col-span-4 p-4 space-y-3 overflow-y-auto max-h-full">
                                <div className="flex flex-col items-center text-center">
                                    <div className="relative group cursor-pointer mb-2" onClick={() => { setPhotoUploadStaff(profileStaff); photoInputRef.current?.click(); }}>
                                        {profileStaff.photo_url ? (
                                            <img
                                                src={profileStaff.photo_url}
                                                alt={profileStaff.full_name}
                                                className="w-16 h-16 rounded-xl object-cover border border-white/10 shadow-[0_4px_12px_rgba(0,0,0,0.2)] transition-all duration-300 group-hover:scale-105 group-hover:border-white/20"
                                            />
                                        ) : (
                                            <div 
                                                className="w-16 h-16 rounded-xl flex items-center justify-center text-lg font-black border transition-all duration-300 group-hover:scale-105" 
                                                style={{ 
                                                    color: profileStaff.color, 
                                                    backgroundColor: `${profileStaff.color}12`,
                                                    borderColor: `${profileStaff.color}30`,
                                                    boxShadow: `0 0 15px ${profileStaff.color}10`
                                                }}
                                            >
                                                {profileStaff.full_name.charAt(0)}
                                            </div>
                                        )}
                                        <div className="absolute inset-0 rounded-xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Camera className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                    <h4 className="font-bold text-sm text-white">{profileStaff.full_name}</h4>
                                    <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">{profileStaff.role.replace('_', ' ')}</p>
                                </div>

                                <div className="space-y-3 pt-1.5 border-t border-white/5">
                                    <div>
                                        <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-1 block">Full Name</label>
                                        <input value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Full Name"
                                            className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs outline-none focus:border-luxe-gold/50 transition-all text-white" />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-1 block">Email</label>
                                            <input value={profileEmail} onChange={e => setProfileEmail(e.target.value)} placeholder="email@example.com"
                                                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs outline-none focus:border-luxe-gold/50 transition-all text-white" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-1 block">Phone</label>
                                            <input value={profilePhone} onChange={e => setProfilePhone(e.target.value)} placeholder="+1 555-0001"
                                                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs outline-none focus:border-luxe-gold/50 transition-all text-white" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-1 block">Role</label>
                                            <select value={profileRole} onChange={e => setProfileRole(e.target.value)}
                                                className="w-full bg-zinc-900 text-white border border-white/10 rounded-lg p-2 text-xs outline-none focus:border-luxe-gold/50 transition-all cursor-pointer">
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
                                        <div className="flex items-center justify-between p-1.5 bg-white/[0.02] border border-white/10 rounded-lg">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-bold text-white">Can Book</span>
                                                <span className="text-[8px] text-white/40">Visible to AI</span>
                                            </div>
                                            <button type="button" onClick={() => setProfileCanBook(v => !v)} aria-label="Toggle can book"
                                                className={profileCanBook ? 'relative flex-shrink-0 w-7 h-4 rounded-full transition-all duration-200 focus:outline-none bg-green-500' : 'relative flex-shrink-0 w-7 h-4 rounded-full transition-all duration-200 focus:outline-none bg-white/20'}>
                                                <span className={profileCanBook ? 'block w-3 h-3 bg-white rounded-full shadow-md transition-all duration-200 translate-x-3 mt-0.5 ml-0.5' : 'block w-3 h-3 bg-white rounded-full shadow-md transition-all duration-200 translate-x-0.5 mt-0.5 ml-0.5'} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Financial Adjustment Rates */}
                                    <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-white/5">
                                        <div>
                                            <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-1 block">Base Salary ($)</label>
                                            <input type="number" value={profileSalary} onChange={e => setProfileSalary(e.target.value)} min="0" step="100"
                                                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs font-bold outline-none focus:border-luxe-gold/50 transition-all text-white" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-1 block">Commission %</label>
                                            <input type="number" value={profileComm} onChange={e => setProfileComm(e.target.value)} min="0" max="100" step="1"
                                                className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs font-bold outline-none focus:border-luxe-gold/50 transition-all text-white" />
                                        </div>
                                    </div>

                                    {/* Password Adjustment */}
                                    <div className="border-t border-white/5 pt-2">
                                        <button type="button" onClick={() => setShowProfilePassword(!showProfilePassword)}
                                            className="text-[9px] font-bold text-luxe-gold/80 hover:text-luxe-gold flex items-center gap-1 uppercase tracking-wider transition-colors">
                                            <Key className="w-3 h-3" /> {showProfilePassword ? 'Hide Password Change' : 'Change Stylist Password'}
                                        </button>
                                        {showProfilePassword && (
                                            <div className="mt-2 space-y-2 animate-in slide-in-from-top-2 duration-200">
                                                <div>
                                                    <label className="text-[8px] font-bold text-white/40 uppercase tracking-wider mb-0.5 block">New Password</label>
                                                    <input type="password" value={profileNewPassword} onChange={e => setProfileNewPassword(e.target.value)} placeholder="Min 6 characters"
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs outline-none focus:border-luxe-gold/50 transition-all text-white" />
                                                </div>
                                                <div>
                                                    <label className="text-[8px] font-bold text-white/40 uppercase tracking-wider mb-0.5 block">Confirm Password</label>
                                                    <input type="password" value={profileConfirmPassword} onChange={e => setProfileConfirmPassword(e.target.value)} placeholder="Confirm password"
                                                        className={`w-full bg-white/5 border rounded-lg p-2 text-xs outline-none transition-all text-white ${profileConfirmPassword && profileConfirmPassword !== profileNewPassword ? 'border-red-500/50' : 'border-white/10 focus:border-luxe-gold/50'}`} />
                                                    {profileConfirmPassword && profileConfirmPassword !== profileNewPassword && (
                                                        <p className="text-[8px] text-red-400 mt-0.5">⚠ Passwords do not match</p>
                                                    )}
                                                    {profileConfirmPassword && profileConfirmPassword === profileNewPassword && (
                                                        <p className="text-[8px] text-green-400 mt-0.5">✅ Passwords match</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button onClick={handleSaveProfile} disabled={saving || !profileName || (profileNewPassword.length > 0 && (profileNewPassword.length < 6 || profileNewPassword !== profileConfirmPassword))}
                                    className="w-full bg-gold-gradient text-luxe-obsidian font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5">
                                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                    SAVE PROFILE CHANGES
                                </button>
                            </div>

                            {/* Right Column - Tabbed Dashboard Panels */}
                            <div className="lg:col-span-8 p-5 flex flex-col overflow-y-auto max-h-full">
                                
                                {/* Tabs Header */}
                                <div className="flex items-center gap-2 p-1 bg-white/[0.02] border border-white/5 rounded-2xl mb-6">
                                    <button
                                        onClick={() => setActiveProfileTab('financials')}
                                        className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                            activeProfileTab === 'financials' ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        Overview & Financials
                                    </button>
                                    <button
                                        onClick={() => setActiveProfileTab('ledger')}
                                        className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                            activeProfileTab === 'ledger' ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        Payout Ledger ({profilePayments.length})
                                    </button>
                                    <button
                                        onClick={() => setActiveProfileTab('schedule')}
                                        className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                            activeProfileTab === 'schedule' ? 'bg-white/10 text-white shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        Shifts & Leaves
                                    </button>
                                </div>

                                {loadingProfileData ? (
                                    <div className="flex-1 flex flex-col items-center justify-center py-20">
                                        <Loader2 className="w-8 h-8 text-luxe-gold animate-spin mb-3" />
                                        <p className="text-xs text-white/40 uppercase tracking-widest">Loading stylist stats...</p>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col min-h-0">
                                        
                                        {/* Tab 1: Financials */}
                                        {activeProfileTab === 'financials' && (() => {
                                            const baseSalaryVal = parseFloat(profileSalary) || 0;
                                            const commRateVal = parseFloat(profileComm) || 0;
                                            const bookingRevenue = profileStaff.revenue || 0;
                                            const commissionVal = bookingRevenue * (commRateVal / 100);
                                            const totalTipsVal = profileTips || 0;

                                            const grossEarnings = baseSalaryVal + commissionVal + totalTipsVal;

                                            const totalAdvances = profilePayments
                                                .filter(p => p.payment_type === 'advance')
                                                .reduce((sum, p) => sum + p.amount, 0);

                                            const totalPayouts = profilePayments
                                                .filter(p => p.payment_type !== 'advance')
                                                .reduce((sum, p) => sum + p.amount, 0);

                                            const netPayoutDue = grossEarnings - totalAdvances - totalPayouts;

                                            return (
                                                <div className="space-y-6 animate-in fade-in duration-300">
                                                    
                                                    {/* Earnings Stats Cards */}
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                        <div className="bg-white/[0.01] border border-white/5 p-3 rounded-xl">
                                                            <p className="text-[9px] font-bold text-white/30 uppercase tracking-wider mb-0.5">Total Bookings</p>
                                                            <p className="text-sm font-black text-white">{profileStaff.bookings_count}</p>
                                                        </div>
                                                        <div className="bg-white/[0.01] border border-white/5 p-3 rounded-xl">
                                                            <p className="text-[9px] font-bold text-white/30 uppercase tracking-wider mb-0.5">Revenue Generated</p>
                                                            <p className="text-sm font-black text-emerald-400">${bookingRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                                        </div>
                                                        <div className="bg-white/[0.01] border border-white/5 p-3 rounded-xl">
                                                            <p className="text-[9px] font-bold text-white/30 uppercase tracking-wider mb-0.5">Commission Earned</p>
                                                            <p className="text-sm font-black text-[#E5C158]">${commissionVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                                        </div>
                                                        <div className="bg-white/[0.01] border border-white/5 p-3 rounded-xl">
                                                            <p className="text-[9px] font-bold text-white/30 uppercase tracking-wider mb-0.5">Tips Collected</p>
                                                            <p className="text-sm font-black text-sky-400">${totalTipsVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                                        </div>
                                                    </div>

                                                    {/* Balance calculation sheet */}
                                                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 relative overflow-hidden">
                                                        <h4 className="text-xs font-bold text-white/50 uppercase tracking-widest mb-3">Earnings Breakdown & Ledger</h4>
                                                        
                                                        <div className="space-y-2.5 text-xs">
                                                            <div className="flex justify-between items-center text-white/70">
                                                                <span>Monthly Base Salary</span>
                                                                <span className="font-semibold text-white">${baseSalaryVal.toLocaleString()}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-white/70">
                                                                <span>Service Commission ({commRateVal}%)</span>
                                                                <span className="font-semibold text-white">+ ${commissionVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-white/70">
                                                                <span>Client Tips (Completed Payments)</span>
                                                                <span className="font-semibold text-white">+ ${totalTipsVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                                            </div>
                                                            
                                                            <div className="border-t border-white/5 my-2 pt-2 flex justify-between items-center text-white font-bold">
                                                                <span>Gross Earnings</span>
                                                                <span className="text-[#E5C158]">${grossEarnings.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                                            </div>

                                                            <div className="flex justify-between items-center text-rose-400/80">
                                                                <span>Salary Advances / Loans</span>
                                                                <span>- ${totalAdvances.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center text-white/50">
                                                                <span>Ledger Payouts Paid</span>
                                                                <span>- ${totalPayouts.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                                            </div>

                                                            {/* Big prominent payout card */}
                                                            <div className="border-t border-white/10 mt-4 pt-4 flex flex-col sm:flex-row justify-between sm:items-center p-4 bg-white/[0.02] border border-white/5 rounded-xl shadow-lg">
                                                                <div>
                                                                    <p className="text-xs font-bold text-white/40 uppercase tracking-wider">Net Payout Due</p>
                                                                    <p className="text-[10px] text-white/30 mt-0.5">Gross Earnings less Advances and Payouts</p>
                                                                </div>
                                                                <div className="text-right mt-2 sm:mt-0">
                                                                    <span className={`text-2xl font-black ${netPayoutDue >= 0 ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.15)]' : 'text-rose-400'}`}>
                                                                        ${netPayoutDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                        </div>
                                                    </div>

                                                </div>
                                            );
                                        })()}

                                        {/* Tab 2: Ledger Payouts */}
                                        {activeProfileTab === 'ledger' && (
                                            <div className="space-y-6 flex-1 flex flex-col min-h-0 animate-in fade-in duration-300">
                                                
                                                {/* Payout Entry Form */}
                                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 bg-white/[0.02] border border-white/5 rounded-xl items-end">
                                                    <div className="sm:col-span-3">
                                                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5 block">Amount ($)</label>
                                                        <input type="number" value={profileLedgerAmount} onChange={e => setProfileLedgerAmount(e.target.value)} placeholder="0.00" min="0" step="10"
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs outline-none focus:border-luxe-gold/50 transition-all text-white font-bold" />
                                                    </div>
                                                    <div className="sm:col-span-4">
                                                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5 block">Type</label>
                                                        <select value={profileLedgerType} onChange={e => setProfileLedgerType(e.target.value)}
                                                            className="w-full bg-zinc-900 text-white border border-white/10 rounded-xl p-2.5 text-xs outline-none focus:border-luxe-gold/50 transition-all cursor-pointer">
                                                            <option value="advance">Salary Advance</option>
                                                            <option value="salary_clearance">Salary Clearance</option>
                                                            <option value="commission_payout">Commission Payout</option>
                                                            <option value="tip_payout">Tip Payout</option>
                                                        </select>
                                                    </div>
                                                    <div className="sm:col-span-3">
                                                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5 block">Notes</label>
                                                        <input type="text" value={profileLedgerNotes} onChange={e => setProfileLedgerNotes(e.target.value)} placeholder="e.g. June advance"
                                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs outline-none focus:border-luxe-gold/50 transition-all text-white" />
                                                    </div>
                                                    <button onClick={handleAddLedgerRecord} disabled={saving || !profileLedgerAmount}
                                                        className="sm:col-span-2 w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer">
                                                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                                        Record
                                                    </button>
                                                </div>

                                                {/* History Table */}
                                                <div className="flex-1 min-h-[200px] border border-white/5 bg-white/[0.01] rounded-xl overflow-hidden flex flex-col">
                                                    <div className="overflow-x-auto overflow-y-auto max-h-[350px]">
                                                        <table className="w-full text-xs">
                                                            <thead>
                                                                <tr className="border-b border-white/5 bg-white/[0.02] text-left text-white/40 uppercase tracking-widest text-[9px]">
                                                                    <th className="px-4 py-3">Date</th>
                                                                    <th className="px-4 py-3">Type</th>
                                                                    <th className="px-4 py-3">Notes</th>
                                                                    <th className="px-4 py-3 text-right">Amount</th>
                                                                    <th className="px-4 py-3 text-center">Action</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-white/5">
                                                                {profilePayments.length === 0 ? (
                                                                    <tr>
                                                                        <td colSpan={5} className="py-12 text-center text-white/30">
                                                                            No ledger payments history found for this stylist.
                                                                        </td>
                                                                    </tr>
                                                                ) : (
                                                                    profilePayments.map(p => (
                                                                        <tr key={p.id} className="hover:bg-white/[0.01] transition-colors">
                                                                            <td className="px-4 py-3 text-white/70">
                                                                                {p.payment_date ? new Date(p.payment_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                                                            </td>
                                                                            <td className="px-4 py-3">
                                                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                                                                                    {p.payment_type.replace('_', ' ').toUpperCase()}
                                                                                </span>
                                                                            </td>
                                                                            <td className="px-4 py-3 text-white/60 max-w-[150px] truncate" title={p.notes || ''}>
                                                                                {p.notes || <span className="text-white/20 italic">None</span>}
                                                                            </td>
                                                                            <td className="px-4 py-3 text-right font-bold text-white">
                                                                                ${p.amount.toFixed(2)}
                                                                            </td>
                                                                            <td className="px-4 py-3 text-center">
                                                                                <button onClick={() => handleDeleteLedgerRecord(p.id)} title="Delete payout record"
                                                                                    className="p-1 hover:bg-red-500/10 text-white/30 hover:text-red-400 rounded transition-all cursor-pointer">
                                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                                </button>
                                                                            </td>
                                                                        </tr>
                                                                    ))
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>

                                            </div>
                                        )}

                                        {/* Tab 3: Shifts & Leaves */}
                                        {activeProfileTab === 'schedule' && (
                                            <div className="space-y-6 flex-1 flex flex-col min-h-0 overflow-y-auto animate-in fade-in duration-300">
                                                
                                                {/* Shifts Grid */}
                                                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <div>
                                                            <h5 className="text-xs font-bold text-white uppercase tracking-wider">Weekly Shifts Planner</h5>
                                                            <p className="text-[10px] text-white/40 mt-0.5">Toggle active workdays and define times</p>
                                                        </div>
                                                        <button onClick={handleCopySalonHoursToProfile}
                                                            className="bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold py-1.5 px-3 rounded-lg hover:bg-blue-500/20 transition-all flex items-center gap-1.5 text-[10px] uppercase tracking-wider cursor-pointer">
                                                            <Copy className="w-3.5 h-3.5" /> Copy Salon Hours
                                                        </button>
                                                    </div>

                                                    <div className="space-y-2">
                                                        {profileHours.map((h, i) => (
                                                            <div key={h.day_of_week} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${h.is_active ? 'bg-white/[0.02] border-white/10' : 'bg-white/[0.01] border-white/5 opacity-40'}`}>
                                                                <button
                                                                    onClick={() => setProfileHours(prev => prev.map((p, idx) => idx === i ? { ...p, is_active: !p.is_active } : p))}
                                                                    className={`w-14 text-[9px] font-black uppercase tracking-wider py-1 rounded-md border transition-all cursor-pointer ${h.is_active ? 'bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_8px_rgba(74,222,128,0.1)]' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}
                                                                >
                                                                    {h.is_active ? 'ON' : 'OFF'}
                                                                </button>
                                                                <span className="w-20 text-xs font-bold text-white/70">{DAY_NAMES[h.day_of_week]}</span>
                                                                <input type="time" value={h.start_time} disabled={!h.is_active}
                                                                    onChange={e => setProfileHours(prev => prev.map((p, idx) => idx === i ? { ...p, start_time: e.target.value } : p))}
                                                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-luxe-gold/50 transition-all text-white disabled:opacity-30" />
                                                                <span className="text-white/20 text-xs">to</span>
                                                                <input type="time" value={h.end_time} disabled={!h.is_active}
                                                                    onChange={e => setProfileHours(prev => prev.map((p, idx) => idx === i ? { ...p, end_time: e.target.value } : p))}
                                                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-luxe-gold/50 transition-all text-white disabled:opacity-30" />
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <button onClick={handleSaveProfileHours} disabled={savingHours}
                                                        className="w-full mt-4 bg-gold-gradient text-luxe-obsidian font-bold py-2 rounded-xl text-xs uppercase tracking-wider shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
                                                        {savingHours ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                                                        SAVE SHIFT WORK HOURS
                                                    </button>
                                                </div>

                                                {/* Leaves Management */}
                                                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                                                    <div>
                                                        <h5 className="text-xs font-bold text-white uppercase tracking-wider">Leave Calendar & Planner</h5>
                                                        <p className="text-[10px] text-white/40 mt-0.5">Schedule leaves and check booking conflicts before setting dates</p>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                                                        <div className="sm:col-span-3">
                                                            <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5 block">Start Date</label>
                                                            <input type="date" value={profileLeaveStart} onChange={e => { setProfileLeaveStart(e.target.value); setProfileConflictsChecked(false); }}
                                                                min={new Date().toISOString().split('T')[0]}
                                                                className="w-full bg-white/5 border border-white/10 rounded-xl p-2 py-2 text-xs outline-none focus:border-luxe-gold/50 transition-all text-white cursor-pointer" />
                                                        </div>
                                                        <div className="sm:col-span-3">
                                                            <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5 block">End Date</label>
                                                            <input type="date" value={profileLeaveEnd} onChange={e => { setProfileLeaveEnd(e.target.value); setProfileConflictsChecked(false); }}
                                                                min={profileLeaveStart || new Date().toISOString().split('T')[0]}
                                                                className="w-full bg-white/5 border border-white/10 rounded-xl p-2 py-2 text-xs outline-none focus:border-luxe-gold/50 transition-all text-white cursor-pointer" />
                                                        </div>
                                                        <div className="sm:col-span-4">
                                                            <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5 block">Reason</label>
                                                            <select value={profileLeaveReason} onChange={e => setProfileLeaveReason(e.target.value)}
                                                                className="w-full bg-zinc-900 text-white border border-white/10 rounded-xl p-2 py-2 text-xs outline-none focus:border-luxe-gold/50 transition-all cursor-pointer">
                                                                <option value="Vacation">🏖️ Vacation</option>
                                                                <option value="Sick Leave">🤒 Sick Leave</option>
                                                                <option value="Personal">👤 Personal</option>
                                                                <option value="Training">📚 Training</option>
                                                                <option value="Other">📝 Other</option>
                                                            </select>
                                                        </div>
                                                        <div className="sm:col-span-2">
                                                            {!profileConflictsChecked && profileLeaveStart && profileLeaveEnd ? (
                                                                <button onClick={handleCheckProfileConflicts} disabled={loadingProfileConflicts}
                                                                    className="w-full bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 text-orange-400 font-bold py-2 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer">
                                                                    {loadingProfileConflicts ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                                                                    Check
                                                                </button>
                                                            ) : (
                                                                <button onClick={handleAddProfileLeave} disabled={saving || !profileLeaveStart || !profileLeaveEnd}
                                                                    className="w-full bg-gold-gradient text-luxe-obsidian font-bold py-2 rounded-xl text-xs uppercase tracking-wider hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer">
                                                                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarDays className="w-3.5 h-3.5" />}
                                                                    Set Leave
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Conflict Results in Unified Panel */}
                                                    {profileConflictsChecked && (
                                                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                                            {profileConflicts.length > 0 ? (
                                                                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                                                                    <p className="text-rose-400 font-bold text-xs flex items-center gap-1.5 mb-2">
                                                                        <AlertTriangle className="w-3.5 h-3.5" /> ⚠️ {profileConflicts.length} booking{profileConflicts.length > 1 ? 's' : ''} affected!
                                                                    </p>
                                                                    <div className="space-y-1.5 max-h-24 overflow-y-auto">
                                                                        {profileConflicts.map(c => (
                                                                            <div key={c.booking_id} className="flex justify-between items-center text-[10px] bg-black/25 rounded px-2.5 py-1.5 text-white/70">
                                                                                <span>{c.client_name} — {c.service_name}</span>
                                                                                <span className="text-white/40">{new Date(c.start_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                                                                    <p className="text-green-400 font-bold text-xs flex items-center gap-1.5">
                                                                        <CheckCircle2 className="w-3.5 h-3.5" /> No bookings affected. Safe to set leave.
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Existing Leaves List */}
                                                    <div className="border-t border-white/5 pt-3">
                                                        <h6 className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Scheduled Leaves</h6>
                                                        {profileLeaves.length === 0 ? (
                                                            <p className="text-[11px] text-white/30 py-2">No upcoming leave dates scheduled.</p>
                                                        ) : (
                                                            <div className="space-y-2 max-h-36 overflow-y-auto">
                                                                {profileLeaves.map(l => (
                                                                    <div key={l.id} className="flex items-center justify-between bg-white/[0.01] border border-white/5 rounded-xl px-3 py-2 text-xs">
                                                                        <div>
                                                                            <p className="font-bold text-white/70">
                                                                                {new Date(l.start_datetime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} — {new Date(l.end_datetime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                            </p>
                                                                            <p className="text-[9px] text-white/40 mt-0.5">{l.reason}</p>
                                                                        </div>
                                                                        <button onClick={() => handleCancelProfileLeave(l.id)}
                                                                            className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[9px] font-bold transition-all cursor-pointer">
                                                                            CANCEL
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                </div>

                                            </div>
                                        )}

                                    </div>
                                )}

                            </div>
                        </div>

                    </div>
                </div>
            )}
            {/* Hidden file input for photo upload — now opens crop modal */}
            <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && photoUploadStaff) {
                        openCropModal(file, photoUploadStaff);
                    }
                    e.target.value = '';
                }}
            />

            {/* ─── CROP / ZOOM MODAL ─── */}
            {showCropModal && cropSrc && (
                <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4">
                    <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                            <h3 className="font-bold text-white text-lg">Adjust Photo</h3>
                            <button onClick={() => { setShowCropModal(false); setCropSrc(null); }} className="text-white/40 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Crop preview area */}
                        <div className="p-6">
                            <p className="text-xs text-white/40 text-center mb-4 uppercase tracking-wider">Drag to reposition · Scroll or slider to zoom</p>
                            {/* Circle preview with drag */}
                            <div
                                className="relative mx-auto overflow-hidden cursor-grab active:cursor-grabbing select-none"
                                style={{ width: 280, height: 280, borderRadius: '50%', border: '3px solid #D4AF37', boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)' }}
                                onMouseDown={(e) => {
                                    setCropDragging(true);
                                    setCropDragStart({ x: e.clientX - cropOffset.x, y: e.clientY - cropOffset.y });
                                }}
                                onMouseMove={(e) => {
                                    if (!cropDragging) return;
                                    setCropOffset({ x: e.clientX - cropDragStart.x, y: e.clientY - cropDragStart.y });
                                }}
                                onMouseUp={() => setCropDragging(false)}
                                onMouseLeave={() => setCropDragging(false)}
                                onTouchStart={(e) => {
                                    setCropDragging(true);
                                    const t = e.touches[0];
                                    setCropDragStart({ x: t.clientX - cropOffset.x, y: t.clientY - cropOffset.y });
                                }}
                                onTouchMove={(e) => {
                                    if (!cropDragging) return;
                                    const t = e.touches[0];
                                    setCropOffset({ x: t.clientX - cropDragStart.x, y: t.clientY - cropDragStart.y });
                                }}
                                onTouchEnd={() => setCropDragging(false)}
                                onWheel={(e) => {
                                    e.preventDefault();
                                    setCropZoom(z => Math.min(3, Math.max(0.5, z - e.deltaY * 0.001)));
                                }}
                            >
                                <img
                                    src={cropSrc}
                                    alt="crop preview"
                                    draggable={false}
                                    style={{
                                        position: 'absolute',
                                        left: '50%',
                                        top: '50%',
                                        transform: `translate(calc(-50% + ${cropOffset.x}px), calc(-50% + ${cropOffset.y}px)) scale(${cropZoom})`,
                                        transformOrigin: 'center',
                                        maxWidth: 'none',
                                        transition: cropDragging ? 'none' : 'transform 0.1s',
                                        pointerEvents: 'none',
                                        width: 280,
                                        height: 280,
                                        objectFit: 'cover',
                                    }}
                                />
                            </div>

                            {/* Zoom slider */}
                            <div className="mt-6 flex items-center gap-3">
                                <span className="text-white/40 text-xs">−</span>
                                <input
                                    type="range"
                                    min="0.5" max="3" step="0.01"
                                    value={cropZoom}
                                    onChange={e => setCropZoom(parseFloat(e.target.value))}
                                    className="flex-1 h-2 accent-[#D4AF37] cursor-pointer"
                                />
                                <span className="text-white/40 text-xs">+</span>
                            </div>
                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={() => { setCropZoom(1); setCropOffset({ x: 0, y: 0 }); }}
                                    className="flex-1 py-2 rounded-xl border border-white/10 text-white/50 hover:text-white text-sm font-medium transition-all"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex gap-3 px-6 pb-6">
                            <button
                                onClick={() => { setShowCropModal(false); setCropSrc(null); }}
                                className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 hover:text-white font-bold transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCropConfirm}
                                className="flex-1 py-3 rounded-xl bg-[#D4AF37] text-black font-bold hover:bg-[#c9a227] transition-all flex items-center justify-center gap-2"
                            >
                                <Upload className="w-4 h-4" />
                                Use Photo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Photo uploading overlay */}
            {uploadingPhoto && (
                <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center">
                    <div className="bg-[#1E1E1E] border border-white/10 rounded-2xl p-8 text-center">
                        <Loader2 className="w-10 h-10 text-luxe-gold animate-spin mx-auto mb-3" />
                        <p className="text-white font-bold">Uploading photo...</p>
                    </div>
                </div>
            )}

            {/* Confirm Deactivation Modal */}
            <ConfirmModal
                open={!!deactivateTarget}
                title="Deactivate Stylist"
                message={`Are you sure you want to deactivate ${deactivateTarget?.full_name}? They will no longer be visible on your booking page, and their portal login will be blocked.`}
                confirmLabel="Deactivate"
                cancelLabel="Cancel"
                danger
                onConfirm={handleDeactivate}
                onCancel={() => setDeactivateTarget(null)}
            />

            {/* Confirm Permanent Delete Modal */}
            <ConfirmModal
                open={!!deleteTarget}
                title="Delete Stylist Permanently"
                message={`Are you sure you want to permanently delete ${deleteTarget?.full_name}? This action is irreversible. All their shift working hours and login profiles will be deleted.`}
                confirmLabel="Delete Permanently"
                cancelLabel="Cancel"
                danger
                loading={saving}
                onConfirm={handlePermanentDelete}
                onCancel={() => setDeleteTarget(null)}
            />

        </div>
    );
};

const PerformanceStat = ({ 
    label, 
    value, 
    trend, 
    icon: Icon, 
    color = 'indigo' 
}: { 
    label: string; 
    value: string; 
    trend: string; 
    icon: React.ElementType;
    color?: 'indigo' | 'emerald' | 'sky' | 'amber';
}) => {
    const theme = {
        indigo: {
            iconBg: 'bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 group-hover:text-indigo-300',
            glow: 'group-hover:shadow-[0_0_25px_rgba(99,102,241,0.08)] group-hover:border-indigo-500/30',
            trendText: 'text-indigo-400/80',
            trendBg: 'bg-indigo-500/5 border-indigo-500/10'
        },
        emerald: {
            iconBg: 'bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 group-hover:text-emerald-300',
            glow: 'group-hover:shadow-[0_0_25px_rgba(16,185,129,0.08)] group-hover:border-emerald-500/30',
            trendText: 'text-emerald-400/80',
            trendBg: 'bg-emerald-500/5 border-emerald-500/10'
        },
        sky: {
            iconBg: 'bg-sky-500/10 text-sky-400 group-hover:bg-sky-500/20 group-hover:text-sky-300',
            glow: 'group-hover:shadow-[0_0_25px_rgba(56,189,248,0.08)] group-hover:border-sky-500/30',
            trendText: 'text-sky-400/80',
            trendBg: 'bg-sky-500/5 border-sky-500/10'
        },
        amber: {
            iconBg: 'bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 group-hover:text-amber-300',
            glow: 'group-hover:shadow-[0_0_25px_rgba(245,158,11,0.08)] group-hover:border-amber-500/30',
            trendText: 'text-amber-400/80',
            trendBg: 'bg-amber-500/5 border-amber-500/10'
        }
    }[color];

    return (
        <div className={`glass-panel p-4 group transition-all duration-500 hover:scale-[1.02] hover:-translate-y-0.5 ${theme.glow}`}>
            <div className="flex items-center justify-between mb-2.5">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">{label}</p>
                <div className={`p-1.5 rounded-lg transition-all duration-300 ${theme.iconBg}`}>
                    <Icon className="w-3.5 h-3.5" />
                </div>
            </div>
            <p className="text-lg font-black text-white">{value}</p>
            <div className="flex">
                <span className={`text-[9px] mt-1 font-bold flex items-center gap-1 px-1.5 py-0.5 rounded-md border ${theme.trendText} ${theme.trendBg}`}>
                    {color !== 'amber' && <ArrowUpRight className="w-2.5 h-2.5" />} {trend}
                </span>
            </div>
        </div>
    );
};
