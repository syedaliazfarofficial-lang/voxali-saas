import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
    Plus, Clock, Scissors, Loader2, X, UserPlus, UserX,
    Calendar as CalendarIcon, ChevronLeft, ChevronRight, XCircle, CreditCard, Banknote, AlertTriangle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { showToast } from './ui/ToastNotification';

interface Staff { id: string; full_name: string; role: string; color: string; }
interface Service { id: string; name: string; duration: number; price: number; }
interface Booking {
    id: string; stylist_id: string; client_id: string; client_name: string; service_name: string;
    start_hour: number; duration_hours: number; status: string;
    start_time: string; date_label: string; price: number;
    is_gap_booking: boolean;
    deposit_amount: number; deposit_paid_amount: number; payment_status: string;
}

type ViewMode = 'today' | 'weekly' | 'monthly';

const timeSlots = Array.from({ length: 13 }, (_, i) => `${i + 8}:00`);

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    confirmed: { bg: 'bg-luxe-gold', text: 'text-luxe-obsidian', border: 'border-luxe-gold/50' },
    completed: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
    pending: { bg: 'bg-yellow-500/15', text: 'text-yellow-300', border: 'border-yellow-500/30' },
    checked_in: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
    in_progress: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
    cancelled: { bg: 'bg-red-500/10', text: 'text-red-400/60', border: 'border-red-500/20' },
    no_show: { bg: 'bg-red-500/10', text: 'text-red-300/60', border: 'border-red-500/20' },
    pending_deposit: { bg: 'bg-orange-500/15', text: 'text-orange-300', border: 'border-orange-500/30' },
};

// Helper: get date range based on view mode
function getDateRange(view: ViewMode, offset: number = 0): { start: Date; end: Date; label: string } {
    const now = new Date();
    if (view === 'today') {
        const target = new Date(now);
        target.setDate(target.getDate() + offset);
        const start = new Date(target); start.setHours(0, 0, 0, 0);
        const end = new Date(target); end.setHours(23, 59, 59, 999);
        return { start, end, label: target.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) };
    }
    if (view === 'weekly') {
        const target = new Date(now);
        target.setDate(target.getDate() + (offset * 7));
        const dayOfWeek = target.getDay();
        const start = new Date(target);
        start.setDate(target.getDate() - dayOfWeek);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const endLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return { start, end, label: `${startLabel} - ${endLabel}` };
    }
    // monthly
    const target = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const start = new Date(target.getFullYear(), target.getMonth(), 1);
    const end = new Date(target.getFullYear(), target.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end, label: target.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) };
}

// Helper: convert UTC time to salon timezone hour (for grid positioning)
function toSalonHour(isoString: string, tz: string): number {
    const dt = new Date(isoString);
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(dt);
    const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    return h + m / 60;
}

// Helper: format time in salon timezone as AM/PM
function toSalonTimeStr(isoString: string, tz: string): string {
    return new Date(isoString).toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true });
}

// Helper: format date label in salon timezone
function toSalonDateLabel(isoString: string, tz: string): string {
    return new Date(isoString).toLocaleDateString('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' });
}

export const BookingsCalendar: React.FC = () => {
    const { tenantId, timezone } = useTenant();
    const { staffId, isStaff } = useAuth();
    const [staff, setStaff] = useState<Staff[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('today');
    const [dateOffset, setDateOffset] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [refundMode, setRefundMode] = useState(false);
    const [refundMethod, setRefundMethod] = useState<'cash' | 'card' | 'stripe' | 'none'>('none');
    
    // Policy Refund State
    const [calculatedRefund, setCalculatedRefund] = useState<number>(0);
    const [refundReason, setRefundReason] = useState<string>('');
    const [isNoShow, setIsNoShow] = useState<boolean>(false);
    
    // Pending Refunds State
    const [showPendingRefunds, setShowPendingRefunds] = useState<boolean>(false);
    const [pendingRefunds, setPendingRefunds] = useState<Booking[]>([]);

    // Walk-in form
    const [wName, setWName] = useState('');
    const [wPhone, setWPhone] = useState('');
    
    // Get current time in salon's timezone
    const getSalonTime = () => {
        const tz = timezone || 'America/New_York';
        const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
        const h = parts.find(p => p.type === 'hour')?.value || '12';
        const m = parts.find(p => p.type === 'minute')?.value || '00';
        return `${h}:${m}`;
    };

    interface WServiceItem {
        id: string; // unique local ID
        serviceId: string;
        stylistId: string;
        startTime: string;
        endTime: string;
        guestName: string; // optional for group bookings
    }
    
    const [wServiceItems, setWServiceItems] = useState<WServiceItem[]>([
        { id: 'initial-1', serviceId: '', stylistId: '', startTime: getSalonTime(), endTime: '', guestName: '' }
    ]);

    // Walk-in recurrence
    const [wRecurring, setWRecurring] = useState('none');
    const [wRecurringCount, setWRecurringCount] = useState(4);

    const fetchData = useCallback(async (showLoader = true) => {
        if (!tenantId) return;
        if (showLoader) setLoading(true);

        // Fetch staff
        const { data: staffData } = await supabase
            .from('staff').select('id, full_name, role, color')
            .eq('tenant_id', tenantId).eq('is_active', true).order('created_at');

        // Fetch services
        const { data: svcData } = await supabase
            .from('services').select('id, name, duration, price')
            .eq('tenant_id', tenantId).eq('is_active', true).order('name');

        // Fetch global pending refunds (regardless of date range)
        let pendingQ = supabase
            .from('bookings').select(`
                id, stylist_id, client_id, status, start_time, end_time, total_price, is_gap_booking,
                deposit_amount, deposit_paid_amount, payment_status,
                clients(name), services(name)
            `)
            .eq('tenant_id', tenantId)
            .in('status', ['cancelled', 'no_show'])
            .gt('deposit_paid_amount', 0)
            .neq('payment_status', 'refunded')
            .order('start_time', { ascending: false });

        if (isStaff && staffId) {
            pendingQ = pendingQ.eq('stylist_id', staffId);
        }
        
        const { data: globalPendingData } = await pendingQ;
        if (globalPendingData) {
            const tz = timezone || 'America/Chicago';
            setPendingRefunds(globalPendingData.map((b: any) => {
                const startDt = new Date(b.start_time);
                const endDt = new Date(b.end_time);
                return {
                    id: b.id,
                    stylist_id: b.stylist_id,
                    client_id: b.client_id,
                    client_name: b.clients?.name || 'Walk-in',
                    service_name: b.services?.name || 'Service',
                    start_hour: toSalonHour(b.start_time, tz),
                    duration_hours: (endDt.getTime() - startDt.getTime()) / 3600000,
                    status: b.status,
                    start_time: b.start_time,
                    date_label: toSalonDateLabel(b.start_time, tz),
                    price: b.total_price || 0,
                    is_gap_booking: b.is_gap_booking || false,
                    deposit_amount: b.deposit_amount || 0,
                    deposit_paid_amount: b.deposit_paid_amount || 0,
                    payment_status: b.payment_status || 'unpaid',
                };
            }));
        }

        // Fetch bookings for the selected date range
        const { start, end } = getDateRange(viewMode, dateOffset);
        const { data: bookData } = await supabase
            .from('bookings').select(`
                id, stylist_id, client_id, status, start_time, end_time, total_price, is_gap_booking,
                deposit_amount, deposit_paid_amount, payment_status,
                clients(name), services(name)
            `)
            .eq('tenant_id', tenantId)
            .gte('start_time', start.toISOString())
            .lte('start_time', end.toISOString())
            .order('start_time');

        // RBAC: Staff users only see their own bookings
        if (isStaff && staffId) {
            const { data: filteredData } = await supabase
                .from('bookings').select(`
                    id, stylist_id, client_id, status, start_time, end_time, total_price, is_gap_booking,
                    deposit_amount, deposit_paid_amount, payment_status,
                    clients(name), services(name)
                `)
                .eq('tenant_id', tenantId)
                .eq('stylist_id', staffId)
                .gte('start_time', start.toISOString())
                .lte('start_time', end.toISOString())
                .order('start_time');
            if (filteredData) {
                const tz = timezone || 'America/Chicago';
                setBookings(filteredData.map((b: any) => {
                    const startDt = new Date(b.start_time);
                    const endDt = new Date(b.end_time);
                    return {
                        id: b.id,
                        stylist_id: b.stylist_id,
                        client_id: b.client_id,
                        client_name: b.clients?.name || 'Walk-in',
                        service_name: b.services?.name || 'Service',
                        start_hour: toSalonHour(b.start_time, tz),
                        duration_hours: (endDt.getTime() - startDt.getTime()) / 3600000,
                        status: b.status,
                        start_time: b.start_time,
                        date_label: toSalonDateLabel(b.start_time, tz),
                        price: b.total_price || 0,
                        is_gap_booking: b.is_gap_booking || false,
                        deposit_amount: b.deposit_amount || 0,
                        deposit_paid_amount: b.deposit_paid_amount || 0,
                        payment_status: b.payment_status || 'unpaid',
                    };
                }));
            }
            if (staffData) setStaff(staffData);
            if (svcData) setServices(svcData);
            setLoading(false);
            return;
        }

        if (staffData) setStaff(staffData);
        if (svcData) setServices(svcData);
        if (bookData) {
            const tz = timezone || 'America/Chicago';
            setBookings(bookData.map((b: any) => {
                const startDt = new Date(b.start_time);
                const endDt = new Date(b.end_time);
                return {
                    id: b.id,
                    stylist_id: b.stylist_id,
                    client_id: b.client_id,
                    client_name: b.clients?.name || 'Walk-in',
                    service_name: b.services?.name || 'Service',
                    start_hour: toSalonHour(b.start_time, tz),
                    duration_hours: (endDt.getTime() - startDt.getTime()) / 3600000,
                    status: b.status,
                    start_time: b.start_time,
                    date_label: toSalonDateLabel(b.start_time, tz),
                    price: b.total_price || 0,
                    is_gap_booking: b.is_gap_booking || false,
                    deposit_amount: b.deposit_amount || 0,
                    deposit_paid_amount: b.deposit_paid_amount || 0,
                    payment_status: b.payment_status || 'unpaid',
                };
            }));
        }
        setLoading(false);
    }, [viewMode, dateOffset, isStaff, staffId, tenantId, timezone]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Auto-calc end time when service or start time changes
    const calcEndTime = (start: string, dur: number) => {
        const [h, m] = start.split(':').map(Number);
        const total = h * 60 + m + dur;
        return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    };

    const updateServiceItem = (id: string, field: keyof WServiceItem, value: string) => {
        setWServiceItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            const updated = { ...item, [field]: value };
            
            // Auto calculate end time
            if (field === 'serviceId' || field === 'startTime') {
                const svc = services.find(s => s.id === updated.serviceId);
                if (svc && updated.startTime) {
                    updated.endTime = calcEndTime(updated.startTime, svc.duration);
                }
            }
            return updated;
        }));
    };

    const addServiceItem = () => {
        const lastItem = wServiceItems[wServiceItems.length - 1];
        setWServiceItems(prev => [...prev, {
            id: Math.random().toString(36).substr(2, 9),
            serviceId: '',
            stylistId: '',
            startTime: lastItem?.endTime || getSalonTime(),
            endTime: '',
            guestName: ''
        }]);
    };

    const removeServiceItem = (id: string) => {
        // ensure at least 1 item
        if (wServiceItems.length > 1) {
            setWServiceItems(prev => prev.filter(item => item.id !== id));
        }
    };

    const isFormValid = wName.trim() !== '' && wPhone.trim() !== '' && 
                        wServiceItems.length > 0 && 
                        wServiceItems.every(i => i.serviceId && i.stylistId && i.startTime && i.endTime);

    const constructISOInTz = (dateStr: string, timeStr: string, tz: string) => {
        // 1. Create a date object from the parts as if they were UTC
        const dt = new Date(`${dateStr}T${timeStr}:00Z`);
        
        // 2. Find the offset of the target timezone at that UTC moment
        // formatToParts with timeZoneName: 'longOffset' gives "GMT-05:00"
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            timeZoneName: 'longOffset'
        }).formatToParts(dt);
        
        const offsetPart = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT+00:00';
        const offset = offsetPart.replace('GMT', ''); // e.g. "-05:00" or "+05:30"
        
        // 3. Return a combined ISO string with the explicit offset
        // This tells Postgres: "This is 19:00 in -05:00 timezone"
        return `${dateStr}T${timeStr}:00${offset}`;
    };

    const handleWalkin = async () => {
        if (!isFormValid) return;
        setSaving(true);

        try {
            const tz = timezone || 'America/New_York';
            const today = new Date().toLocaleDateString('en-CA', { timeZone: tz });

            // Prepare all booking objects to insert
            const bookingsToInsert = [];
            
            // 0. Pre-validate conflicts
            for (let i = 0; i < wServiceItems.length; i++) {
                const item = wServiceItems[i];
                const svc = services.find(s => s.id === item.serviceId);
                const st = staff.find(s => s.id === item.stylistId);
                if (!svc || !st) throw new Error("Invalid service or stylist selection.");

                const startISO = constructISOInTz(today, item.startTime, tz);
                const endISO = constructISOInTz(today, item.endTime, tz);

                // Check Shift Hours
                const dayOfWeek = new Date(`${today}T00:00:00`).getDay();
                const { data: workingH } = await supabase
                    .from('staff_working_hours')
                    .select('start_time, end_time')
                    .eq('tenant_id', tenantId)
                    .eq('staff_id', item.stylistId)
                    .eq('day_of_week', dayOfWeek)
                    .maybeSingle();

                if (!workingH) {
                    throw new Error(`${st.full_name} is OFF on this day.`);
                }

                const reqStart = item.startTime + ':00';
                const reqEnd = item.endTime + ':00';
                if (reqStart < workingH.start_time || reqEnd > workingH.end_time) {
                    throw new Error(`${st.full_name} works from ${workingH.start_time.substring(0,5)} to ${workingH.end_time.substring(0,5)}. Requested time is out of shift.`);
                }

                // Check Leaves
                const { data: leaves } = await supabase
                    .from('staff_leaves')
                    .select('id, reason')
                    .eq('tenant_id', tenantId)
                    .eq('staff_id', item.stylistId)
                    .lte('start_date', today)
                    .gte('end_date', today);
                
                if (leaves && leaves.length > 0) {
                     throw new Error(`${st.full_name} is on Leave/Vacation (${leaves[0].reason || 'Off'}) on ${new Date(today).toLocaleDateString()}.`);
                }

                // Check conflict: overlaps if existing.start < new.end AND existing.end > new.start
                const { data: conflicts } = await supabase
                    .from('bookings')
                    .select('id')
                    .eq('tenant_id', tenantId)
                    .eq('stylist_id', item.stylistId)
                    .neq('status', 'cancelled')
                    .lt('start_time', endISO)
                    .gt('end_time', startISO);

                if (conflicts && conflicts.length > 0) {
                    throw new Error(`Conflict: ${st.full_name} is already booked between ${item.startTime} and ${item.endTime}.`);
                }

                bookingsToInsert.push({
                    tenant_id: tenantId,
                    stylist_id: item.stylistId,
                    service_id: item.serviceId,
                    start_time: startISO,
                    end_time: endISO,
                    total_price: svc.price,
                    status: 'confirmed',
                    is_recurring: wRecurring !== 'none',
                    parent_booking_id: null,
                    // Temporary field for local use, we will inject client_id later
                    _guestName: item.guestName 
                });
            }

            // Step 1: Upsert primary client
            const { data: existingClient } = await supabase
                .from('clients')
                .select('id')
                .eq('tenant_id', tenantId)
                .eq('phone', wPhone)
                .maybeSingle();

            let clientId: string;
            if (existingClient) {
                clientId = existingClient.id;
            } else {
                const { data: newClient, error: clientErr } = await supabase
                    .from('clients')
                    .insert({ tenant_id: tenantId, name: wName, phone: wPhone })
                    .select('id')
                    .single();
                if (clientErr || !newClient) throw new Error(clientErr?.message || 'Failed to create client');
                clientId = newClient.id;
            }

            // Step 2: Insert initial bookings
            // If they entered a guestName, we can append it conceptually, but for now they all link to the same client_id
            const finalBookings = bookingsToInsert.map(b => {
                const { _guestName, ...rest } = b as any;
                return { 
                    ...rest, 
                    client_id: clientId,
                    notes: _guestName ? `Guest: ${_guestName}` : `Walk-in: ${wName}`
                };
            });

            const { data: insertedBookings, error: firstErr } = await supabase
                .from('bookings')
                .insert(finalBookings)
                .select('id');

            if (firstErr || !insertedBookings) throw new Error(firstErr?.message || 'Failed to create booking(s)');

            // Step 3: Insert future occurrences if recurring (only support basic recurrence for the whole group)
            if (wRecurring !== 'none' && wRecurringCount > 1 && insertedBookings.length > 0) {
                const futureBookings = [];
                for (let k = 0; k < finalBookings.length; k++) {
                    const baseStartDt = new Date(finalBookings[k].start_time);
                    const baseEndDt = new Date(finalBookings[k].end_time);
                    
                    for (let i = 1; i < wRecurringCount; i++) {
                        const nextStart = new Date(baseStartDt);
                        const nextEnd = new Date(baseEndDt);
                        if (wRecurring === 'weekly') {
                            nextStart.setDate(nextStart.getDate() + (i * 7));
                            nextEnd.setDate(nextEnd.getDate() + (i * 7));
                        } else if (wRecurring === 'biweekly') {
                            nextStart.setDate(nextStart.getDate() + (i * 14));
                            nextEnd.setDate(nextEnd.getDate() + (i * 14));
                        } else if (wRecurring === 'monthly') {
                            nextStart.setMonth(nextStart.getMonth() + i);
                            nextEnd.setMonth(nextEnd.getMonth() + i);
                        }
                        const nextDateLabel = nextStart.toLocaleDateString('en-CA', { timeZone: tz });
                        futureBookings.push({
                            ...finalBookings[k],
                            start_time: constructISOInTz(nextDateLabel, wServiceItems[k].startTime, tz),
                            end_time: constructISOInTz(nextDateLabel, wServiceItems[k].endTime, tz),
                            parent_booking_id: insertedBookings[k].id
                        });
                    }
                }
                
                if (futureBookings.length > 0) {
                    const { error: batchErr } = await supabase.from('bookings').insert(futureBookings);
                    if (batchErr) throw new Error("Future bookings partially failed: " + batchErr.message);
                }
            }

            // Success
            showToast(wRecurring === 'none' ? 'Booking(s) confirmed!' : `Booked ${wRecurringCount} recurring appointments!`);
            setShowModal(false);
            setWName(''); setWPhone(''); 
            setWServiceItems([{ id: 'initial-1', serviceId: '', stylistId: '', startTime: getSalonTime(), endTime: '', guestName: '' }]);
            setWRecurring('none'); setWRecurringCount(4);
            fetchData();
        } catch (err: any) {
            showToast(err.message || 'Failed', 'error');
        }
        setSaving(false);
    };

    const initiateCancelRefund = async (noShow: boolean) => {
        if (!selectedBooking) return;
        setIsNoShow(noShow);
        setSaving(true);
        try {
            const { data: policy } = await supabase
                .from('tenants')
                .select('cancellation_window_hours, late_cancel_refund_percent, no_show_refund_percent')
                .eq('id', tenantId)
                .single();

            const cancelWindow = policy?.cancellation_window_hours ?? 24;
            const lateRefundPercent = policy?.late_cancel_refund_percent ?? 50;
            const noShowRefundPercent = policy?.no_show_refund_percent ?? 0;

            const paidAmount = selectedBooking.status === 'completed' ? selectedBooking.price : selectedBooking.deposit_paid_amount;
            
            if (paidAmount <= 0) {
                setCalculatedRefund(0);
                setRefundReason('No payments recorded. Cancellation is free.');
            } else {
                if (noShow) {
                    setCalculatedRefund((paidAmount * noShowRefundPercent) / 100);
                    setRefundReason(`No-Show Policy: ${noShowRefundPercent}% refund allowed.`);
                } else {
                    const now = new Date();
                    const appt = new Date(selectedBooking.start_time);
                    const hoursBefore = (appt.getTime() - now.getTime()) / (1000 * 60 * 60);

                    if (hoursBefore < cancelWindow) {
                        setCalculatedRefund((paidAmount * lateRefundPercent) / 100);
                        setRefundReason(`Late cancellation (within ${cancelWindow} hrs). Policy: ${lateRefundPercent}% refund.`);
                    } else {
                        setCalculatedRefund(paidAmount);
                        setRefundReason(`Free cancellation window (more than ${cancelWindow} hrs before). Policy: 100% refund.`);
                    }
                }
            }
            setRefundMode(true);
        } catch (err: any) {
            showToast(err.message, 'error');
        }
        setSaving(false);
    };

    const handleImmediateCancel = async (noShow: boolean) => {
        if (!selectedBooking) return;
        setSaving(true);
        try {
            const finalStatus = noShow ? 'no_show' : 'cancelled';
            const { error: updateErr } = await supabase
                .from('bookings')
                .update({ status: finalStatus })
                .eq('id', selectedBooking.id);
            if (updateErr) throw updateErr;

            showToast(`Booking marked as ${finalStatus.replace('_', ' ')}. ${selectedBooking.deposit_paid_amount > 0 ? "Check Pending Refunds." : ""}`);
            setSelectedBooking(null);
            fetchData(false);
        } catch (err: any) {
            showToast(err.message, 'error');
        }
        setSaving(false);
    };

    const handleCancelRefund = async () => {
        if (!selectedBooking) return;
        setSaving(true);
        try {
            const finalStatus = (selectedBooking.status === 'cancelled' || selectedBooking.status === 'no_show') 
                ? selectedBooking.status 
                : (isNoShow ? 'no_show' : 'cancelled');

            // Update booking status
            const { error: updateErr } = await supabase
                .from('bookings')
                .update({ 
                    status: finalStatus,
                    payment_status: (calculatedRefund > 0 && refundMethod !== 'none') || calculatedRefund === 0 
                                     ? 'refunded' 
                                     : selectedBooking.payment_status
                })
                .eq('id', selectedBooking.id);
            if (updateErr) throw updateErr;

            // Handle refund to payments table using calculated amount
            if (calculatedRefund > 0 && refundMethod !== 'none') {
                const { error: payErr } = await supabase
                    .from('payments')
                    .insert({
                         tenant_id: tenantId,
                         booking_id: selectedBooking.id,
                         amount: -calculatedRefund,
                         payment_method: refundMethod === 'cash' ? 'cash' : 'card',
                         status: 'refunded'
                    });
                if (payErr) throw payErr;
            }

            showToast(`Booking marked as ${finalStatus.replace('_', ' ')}. ${calculatedRefund > 0 && refundMethod !== 'none' ? `$${calculatedRefund} refunded via ${refundMethod}.` : ''}`);
            setSelectedBooking(null);
            setRefundMode(false);
            setRefundMethod('none');
            fetchData(false);
        } catch (err: any) {
             showToast(err.message, 'error');
        }
        setSaving(false);
    };

    // Status cycling: confirmed → checked_in → completed
    // pending_deposit CANNOT advance (must pay first)
    const STATUS_FLOW: Record<string, string> = {
        pending: 'confirmed',
        confirmed: 'checked_in',
        checked_in: 'completed',
    };
    const handleStatusCycle = async (booking: Booking) => {
        const currentStatus = booking.status;
        if (currentStatus === 'pending_deposit') {
            showToast('Deposit payment required before advancing', 'error');
            return;
        }
        const nextStatus = STATUS_FLOW[currentStatus];
        if (!nextStatus) return; // completed or unknown — no next status

        // === LOYALTY PROGRAM & FEEDBACK EMAIL: on completion ===
        if (nextStatus === 'completed' && booking.client_id) {
            try {
                // Get tenant's multiplier
                const { data: tenant } = await supabase.from('tenants').select('loyalty_points_multiplier').eq('id', tenantId).single();
                const multiplier = tenant?.loyalty_points_multiplier || 1.0;
                const pointsEarned = Math.floor(booking.price * multiplier);

                // Fetch client details for both loyalty and notifications
                const { data: clientData } = await supabase.from('clients').select('loyalty_points, name, email, phone').eq('id', booking.client_id).single();

                if (clientData) {
                    // Update points if earned
                    if (pointsEarned > 0) {
                        const currentPoints = clientData.loyalty_points || 0;
                        await supabase.from('clients').update({ loyalty_points: currentPoints + pointsEarned }).eq('id', booking.client_id);
                        showToast(`🎉 Client earned ${pointsEarned} loyalty points!`);
                    }

                    // Trigger for feedback/reviews is automatically handled by the Supabase DB Webhook
                    // when the booking status updates to 'completed'. No manual insert needed.
                }
            } catch (err) {
                console.error("Failed to assign loyalty points or trigger feedback email", err);
            }
        }

        const { error } = await supabase
            .from('bookings')
            .update({ status: nextStatus })
            .eq('id', booking.id);
            
        if (!error) {
            if (nextStatus !== ' completed') showToast(`Status → ${nextStatus.replace('_', ' ')}`);
            fetchData(false); // Background fetch without resetting scroll
        } else {
            showToast('Failed: ' + error.message, 'error');
        }
    };

    // Group bookings by date for list view
    const bookingsByDate = bookings.reduce<Record<string, Booking[]>>((acc, b) => {
        const key = b.date_label;
        if (!acc[key]) acc[key] = [];
        acc[key].push(b);
        return acc;
    }, {});

    const { label: rangeLabel } = getDateRange(viewMode, dateOffset);
    // For staff users, show only their column; for owners/managers show up to 5
    const displayStaff = isStaff && staffId
        ? staff.filter(s => s.id === staffId)
        : staff.slice(0, 5);
    // Fix: use staff_id instead of stylist_id for filtering

    if (loading) {
        return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-luxe-gold animate-spin" /></div>;
    }

    return (
        <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500 overflow-hidden">


            {/* Header with View Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    {/* View Mode Tabs */}
                    <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10">
                        {(['today', 'weekly', 'monthly'] as ViewMode[]).map(mode => (
                            <button
                                key={mode}
                                onClick={() => { setViewMode(mode); setDateOffset(0); }}
                                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${viewMode === mode
                                    ? 'bg-luxe-gold text-luxe-obsidian shadow-lg'
                                    : 'text-white/50 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                    {pendingRefunds.length > 0 && (
                        <button
                            onClick={() => setShowPendingRefunds(true)}
                            className="bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold px-4 py-2 rounded-xl text-xs uppercase hover:bg-amber-500/20 transition-all flex items-center gap-2 animate-pulse shadow-[0_0_15px_rgba(251,191,36,0.2)]"
                            title="Action Required: Pending Refunds"
                        >
                            <AlertTriangle className="w-4 h-4" />
                            {pendingRefunds.length} PENDING REFUND{pendingRefunds.length !== 1 ? 'S' : ''}
                        </button>
                    )}
                    {/* Date Navigation */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setDateOffset(prev => prev - 1)}
                            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
                            title="Previous"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        {dateOffset !== 0 && (
                            <button
                                onClick={() => setDateOffset(0)}
                                className="px-3 py-1 rounded-lg bg-luxe-gold/20 border border-luxe-gold/30 text-luxe-gold text-xs font-bold hover:bg-luxe-gold/30 transition-all"
                            >
                                Today
                            </button>
                        )}
                        <button
                            onClick={() => setDateOffset(prev => prev + 1)}
                            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
                            title="Next"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                    {/* Date Label */}
                    <span className="text-sm text-white/40 font-medium hidden md:block">{rangeLabel}</span>
                </div>
                <div className="flex items-center gap-3">
                    {/* Walk-in button: hidden for staff */}
                    {!isStaff && (
                        <button
                            onClick={() => setShowModal(true)}
                            className="bg-gold-gradient text-luxe-obsidian px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            <Plus className="w-5 h-5" />
                            <span className="text-sm">ADD WALK-IN</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Calendar Grid (Today View) */}
            {viewMode === 'today' && (
                <div className="flex-1 glass-panel border border-white/5 flex flex-col overflow-hidden relative">
                    {/* Staff Header */}
                    <div className="grid border-b border-white/5 bg-white/5" style={{ gridTemplateColumns: `80px repeat(${displayStaff.length}, 1fr)` }}>
                        <div className="p-4 border-r border-white/5 flex items-center justify-center">
                            <Clock className="w-4 h-4 text-white/20" />
                        </div>
                        {displayStaff.map(s => (
                            <div key={s.id} className="p-4 border-r border-white/5 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold" style={{ color: s.color }}>
                                    {s.full_name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold truncate">{s.full_name.split(' ')[0]}</p>
                                    <p className="text-[9px] text-white/30 uppercase tracking-tighter truncate">{s.role}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Scrollable Grid */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar relative">
                        <div className="relative" style={{ gridTemplateColumns: `80px repeat(${displayStaff.length}, 1fr)`, display: 'grid' }}>
                            <div className="flex flex-col">
                                {timeSlots.map(time => (
                                    <div key={time} className="h-20 border-r border-b border-white/5 flex items-start justify-center pt-2">
                                        <span className="text-[10px] font-bold text-white/20 uppercase tracking-tighter">{time}</span>
                                    </div>
                                ))}
                            </div>
                            {displayStaff.map(s => (
                                <div key={s.id} className="relative border-r border-white/5 min-h-full">
                                    {timeSlots.map(time => (
                                        <div key={time} className="h-20 border-b border-white/5 w-full pointer-events-none" />
                                    ))}
                                    {bookings.filter(b => b.stylist_id === s.id).map(b => {
                                        const colors = statusColors[b.status] || statusColors.pending;
                                        const isCancelled = b.status === 'cancelled';
                                        return (
                                            <div
                                                key={b.id}
                                                onClick={() => setSelectedBooking(b)}
                                                className={`absolute left-1 right-1 rounded-xl p-3 border shadow-2xl transition-all hover:scale-[1.02] cursor-pointer group z-10 ${colors.bg} ${colors.text} ${colors.border} ${isCancelled ? 'opacity-45 line-through' : ''}`}
                                                style={{
                                                    top: `${(b.start_hour - 8) * 80}px`,
                                                    height: `${Math.max(b.duration_hours * 80, 40)}px`
                                                }}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="min-w-0">
                                                        <p className="text-[11px] font-black uppercase tracking-tight truncate">{b.client_name}</p>
                                                        <p className="text-[10px] font-bold mt-0.5 truncate opacity-70">{b.service_name}</p>
                                                    </div>
                                                    <Scissors className="w-3 h-3 opacity-40" />
                                                </div>
                                                <div className="mt-auto pt-1 flex items-center justify-between">
                                                    <span className="text-[9px] font-bold opacity-50">
                                                        {toSalonTimeStr(b.start_time, timezone || 'America/Chicago')}
                                                    </span>
                                                    <span className="text-[8px] font-bold uppercase opacity-60">{b.status.replace('_', ' ')}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* List View (Weekly / Monthly) */}
            {(viewMode === 'weekly' || viewMode === 'monthly') && (
                <div className="flex-1 glass-panel border border-white/5 overflow-y-auto custom-scrollbar p-6 space-y-6">
                    {Object.keys(bookingsByDate).length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-white/30">
                            <CalendarIcon className="w-12 h-12 mb-3 opacity-30" />
                            <p className="text-sm font-bold">No bookings found for this period</p>
                        </div>
                    ) : (
                        Object.entries(bookingsByDate).map(([dateLabel, dayBookings]) => (
                            <div key={dateLabel}>
                                {/* Day Header */}
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-2 h-2 rounded-full bg-luxe-gold" />
                                    <h4 className="text-sm font-bold text-luxe-gold uppercase tracking-wider">{dateLabel}</h4>
                                    <span className="text-xs text-white/30 font-medium">{dayBookings.length} booking{dayBookings.length !== 1 ? 's' : ''}</span>
                                    <div className="flex-1 h-px bg-white/5" />
                                </div>
                                {/* Booking Cards */}
                                <div className="space-y-2">
                                    {dayBookings.map(b => {
                                        const colors = statusColors[b.status] || statusColors.pending;
                                        const isCancelled = b.status === 'cancelled';
                                        const tz = timezone || 'America/Chicago';
                                        const timeStr = toSalonTimeStr(b.start_time, tz);
                                        const stylist = staff.find(s => s.id === b.stylist_id);
                                        return (
                                            <div 
                                                key={b.id} 
                                                onClick={(e) => {
                                                    if ((e.target as HTMLElement).tagName.toLowerCase() !== 'span') {
                                                        setSelectedBooking(b);
                                                    }
                                                }}
                                                className={`flex items-center gap-4 p-4 rounded-xl border transition-all hover:bg-white/5 cursor-pointer ${colors.border} bg-white/[0.02] ${isCancelled ? 'opacity-45 line-through' : ''}`}
                                            >
                                                <div className="w-14 text-center shrink-0">
                                                    <p className="text-sm font-black text-white/70">{timeStr}</p>
                                                </div>
                                                {/* Divider */}
                                                <div className={`w-1 h-10 rounded-full ${colors.bg}`} />
                                                {/* Details */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold truncate">{b.client_name}</p>
                                                    <p className="text-xs text-white/40 truncate">{b.service_name}</p>
                                                </div>
                                                {/* Stylist */}
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <div
                                                        className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold"
                                                        style={{ color: stylist?.color || '#999' }}
                                                    >
                                                        {stylist?.full_name?.charAt(0) || '?'}
                                                    </div>
                                                    <span className="text-xs text-white/40 hidden lg:block">{stylist?.full_name?.split(' ')[0] || '—'}</span>
                                                </div>
                                                {/* Price */}
                                                <div className="text-right shrink-0 w-14">
                                                    <p className="text-sm font-bold text-luxe-gold">${b.price}</p>
                                                </div>
                                                {/* Status Badge */}
                                                <span
                                                    onClick={() => handleStatusCycle(b)}
                                                    title={
                                                        b.status === 'pending_deposit' ? 'Deposit required — cannot advance'
                                                            : STATUS_FLOW[b.status] ? `Click → ${STATUS_FLOW[b.status].replace('_', ' ')}`
                                                                : 'Final status'
                                                    }
                                                    className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg shrink-0 ${colors.bg} ${colors.text} ${b.status !== 'pending_deposit' && STATUS_FLOW[b.status] ? 'cursor-pointer hover:opacity-80 transition-opacity' : b.status === 'pending_deposit' ? 'cursor-not-allowed opacity-70' : ''
                                                        }`}
                                                >
                                                    {b.status.replace('_', ' ')}
                                                </span>
                                                {/* Smart Payment Badges */}
                                                {(() => {
                                                    const isWalkin = b.client_name === 'Walk-in';
                                                    const hasDeposit = b.deposit_amount > 0;
                                                    const depositPaid = b.deposit_paid_amount > 0;
                                                    const remaining = b.price - (b.deposit_paid_amount || 0);
                                                    const isCompleted = b.status === 'completed';

                                                    if (isWalkin && !hasDeposit) {
                                                        // Walk-in without deposit
                                                        return (
                                                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg shrink-0 bg-orange-500/15 text-orange-300 border border-orange-500/30">
                                                                🚶 Walk-in
                                                            </span>
                                                        );
                                                    }

                                                    if (!hasDeposit) {
                                                        // No deposit required — show total only
                                                        return (
                                                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg shrink-0 bg-luxe-gold/10 text-luxe-gold border border-luxe-gold/20">
                                                                ${b.price}
                                                            </span>
                                                        );
                                                    }

                                                    if (isCompleted) {
                                                        // Completed — show full paid
                                                        return (
                                                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg shrink-0 bg-green-500/15 text-green-300 border border-green-500/30">
                                                                ✓ ${b.price} Paid
                                                            </span>
                                                        );
                                                    }

                                                    if (depositPaid) {
                                                        // Deposit paid — show paid + remaining
                                                        return (
                                                            <>
                                                                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg shrink-0 bg-green-500/15 text-green-300 border border-green-500/30">
                                                                    ✓ ${b.deposit_paid_amount} Paid
                                                                </span>
                                                                {remaining > 0 && (
                                                                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg shrink-0 bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">
                                                                        ${remaining} Due
                                                                    </span>
                                                                )}
                                                            </>
                                                        );
                                                    }

                                                    // Deposit required but not paid
                                                    return (
                                                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg shrink-0 bg-red-500/15 text-red-300 border border-red-500/30">
                                                            ⏳ ${b.deposit_amount} Due
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-2">
                <div className="glass-panel p-4 text-center">
                    <p className="text-[10px] text-white/40 uppercase font-bold mb-1">Total</p>
                    <p className="text-xl font-black text-luxe-gold">{bookings.length}</p>
                </div>
                <div className="glass-panel p-4 text-center">
                    <p className="text-[10px] text-white/40 uppercase font-bold mb-1">Confirmed</p>
                    <p className="text-xl font-black text-green-400">{bookings.filter(b => b.status === 'confirmed').length}</p>
                </div>
                <div className="glass-panel p-4 text-center">
                    <p className="text-[10px] text-white/40 uppercase font-bold mb-1">Pending</p>
                    <p className="text-xl font-black text-yellow-400">{bookings.filter(b => b.status === 'pending' || b.status === 'pending_deposit').length}</p>
                </div>
                <div className="glass-panel p-4 text-center">
                    <p className="text-[10px] text-white/40 uppercase font-bold mb-1">Completed</p>
                    <p className="text-xl font-black text-blue-400">{bookings.filter(b => b.status === 'completed').length}</p>
                </div>
            </div>

            {/* Walk-in Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-luxe-obsidian border border-white/10 rounded-2xl p-8 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <UserPlus className="w-6 h-6 text-luxe-gold" />
                                Add Walk-in Customer
                            </h3>
                            <button onClick={() => setShowModal(false)} title="Close" className="p-2 hover:bg-white/10 rounded-xl transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Client Name *</label>
                                <input
                                    value={wName} onChange={e => setWName(e.target.value)}
                                    placeholder="e.g. Jessica Martinez"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Phone Number *</label>
                                <input
                                    value={wPhone} onChange={e => setWPhone(e.target.value)}
                                    placeholder="+1 555-0101"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all"
                                />
                            </div>
                            {/* Service Items Custom Array Mapping */}
                            <div className="space-y-4 mt-6">
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider block border-b border-white/10 pb-2">Requested Services / Guests</label>
                                
                                {wServiceItems.map((item, index) => (
                                    <div key={item.id} className="bg-white/5 border border-white/10 rounded-xl p-4 relative group">
                                        {wServiceItems.length > 1 && (
                                            <button onClick={() => removeServiceItem(item.id)} title="Remove Service" className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 shadow-xl transition-all">
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                                            <div>
                                                <label className="text-[10px] font-bold text-white/40 uppercase mb-1 block">Service *</label>
                                                <select 
                                                    value={item.serviceId} 
                                                    onChange={e => updateServiceItem(item.id, 'serviceId', e.target.value)} 
                                                    title="Select service"
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs outline-none focus:border-luxe-gold/50"
                                                >
                                                    <option value="">Select service...</option>
                                                    {services.map(s => <option key={s.id} value={s.id}>{s.name} — ${s.price} ({s.duration}m)</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-white/40 uppercase mb-1 block">Stylist *</label>
                                                <select 
                                                    value={item.stylistId} 
                                                    onChange={e => updateServiceItem(item.id, 'stylistId', e.target.value)} 
                                                    title="Select stylist"
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs outline-none focus:border-luxe-gold/50"
                                                >
                                                    <option value="">Select stylist...</option>
                                                    {staff.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-white/40 uppercase mb-1 block">Start Time *</label>
                                                <input 
                                                    type="time" 
                                                    value={item.startTime} 
                                                    onChange={e => updateServiceItem(item.id, 'startTime', e.target.value)} 
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs outline-none focus:border-luxe-gold/50"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-white/40 uppercase mb-1 block">End Time *</label>
                                                <input 
                                                    type="time" 
                                                    value={item.endTime} 
                                                    onChange={e => updateServiceItem(item.id, 'endTime', e.target.value)} 
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs outline-none focus:border-luxe-gold/50"
                                                />
                                            </div>
                                        </div>
                                        {/* Optional Guest Name for group bookings */}
                                        <div className="mt-3">
                                            <label className="text-[10px] font-bold text-white/40 uppercase mb-1 block">Guest Name (Optional — Group Booking)</label>
                                            <input 
                                                value={item.guestName} 
                                                onChange={e => updateServiceItem(item.id, 'guestName', e.target.value)} 
                                                placeholder="e.g. John's friend" 
                                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs outline-none focus:border-luxe-gold/50" 
                                            />
                                        </div>
                                    </div>
                                ))}

                                <button 
                                    onClick={addServiceItem} 
                                    className="w-full border border-dashed border-white/20 hover:border-luxe-gold/50 text-white/50 hover:text-luxe-gold rounded-xl p-3 flex justify-center items-center gap-2 transition-all text-xs font-bold uppercase tracking-wider"
                                >
                                    <Plus className="w-4 h-4" /> Add Another Service / Guest
                                </button>
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mt-4">
                            <label className="text-xs font-bold text-luxe-gold uppercase tracking-wider mb-3 block">
                                🔁 Auto-Repeat Appointment
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <select
                                        value={wRecurring} onChange={e => setWRecurring(e.target.value as any)}
                                        title="Repeat Frequency"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all"
                                    >
                                        <option value="none">Just Once (Do Not Repeat)</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="biweekly">Every 2 Weeks</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                </div>
                                
                                {wRecurring !== 'none' && (
                                    <div className="animate-fade-in">
                                        <select
                                            value={wRecurringCount} onChange={e => setWRecurringCount(Number(e.target.value))}
                                            title="Number of defaults"
                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all font-bold text-white"
                                        >
                                            <option value={2}>2 Times Total</option>
                                            <option value={3}>3 Times Total</option>
                                            <option value={4}>4 Times Total</option>
                                            <option value={5}>5 Times Total</option>
                                            <option value={8}>8 Times Total</option>
                                            <option value={12}>12 Times Total</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={handleWalkin}
                            disabled={saving || !isFormValid}
                            className="w-full mt-6 bg-gold-gradient text-luxe-obsidian font-bold py-3 rounded-xl shadow-lg shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                            {saving ? 'BOOKING...' : 'CONFIRM WALK-IN'}
                        </button>
                    </div>
                </div>
            )}

            {/* Booking Details Modal */}
            {selectedBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-luxe-obsidian border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
                        {saving && (
                            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-luxe-gold animate-spin" />
                            </div>
                        )}
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h2 className="text-xl font-bold font-playfair bg-gold-gradient bg-clip-text text-transparent">Booking Details</h2>
                            <button onClick={() => { setSelectedBooking(null); setRefundMode(false); setRefundMethod('none'); }} className="text-white/50 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-luxe-gold font-bold text-lg">
                                    {selectedBooking.client_name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-lg font-bold truncate">{selectedBooking.client_name}</p>
                                    <p className="text-sm text-white/50 truncate">{selectedBooking.service_name}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                    <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Time</p>
                                    <p className="font-bold">{timezone ? toSalonTimeStr(selectedBooking.start_time, timezone) : selectedBooking.start_time.substring(11,16)}</p>
                                    <p className="text-xs text-white/50 mt-1">{selectedBooking.date_label}</p>
                                </div>
                                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                    <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Price / Status</p>
                                    <p className="font-bold text-luxe-gold">${selectedBooking.price}</p>
                                    <p className="text-xs mt-1 uppercase text-white/50 tracking-wider font-bold">{selectedBooking.status.replace('_', ' ')}</p>
                                </div>
                            </div>

                            {!refundMode ? (
                                <div className="flex gap-3 pt-4 border-t border-white/10">
                                    {(selectedBooking.status === 'cancelled' || selectedBooking.status === 'no_show') && selectedBooking.deposit_paid_amount > 0 && selectedBooking.payment_status !== 'refunded' ? (
                                        <button
                                            onClick={() => initiateCancelRefund(selectedBooking.status === 'no_show')}
                                            className="flex-1 py-3 px-4 rounded-xl bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20 hover:bg-amber-500/20 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <AlertTriangle className="w-5 h-5" /> Process Pending Refund
                                        </button>
                                    ) : selectedBooking.status !== 'cancelled' && selectedBooking.status !== 'no_show' ? (
                                        <>
                                            <button
                                                onClick={() => handleImmediateCancel(false)}
                                                className="flex-1 py-3 px-4 rounded-xl bg-white/5 text-white/70 font-bold border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <XCircle className="w-5 h-5" /> Cancel Booking
                                            </button>
                                            <button
                                                onClick={() => handleImmediateCancel(true)}
                                                className="flex-1 py-3 px-4 rounded-xl bg-white/5 text-white/70 font-bold border border-white/10 hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <UserX className="w-5 h-5" /> Mark No-Show
                                            </button>
                                        </>
                                    ) : null}
                                </div>
                            ) : (
                                <div className="bg-red-500/5 p-5 rounded-xl border border-red-500/20 space-y-4 animate-in fade-in zoom-in-95">
                                    <h3 className="font-bold text-red-400 flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5" /> Process Refund
                                    </h3>
                                    
                                    {calculatedRefund > 0 ? (
                                        <>
                                            <div className="bg-luxe-obsidian/50 p-3 rounded-lg border border-red-500/10">
                                                <p className="text-xs text-white/60 mb-1">A calculation was made based on your Settings Policy:</p>
                                                <p className="text-sm font-bold text-red-300">{refundReason}</p>
                                            </div>
                                            <p className="text-sm text-white/70">
                                                Total Required Refund: <span className="font-bold text-red-400 text-lg">${calculatedRefund}</span>
                                            </p>
                                            <p className="text-xs text-white/50 mb-2">How will you issue this refund?</p>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => setRefundMethod('cash')}
                                                    className={`flex-1 py-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${refundMethod === 'cash' ? 'bg-red-500/20 border-red-500 text-white' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'}`}
                                                >
                                                    <Banknote className="w-5 h-5" />
                                                    <span className="text-xs font-bold uppercase tracking-wider">Cash</span>
                                                </button>
                                                <button
                                                    onClick={() => setRefundMethod('card')}
                                                    className={`flex-1 py-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${refundMethod === 'card' ? 'bg-red-500/20 border-red-500 text-white' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'}`}
                                                >
                                                    <CreditCard className="w-5 h-5" />
                                                    <span className="text-xs font-bold uppercase tracking-wider">Card / Stripe</span>
                                                </button>
                                            </div>
                                            {(refundMethod === 'cash' || refundMethod === 'card') && (
                                                <p className="text-[10px] text-red-300/80 uppercase font-bold text-center border-t border-white/5 pt-2">
                                                    This will automatically minus ${calculatedRefund} from your Daily Drawer.
                                                </p>
                                            )}
                                        </>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="bg-luxe-obsidian/50 p-3 rounded-lg border border-white/5">
                                                <p className="text-xs text-white/60 mb-1">Policy Outcome:</p>
                                                <p className="text-sm font-bold text-amber-400">{refundReason}</p>
                                            </div>
                                            <p className="text-sm text-white/70">No refund needs to be processed. The status will just be updated.</p>
                                        </div>
                                    )}

                                    <div className="flex gap-3 pt-2">
                                        <button onClick={() => { setRefundMode(false); setRefundMethod('none'); }} className="flex-1 py-3 rounded-xl bg-white/5 text-white/50 font-bold border border-white/10 hover:bg-white/10 transition-colors">
                                            Nevermind
                                        </button>
                                        <button 
                                            onClick={handleCancelRefund}
                                            disabled={calculatedRefund > 0 && refundMethod === 'none'}
                                            className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Confirm Update
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Pending Refunds List Modal */}
            {showPendingRefunds && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-luxe-obsidian border-l border-white/10 w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h2 className="text-xl font-bold font-playfair flex items-center gap-2 text-white">
                                <AlertTriangle className="w-5 h-5 text-amber-400" />
                                Pending Refunds
                            </h2>
                            <button onClick={() => setShowPendingRefunds(false)} className="text-white/50 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 flex-1 overflow-y-auto space-y-4">
                            <p className="text-sm text-white/60 leading-relaxed mb-4">
                                These bookings were cancelled (e.g. by the AI Receptionist or Online) and the customer has previously paid a deposit. Review each booking to decide whether to issue a refund based on your cancellation policy.
                            </p>
                            {pendingRefunds.length === 0 ? (
                                <div className="text-center text-white/40 py-8">
                                    <p>All caught up!</p>
                                    <p className="text-xs">No pending refunds require action.</p>
                                </div>
                            ) : (
                                pendingRefunds.map(b => (
                                    <div key={b.id} className="bg-white/5 border border-white/10 p-4 rounded-xl flex justify-between items-center gap-4 hover:border-luxe-gold/50 transition-colors cursor-pointer" onClick={() => { setSelectedBooking(b); setShowPendingRefunds(false); }}>
                                        <div>
                                            <p className="font-bold text-white mb-0.5">{b.client_name}</p>
                                            <p className="text-xs text-white/50">{toSalonDateLabel(b.start_time, timezone || 'America/Chicago')} • {toSalonTimeStr(b.start_time, timezone || 'America/Chicago')}</p>
                                            <p className="text-xs font-bold uppercase tracking-wider text-amber-400 mt-2">{b.status.replace('_', ' ')}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-white/40 uppercase tracking-widest">Paid</p>
                                            <p className="font-bold text-luxe-gold text-lg">${b.deposit_paid_amount}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
