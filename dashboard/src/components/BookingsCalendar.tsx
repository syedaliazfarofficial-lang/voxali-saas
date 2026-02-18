import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
    Plus, Clock, Scissors, Loader2, X, UserPlus,
    ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, DollarSign
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TENANT_ID } from '../config/constants';
import { showToast } from './ui/ToastNotification';

interface Staff { id: string; full_name: string; role: string; color: string; }
interface Service { id: string; name: string; duration: number; price: number; }
interface Booking {
    id: string; stylist_id: string; client_name: string; service_name: string;
    start_hour: number; duration_hours: number; status: string;
    start_at: string; date_label: string; price: number;
    payment_status: string; source: string;
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
function getDateRange(view: ViewMode): { start: Date; end: Date; label: string } {
    const now = new Date();
    if (view === 'today') {
        const start = new Date(now); start.setHours(0, 0, 0, 0);
        const end = new Date(now); end.setHours(23, 59, 59, 999);
        return { start, end, label: now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) };
    }
    if (view === 'weekly') {
        const dayOfWeek = now.getDay();
        const start = new Date(now);
        start.setDate(now.getDate() - dayOfWeek);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        const startLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const endLabel = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return { start, end, label: `${startLabel} - ${endLabel}` };
    }
    // monthly
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end, label: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) };
}

export const BookingsCalendar: React.FC = () => {
    const [staff, setStaff] = useState<Staff[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('today');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Walk-in form
    const [wName, setWName] = useState('');
    const [wPhone, setWPhone] = useState('');
    const [wService, setWService] = useState('');
    const [wStylist, setWStylist] = useState('');
    const [wTime, setWTime] = useState('');

    const fetchData = useCallback(async () => {
        if (!TENANT_ID) return;
        setLoading(true);

        // Fetch staff
        const { data: staffData } = await supabase
            .from('staff').select('id, full_name, role, color')
            .eq('tenant_id', TENANT_ID).eq('is_active', true).order('created_at');

        // Fetch services
        const { data: svcData } = await supabase
            .from('services').select('id, name, duration, price')
            .eq('tenant_id', TENANT_ID).eq('is_active', true).order('name');

        // Fetch bookings for the selected date range
        const { start, end } = getDateRange(viewMode);
        const { data: bookData } = await supabase
            .from('bookings').select(`
                id, stylist_id, status, start_at, end_at, total_price, payment_status, source,
                clients(name), services(name)
            `)
            .eq('tenant_id', TENANT_ID)
            .gte('start_at', start.toISOString())
            .lte('start_at', end.toISOString())
            .not('status', 'eq', 'cancelled')
            .order('start_at');

        if (staffData) setStaff(staffData);
        if (svcData) setServices(svcData);
        if (bookData) {
            setBookings(bookData.map((b: any) => {
                const startDt = new Date(b.start_at);
                const endDt = new Date(b.end_at);
                return {
                    id: b.id,
                    stylist_id: b.stylist_id,
                    client_name: b.clients?.name || 'Walk-in',
                    service_name: b.services?.name || 'Service',
                    start_hour: startDt.getHours() + startDt.getMinutes() / 60,
                    duration_hours: (endDt.getTime() - startDt.getTime()) / 3600000,
                    status: b.status,
                    start_at: b.start_at,
                    date_label: startDt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                    price: b.total_price || 0,
                    payment_status: b.payment_status || 'unpaid',
                    source: b.source || 'phone',
                };
            }));
        }
        setLoading(false);
    }, [viewMode]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleWalkin = async () => {
        if (!wName || !wPhone || !wService || !wStylist) return;
        setSaving(true);

        let startTime: string;
        if (wTime) {
            const [h, m] = wTime.split(':').map(Number);
            const dt = new Date(); dt.setHours(h, m, 0, 0);
            startTime = dt.toISOString();
        } else {
            startTime = new Date().toISOString();
        }

        const { data, error } = await supabase.rpc('rpc_add_walkin', {
            p_tenant_id: TENANT_ID,
            p_client_name: wName,
            p_client_phone: wPhone,
            p_service_id: wService,
            p_stylist_id: wStylist,
            p_start_time: startTime,
        });

        if (!error && data?.success) {
            showToast('Walk-in booked!');
            setShowModal(false);
            setWName(''); setWPhone(''); setWService(''); setWStylist(''); setWTime('');
            fetchData();
        } else {
            showToast(data?.error || error?.message || 'Failed', 'error');
        }
        setSaving(false);
    };

    // Confirm payment handler
    const handleConfirmPayment = async (bookingId: string) => {
        const { error } = await supabase
            .from('bookings')
            .update({ payment_status: 'paid' })
            .eq('id', bookingId);
        if (!error) {
            showToast('Payment confirmed!');
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

    const { label: rangeLabel } = getDateRange(viewMode);
    const displayStaff = staff.slice(0, 5);

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
                                onClick={() => setViewMode(mode)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${viewMode === mode
                                    ? 'bg-luxe-gold text-luxe-obsidian shadow-lg'
                                    : 'text-white/50 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                    {/* Date Label */}
                    <span className="text-sm text-white/40 font-medium hidden md:block">{rangeLabel}</span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-gold-gradient text-luxe-obsidian px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="text-sm">ADD WALK-IN</span>
                    </button>
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
                                        return (
                                            <div
                                                key={b.id}
                                                className={`absolute left-1 right-1 rounded-xl p-3 border shadow-2xl transition-all hover:scale-[1.02] cursor-pointer group z-10 ${colors.bg} ${colors.text} ${colors.border}`}
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
                                                        {Math.floor(b.start_hour)}:{String(Math.round((b.start_hour % 1) * 60)).padStart(2, '0')}
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
                                        const timeStr = `${Math.floor(b.start_hour)}:${String(Math.round((b.start_hour % 1) * 60)).padStart(2, '0')}`;
                                        const stylist = staff.find(s => s.id === b.stylist_id);
                                        return (
                                            <div key={b.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all hover:bg-white/5 ${colors.border} bg-white/[0.02]`}>
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
                                                <div className="text-right shrink-0 w-16">
                                                    <p className="text-sm font-bold text-luxe-gold">${b.price}</p>
                                                </div>
                                                {/* Status Badge */}
                                                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg shrink-0 ${colors.bg} ${colors.text}`}>
                                                    {b.status.replace('_', ' ')}
                                                </span>
                                                {/* Payment Badge */}
                                                {b.payment_status === 'paid' ? (
                                                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg shrink-0 bg-green-500/15 text-green-400 border border-green-500/20">
                                                        ✓ PAID
                                                    </span>
                                                ) : b.payment_status === 'advance' ? (
                                                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg shrink-0 bg-blue-500/15 text-blue-400 border border-blue-500/20">
                                                        ADVANCE
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleConfirmPayment(b.id)}
                                                        title="Confirm Payment"
                                                        className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg shrink-0 bg-orange-500/15 text-orange-400 border border-orange-500/20 hover:bg-orange-500/30 transition-colors cursor-pointer flex items-center gap-1"
                                                    >
                                                        <DollarSign className="w-3 h-3" /> CONFIRM PAY
                                                    </button>
                                                )}
                                                {/* Source badge for walk-ins */}
                                                {b.source === 'walk_in' && (
                                                    <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-white/40 border border-white/10 shrink-0">
                                                        WALK-IN
                                                    </span>
                                                )}
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
                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Start Time (optional — defaults to NOW)</label>
                                <input
                                    type="time" value={wTime} onChange={e => setWTime(e.target.value)}
                                    placeholder="Select time"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all"
                                />
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
