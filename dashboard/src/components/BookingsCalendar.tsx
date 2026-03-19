import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
    Plus, Clock, Scissors, Loader2, X, UserPlus,
    Calendar as CalendarIcon, ChevronLeft, ChevronRight
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

    // Walk-in form
    const [wName, setWName] = useState('');
    const [wPhone, setWPhone] = useState('');
    const [wService, setWService] = useState('');
    const [wStylist, setWStylist] = useState('');
    // Walk-in recurrence
    const [wRecurring, setWRecurring] = useState('none');
    const [wRecurringCount, setWRecurringCount] = useState(4);

    // Get current time in salon's timezone
    const getSalonTime = () => {
        const tz = timezone || 'America/New_York';
        const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
        const h = parts.find(p => p.type === 'hour')?.value || '12';
        const m = parts.find(p => p.type === 'minute')?.value || '00';
        return `${h}:${m}`;
    };
    const [wStartTime, setWStartTime] = useState(getSalonTime());
    const [wEndTime, setWEndTime] = useState('');

    const fetchData = useCallback(async () => {
        if (!tenantId) return;
        setLoading(true);

        // Fetch staff
        const { data: staffData } = await supabase
            .from('staff').select('id, full_name, role, color')
            .eq('tenant_id', tenantId).eq('is_active', true).order('created_at');

        // Fetch services
        const { data: svcData } = await supabase
            .from('services').select('id, name, duration, price')
            .eq('tenant_id', tenantId).eq('is_active', true).order('name');

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
    const selectedService = services.find(s => s.id === wService);
    const calcEndTime = (start: string, dur: number) => {
        const [h, m] = start.split(':').map(Number);
        const total = h * 60 + m + dur;
        return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    };

    // Update end time when service changes
    React.useEffect(() => {
        if (selectedService && wStartTime) {
            setWEndTime(calcEndTime(wStartTime, selectedService.duration));
        }
    }, [wService, wStartTime]);

    const handleWalkin = async () => {
        if (!wName || !wPhone || !wService || !wStylist || !selectedService) return;
        setSaving(true);

        try {
            // Build start/end timestamps in salon timezone
            const tz = timezone || 'America/New_York';
            const today = new Date().toLocaleDateString('en-CA', { timeZone: tz });
            const startISO = new Date(`${today}T${wStartTime}:00`).toISOString();
            const endISO = wEndTime
                ? new Date(`${today}T${wEndTime}:00`).toISOString()
                : new Date(new Date(`${today}T${wStartTime}:00`).getTime() + selectedService.duration * 60000).toISOString();

            // Step 1: Upsert client
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

            // Step 2: Insert initial booking
            const { data: firstBooking, error: firstErr } = await supabase
                .from('bookings')
                .insert({
                    tenant_id: tenantId,
                    client_id: clientId,
                    stylist_id: wStylist,
                    service_id: wService,
                    start_time: startISO,
                    end_time: endISO,
                    total_price: selectedService.price,
                    status: 'confirmed',
                    is_recurring: wRecurring !== 'none',
                    parent_booking_id: null
                }).select('id').single();

            if (firstErr || !firstBooking) throw new Error(firstErr?.message || 'Failed to create booking');

            // Step 3: Insert future occurrences if recurring
            if (wRecurring !== 'none' && wRecurringCount > 1) {
                const futureBookings = [];
                const baseStartDt = new Date(`${today}T${wStartTime}:00`);
                const baseEndDt = wEndTime 
                    ? new Date(`${today}T${wEndTime}:00`)
                    : new Date(baseStartDt.getTime() + selectedService.duration * 60000);

                for (let i = 1; i < wRecurringCount; i++) {
                    const nextStart = new Date(baseStartDt);
                    const nextEnd = new Date(baseEndDt);
                    if (wRecurring === 'weekly') {
                        nextStart.setDate(nextStart.getDate() + (i * 7));
                        nextEnd.setDate(nextEnd.getDate() + (i * 7));
                    } else if (wRecurring === 'bi-weekly') {
                        nextStart.setDate(nextStart.getDate() + (i * 14));
                        nextEnd.setDate(nextEnd.getDate() + (i * 14));
                    } else if (wRecurring === 'monthly') {
                        nextStart.setMonth(nextStart.getMonth() + i);
                        nextEnd.setMonth(nextEnd.getMonth() + i);
                    }
                    futureBookings.push({
                        tenant_id: tenantId,
                        client_id: clientId,
                        stylist_id: wStylist,
                        service_id: wService,
                        start_time: nextStart.toISOString(),
                        end_time: nextEnd.toISOString(),
                        total_price: selectedService.price,
                        status: 'confirmed',
                        is_recurring: true,
                        parent_booking_id: firstBooking.id
                    });
                }
                
                if (futureBookings.length > 0) {
                    const { error: batchErr } = await supabase.from('bookings').insert(futureBookings);
                    if (batchErr) throw new Error("Future bookings partially failed: " + batchErr.message);
                }
            }

            // Success
            showToast(wRecurring === 'none' ? 'Walk-in booked!' : `Booked ${wRecurringCount} recurring appointments!`);
            setShowModal(false);
            setWName(''); setWPhone(''); setWService(''); setWStylist('');
            setWRecurring('none'); setWRecurringCount(4);
            setWStartTime(getSalonTime());
            setWEndTime('');
            fetchData();
        } catch (err: any) {
            showToast(err.message || 'Failed', 'error');
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

        // === LOYALTY PROGRAM: Award points on completion ===
        if (nextStatus === 'completed' && booking.client_id) {
            try {
                // Get tenant's multiplier
                const { data: tenant } = await supabase.from('tenants').select('loyalty_points_multiplier').eq('id', tenantId).single();
                const multiplier = tenant?.loyalty_points_multiplier || 1.0;
                const pointsEarned = Math.floor(booking.price * multiplier);

                if (pointsEarned > 0) {
                    // Fetch client's current points
                    const { data: clientData } = await supabase.from('clients').select('loyalty_points').eq('id', booking.client_id).single();
                    const currentPoints = clientData?.loyalty_points || 0;

                    // Update points
                    await supabase.from('clients').update({ loyalty_points: currentPoints + pointsEarned }).eq('id', booking.client_id);
                    showToast(`🎉 Client earned ${pointsEarned} loyalty points!`);
                }
            } catch (err) {
                console.error("Failed to assign loyalty points", err);
            }
        }

        const { error } = await supabase
            .from('bookings')
            .update({ status: nextStatus })
            .eq('id', booking.id);
            
        if (!error) {
            if (nextStatus !== 'completed') showToast(`Status → ${nextStatus.replace('_', ' ')}`);
            fetchData();
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
                                            <div key={b.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all hover:bg-white/5 ${colors.border} bg-white/[0.02] ${isCancelled ? 'opacity-45 line-through' : ''}`}>
                                                {/* Time */}
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
                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Service *</label>
                                <select
                                    value={wService} onChange={e => setWService(e.target.value)}
                                    title="Select a service"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all"
                                >
                                    <option value="">Select service...</option>
                                    {services.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} — ${s.price} ({s.duration} min)</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Stylist *</label>
                                <select
                                    value={wStylist} onChange={e => setWStylist(e.target.value)}
                                    title="Select a stylist"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all"
                                >
                                    <option value="">Select stylist...</option>
                                    {staff.map(s => (
                                        <option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Start Time</label>
                                    <input
                                        type="time" value={wStartTime} onChange={e => setWStartTime(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">End Time {selectedService ? `(${selectedService.duration}m)` : ''}</label>
                                    <input
                                        type="time" value={wEndTime} onChange={e => setWEndTime(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleWalkin}
                            disabled={saving || !wName || !wPhone || !wService || !wStylist}
                            className="w-full mt-6 bg-gold-gradient text-luxe-obsidian font-bold py-3 rounded-xl shadow-lg shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                            {saving ? 'BOOKING...' : 'CONFIRM WALK-IN'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
