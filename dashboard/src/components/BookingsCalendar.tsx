import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
    Plus, Clock, Scissors, Loader2, X, UserPlus, UserX,
    Calendar as CalendarIcon, ChevronLeft, ChevronRight, XCircle, CreditCard, Banknote, AlertTriangle,
    Search, MoreHorizontal, ChevronUp, ChevronDown
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTenant } from '../context/TenantContext';
import { useAuth } from '../context/AuthContext';
import { showToast } from './ui/ToastNotification';
import { CalendarSkeleton } from './ui/Skeleton';

interface Staff { id: string; full_name: string; role: string; color: string; photo_url?: string | null; }
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

const statusColors: Record<string, { bg: string; text: string; border: string; solidBg: string; borderLeft: string }> = {
    confirmed: { bg: 'bg-[#D4AF37]/8 backdrop-blur-md', text: 'text-[#E5C158]', border: 'border-white/5', solidBg: 'bg-[#D4AF37]', borderLeft: 'border-l-[#D4AF37]' },
    completed: { bg: 'bg-emerald-500/8 backdrop-blur-md', text: 'text-emerald-400', border: 'border-white/5', solidBg: 'bg-emerald-500', borderLeft: 'border-l-emerald-500' },
    pending: { bg: 'bg-amber-500/8 backdrop-blur-md', text: 'text-amber-300', border: 'border-white/5', solidBg: 'bg-amber-500', borderLeft: 'border-l-amber-500' },
    checked_in: { bg: 'bg-blue-500/8 backdrop-blur-md', text: 'text-blue-400', border: 'border-white/5', solidBg: 'bg-blue-500', borderLeft: 'border-l-blue-500' },
    in_progress: { bg: 'bg-purple-500/8 backdrop-blur-md', text: 'text-purple-400', border: 'border-white/5', solidBg: 'bg-purple-500', borderLeft: 'border-l-purple-500' },
    cancelled: { bg: 'bg-rose-500/4 backdrop-blur-md', text: 'text-rose-400/50', border: 'border-white/5', solidBg: 'bg-rose-500/40', borderLeft: 'border-l-rose-500/40' },
    no_show: { bg: 'bg-rose-500/4 backdrop-blur-md', text: 'text-rose-300/50', border: 'border-white/5', solidBg: 'bg-rose-500/35', borderLeft: 'border-l-rose-500/30' },
    pending_deposit: { bg: 'bg-orange-500/8 backdrop-blur-md', text: 'text-orange-300', border: 'border-white/5', solidBg: 'bg-orange-500', borderLeft: 'border-l-orange-500' },
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
    const [workingHours, setWorkingHours] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('today');
    const [dateOffset, setDateOffset] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);
    const hourScrollRef = useRef<HTMLDivElement>(null);
    const minuteScrollRef = useRef<HTMLDivElement>(null);
    const ampmScrollRef = useRef<HTMLDivElement>(null);
    const lastActivePickerRef = useRef<string | null>(null);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [refundMode, setRefundMode] = useState(false);
    const [refundMethod, setRefundMethod] = useState<'cash' | 'card' | 'stripe' | 'none'>('none');
    const [isFetching, setIsFetching] = useState(false);
    
    // Policy Refund State
    const [calculatedRefund, setCalculatedRefund] = useState<number>(0);
    const [refundReason, setRefundReason] = useState<string>('');
    const [isNoShow, setIsNoShow] = useState<boolean>(false);
    
    // Pending Refunds State
    const [showPendingRefunds, setShowPendingRefunds] = useState<boolean>(false);
    const [activePicker, setActivePicker] = useState<string | null>(null);
    const [pendingRefunds, setPendingRefunds] = useState<Booking[]>([]);

    // Walk-in form
    const [wName, setWName] = useState('');
    const [wPhone, setWPhone] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [search, setSearch] = useState('');
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const actionsMenuRef = useRef<HTMLDivElement>(null);
    const selectOnLoadRef = useRef<string | null>(null);

    // Auto-select booking after loading bookings
    useEffect(() => {
        if (selectOnLoadRef.current && bookings.length > 0 && !loading) {
            const target = bookings.find(b => b.id === selectOnLoadRef.current);
            if (target) {
                setSelectedBooking(target);
            }
            selectOnLoadRef.current = null;
        }
    }, [bookings, loading]);

    // Listen to selection event from other pages
    useEffect(() => {
        const handleSelectBooking = (e: Event) => {
            const customEvent = e as CustomEvent;
            const bookingDetail = customEvent.detail;
            if (!bookingDetail || !bookingDetail.id || !bookingDetail.start_time) return;

            const tz = timezone || 'America/Chicago';
            const bookingDate = new Date(bookingDetail.start_time);
            
            // Get salon today's date (at midnight)
            const todaySalon = new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
            todaySalon.setHours(0,0,0,0);
            
            // Get booking date (at midnight)
            const targetSalon = new Date(bookingDate.toLocaleString('en-US', { timeZone: tz }));
            targetSalon.setHours(0,0,0,0);
            
            // Difference in days
            const diffTime = targetSalon.getTime() - todaySalon.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
            
            setViewMode('today');
            setDateOffset(diffDays);
            selectOnLoadRef.current = bookingDetail.id;
        };

        window.addEventListener('voxali:select-booking', handleSelectBooking);
        return () => window.removeEventListener('voxali:select-booking', handleSelectBooking);
    }, [timezone]);

    // Close actions menu & time pickers on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) {
                setShowActionsMenu(false);
            }
            const target = e.target as HTMLElement;
            if (!target.closest('.time-picker-container')) {
                setActivePicker(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);
 


    const [currentHour, setCurrentHour] = useState<number | null>(null);

    const openBookingFor = (stylistId: string, time24h: string) => {
        const padHour = (t: string) => {
            const [h, m] = t.split(':');
            return `${h.padStart(2, '0')}:${m}`;
        };
        const paddedTime = padHour(time24h);
        
        setShowModal(true);
        setWServiceItems([
            { id: 'initial-1', serviceId: '', stylistId: stylistId, startTime: paddedTime, endTime: '', guestName: '' }
        ]);
    };

    useEffect(() => {
        if (viewMode !== 'today' || dateOffset !== 0) {
            setCurrentHour(null);
            return;
        }

        const updateTime = () => {
            const tz = timezone || 'America/New_York';
            const parts = new Intl.DateTimeFormat('en-US', {
                timeZone: tz,
                hour: 'numeric',
                minute: 'numeric',
                hour12: false
            }).formatToParts(new Date());

            const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
            const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
            const decimalHour = h + m / 60;
            
            // Only show if within our slot range (8:00 to 21:00)
            if (decimalHour >= 8 && decimalHour <= 21) {
                setCurrentHour(decimalHour);
            } else {
                setCurrentHour(null);
            }
        };

        updateTime();
        const interval = setInterval(updateTime, 60000); // update every minute
        return () => clearInterval(interval);
    }, [viewMode, dateOffset, timezone]);
    
    // Get current time in salon's timezone, clamped to business hours (08:00–21:00)
    const getSalonTime = () => {
        const tz = timezone || 'America/New_York';
        const now = new Date();
        const ms = 1000 * 60 * 10; // 10 minutes
        const roundedDate = new Date(Math.round(now.getTime() / ms) * ms);
        
        const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(roundedDate);
        const h = parseInt(parts.find(p => p.type === 'hour')?.value || '9');
        const m = parts.find(p => p.type === 'minute')?.value || '00';
        // Clamp: if before 08:00, return 08:00; if after 21:00, return 09:00 (next day default)
        if (h < 8 || h >= 21) return '09:00';
        return `${String(h).padStart(2, '0')}:${m}`;
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

    // Scroll active time selection into view in custom time pickers
    useEffect(() => {
        if (!activePicker) {
            lastActivePickerRef.current = null;
            return;
        }

        const activeParts = activePicker.split('-');
        const activeItemId = activeParts.slice(0, -1).join('-');
        const activeField = activeParts[activeParts.length - 1] === 'start' ? 'startTime' : 'endTime';

        const activeItem = wServiceItems.find(item => item.id === activeItemId);
        if (!activeItem) return;

        const timeVal = activeItem[activeField];
        const isFirstOpen = lastActivePickerRef.current !== activePicker;
        lastActivePickerRef.current = activePicker;

        const scrollActiveIntoView = (smooth = true) => {
            const centerActiveElement = (container: HTMLDivElement | null, selector: string) => {
                if (!container) return;
                const selected = container.querySelector(selector) as HTMLElement;
                if (selected) {
                    const top = selected.offsetTop - container.clientHeight / 2 + selected.clientHeight / 2;
                    container.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
                }
            };
            centerActiveElement(hourScrollRef.current, '.text-luxe-gold');
            centerActiveElement(minuteScrollRef.current, '.text-luxe-gold');
            centerActiveElement(ampmScrollRef.current, '.bg-luxe-gold');
        };

        if (isFirstOpen) {
            // Instant center on open
            scrollActiveIntoView(false);
            // Re-run shortly after to guarantee center position after layout completes
            const t1 = setTimeout(() => scrollActiveIntoView(false), 30);
            const t2 = setTimeout(() => scrollActiveIntoView(false), 100);
            return () => {
                clearTimeout(t1);
                clearTimeout(t2);
            };
        } else {
            // Smooth center when selected value changes
            scrollActiveIntoView(true);
        }
    }, [activePicker, wServiceItems]);

    const fetchData = useCallback(async (showLoader = false) => {
        if (!tenantId) return;
        if (showLoader) {
            setLoading(true);
        } else {
            setIsFetching(true);
        }

        // Fetch staff
        const { data: staffData } = await supabase
            .from('staff').select('id, full_name, role, color, photo_url')
            .eq('tenant_id', tenantId).eq('is_active', true).order('created_at');

        // Fetch services
        const { data: svcData } = await supabase
            .from('services').select('id, name, duration, price')
            .eq('tenant_id', tenantId).eq('is_active', true).order('name');

        // Fetch staff working hours
        const { data: workingHoursData } = await supabase
            .from('staff_working_hours')
            .select('staff_id, day_of_week, start_time, end_time, is_working')
            .eq('tenant_id', tenantId);

        if (workingHoursData) setWorkingHours(workingHoursData);

        // Fetch global pending refunds (regardless of date range)
        let pendingQ = supabase
            .from('bookings').select(`
                id, stylist_id, client_id, status, start_time, end_time, total_price, is_gap_booking,
                deposit_amount, deposit_paid_amount, payment_status, notes,
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
                    client_name: (() => {
                        if (b.notes) {
                            const m = b.notes.match(/^(?:Online booking|Walk-in) by (.+)$/i);
                            if (m) return m[1];
                        }
                        return b.clients?.name || 'Walk-in';
                    })(),
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
                deposit_amount, deposit_paid_amount, payment_status, notes,
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
                    deposit_amount, deposit_paid_amount, payment_status, notes,
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
                        client_name: (() => {
                            if (b.notes) {
                                const m = b.notes.match(/^(?:Online booking|Walk-in) by (.+)$/i);
                                if (m) return m[1];
                            }
                            return b.clients?.name || 'Walk-in';
                        })(),
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
            setIsFetching(false);
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
                    client_name: (() => {
                        if (b.notes) {
                            const m = b.notes.match(/^(?:Online booking|Walk-in) by (.+)$/i);
                            if (m) return m[1];
                        }
                        return b.clients?.name || 'Walk-in';
                    })(),
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
        setIsFetching(false);
    }, [viewMode, dateOffset, isStaff, staffId, tenantId, timezone]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const getSalonDateStr = (offset: number, tz: string) => {
        const d = new Date();
        d.setDate(d.getDate() + offset);
        return d.toLocaleDateString('en-CA', { timeZone: tz }); // "YYYY-MM-DD"
    };

    const getSalonDayOfWeek = (offset: number, tz: string) => {
        const dateStr = getSalonDateStr(offset, tz);
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d).getDay(); // 0-6
    };

    const getStylistShift = (stylistId: string) => {
        const tz = timezone || 'America/New_York';
        const dayOfWeek = getSalonDayOfWeek(dateOffset, tz);
        return workingHours.find(w => w.staff_id === stylistId && w.day_of_week === dayOfWeek);
    };

    const isSlotOffShift = (stylistId: string, slotTimeStr: string) => {
        const shift = getStylistShift(stylistId);
        if (!shift || !shift.is_working) return true;
        const slotStart = slotTimeStr.padStart(5, '0') + ':00';
        return slotStart < shift.start_time || slotStart >= shift.end_time;
    };

    // Get nearest FREE start time for a stylist: checks existing bookings, finds first available slot
    const getSmartStartTime = (stylistId: string, serviceDurationMin: number = 30) => {
        const tz = timezone || 'America/New_York';
        const shift = getStylistShift(stylistId);
        const currentTime = getSalonTime(); // "HH:MM" in salon tz

        if (!shift || !shift.is_working || !shift.start_time || !shift.end_time) {
            return currentTime;
        }

        const shiftStart = shift.start_time.substring(0, 5); // "09:00"
        const shiftEnd   = shift.end_time.substring(0, 5);   // "21:00"

        // Start searching from max(currentTime, shiftStart)
        const candidate = currentTime < shiftStart ? shiftStart : currentTime;
        if (candidate >= shiftEnd) return shiftStart; // shift already over, default

        // Helper: "HH:MM" <-> minutes
        const toMins  = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
        const toHHMM  = (mins: number) => `${String(Math.floor(mins / 60) % 24).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

        // Get today's date string in salon timezone
        const todayStr = getSalonDateStr(dateOffset, tz);

        // Build list of busy intervals for this stylist today (sorted by start)
        const busySlots = bookings
            .filter(b => {
                if (b.stylist_id !== stylistId) return false;
                if (['cancelled', 'no_show'].includes(b.status)) return false;
                const bDate = new Date(b.start_time).toLocaleDateString('en-CA', { timeZone: tz });
                return bDate === todayStr;
            })
            .map(b => {
                const startDt = new Date(b.start_time);
                const endDt   = new Date(startDt.getTime() + b.duration_hours * 3600000);
                const fmtHHMM = (d: Date) => {
                    const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d);
                    const h = p.find(x => x.type === 'hour')?.value || '00';
                    const m = p.find(x => x.type === 'minute')?.value || '00';
                    return `${h}:${m}`;
                };
                return { start: fmtHHMM(startDt), end: fmtHHMM(endDt) };
            })
            .sort((a, b) => a.start.localeCompare(b.start));

        const shiftEndMins = toMins(shiftEnd);
        let slotMins = toMins(candidate);

        // Snap to nearest 10-min boundary
        slotMins = Math.ceil(slotMins / 10) * 10;

        // Walk through 10-min increments until we find a free slot
        while (slotMins + serviceDurationMin <= shiftEndMins) {
            const slotStart = toHHMM(slotMins);
            const slotEnd   = toHHMM(slotMins + serviceDurationMin);

            const overlaps = busySlots.some(b => slotStart < b.end && slotEnd > b.start);
            if (!overlaps) return slotStart;

            // Jump to the end of the conflicting booking
            const conflicting = busySlots.find(b => slotStart < b.end && slotEnd > b.start);
            if (conflicting) {
                const jumpTo = Math.ceil(toMins(conflicting.end) / 10) * 10;
                slotMins = Math.max(slotMins + 10, jumpTo);
            } else {
                slotMins += 10;
            }
        }

        // No free slot found within shift — return shift start as fallback
        return shiftStart;
    };

    const formatDbTime12h = (t: string) => {
        if (!t) return '';
        const [hStr, mStr] = t.split(':');
        const h = parseInt(hStr);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${mStr} ${ampm}`;
    };

    const parse24hTime = (t: string) => {
        if (!t) return { h12: 12, m: 0, ampm: 'AM' };
        const [hStr, mStr] = t.split(':');
        const h = parseInt(hStr);
        const m = parseInt(mStr);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return { h12, m, ampm };
    };

    const convert12hTo24h = (h12: number, m: number, ampm: string) => {
        let h24 = h12;
        if (ampm === 'PM' && h12 < 12) h24 += 12;
        if (ampm === 'AM' && h12 === 12) h24 = 0;
        return `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const getNextMinute = (currentM: number, step: number) => {
        const validMinutes = [0, 10, 20, 30, 40, 50];
        let snapped = 0;
        let minDist = Infinity;
        for (const vm of validMinutes) {
            const dist = Math.abs(vm - (currentM % 60));
            if (dist < minDist) {
                minDist = dist;
                snapped = vm;
            }
        }
        const idx = validMinutes.indexOf(snapped);
        if (step > 0) {
            return validMinutes[(idx + 1) % validMinutes.length];
        } else {
            return validMinutes[(idx - 1 + validMinutes.length) % validMinutes.length];
        }
    };

    const format24hTo12h = (t: string) => {
        if (!t) return '--:-- --';
        const [hStr, mStr] = t.split(':');
        const h = parseInt(hStr);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${String(h12).padStart(2, '0')}:${mStr} ${ampm}`;
    };

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

            // When stylist changes, auto-find the nearest FREE slot considering existing bookings
            if (field === 'stylistId' && value) {
                const svc = services.find(s => s.id === updated.serviceId);
                const durationMin = svc ? svc.duration : 30;
                const smartTime = getSmartStartTime(value, durationMin);
                updated.startTime = smartTime;
                if (svc && smartTime) {
                    updated.endTime = calcEndTime(smartTime, svc.duration);
                }
            }

            // When service changes, re-find free slot for current stylist with new duration
            if (field === 'serviceId' && value && updated.stylistId) {
                const svc = services.find(s => s.id === value);
                if (svc) {
                    const smartTime = getSmartStartTime(updated.stylistId, svc.duration);
                    updated.startTime = smartTime;
                    updated.endTime = calcEndTime(smartTime, svc.duration);
                }
            }

            // If only start time changed manually, just recalc end time
            if (field === 'startTime') {
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

    // Phone validation — Worldwide international format (E.164: 7–15 digits)
    const validatePhone = (raw: string): string => {
        if (!raw.trim()) return 'Phone number is required';
        // Strip spaces, dashes, parentheses — keep digits and leading +
        const cleaned = raw.replace(/[\s\-().]/g, '');
        const hasPlus = cleaned.startsWith('+');
        const digits = cleaned.replace(/[^\d]/g, '');
        if (digits.length < 7)  return `Too short — minimum 7 digits required (got ${digits.length})`;
        if (digits.length > 15) return `Too long — maximum 15 digits allowed (E.164 standard)`;
        // If + prefix used, must have at least 1 country code digit
        if (hasPlus && digits.length < 8) return 'Invalid international format — include country code after +';
        return ''; // valid
    };

    // Clean and normalize to a readable international format
    const formatPhoneDisplay = (raw: string): string => {
        const cleaned = raw.replace(/[\s\-().]/g, '');
        const hasPlus = cleaned.startsWith('+');
        const digits = cleaned.replace(/[^\d]/g, '');
        if (digits.length >= 7 && digits.length <= 15) {
            // Return with + prefix if provided, else just digits
            return hasPlus ? `+${digits}` : digits;
        }
        return raw; // invalid — return as-is
    };

    const isPhoneValid = validatePhone(wPhone) === '';

    const isFormValid = wName.trim() !== '' && isPhoneValid &&
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
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + dateOffset);
            const today = targetDate.toLocaleDateString('en-CA', { timeZone: tz });

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
                const [y, m, d] = today.split('-').map(Number);
                const dayOfWeek = new Date(y, m - 1, d).getDay();
                const { data: workingH } = await supabase
                    .from('staff_working_hours')
                    .select('start_time, end_time')
                    .eq('tenant_id', tenantId)
                    .eq('staff_id', item.stylistId)
                    .eq('day_of_week', dayOfWeek)
                    .maybeSingle();

                if (!workingH) {
                    throw new Error(`${st.full_name.trim()} is OFF on this day.`);
                }

                const reqStart = item.startTime + ':00';
                const reqEnd = item.endTime + ':00';
                if (reqStart < workingH.start_time || reqEnd > workingH.end_time) {
                    throw new Error(`${st.full_name.trim()} works from ${workingH.start_time.substring(0,5)} to ${workingH.end_time.substring(0,5)}. Requested time is out of shift.`);
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
                     throw new Error(`${st.full_name.trim()} is on Leave/Vacation (${leaves[0].reason || 'Off'}) on ${new Date(today).toLocaleDateString()}.`);
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
                    throw new Error(`Conflict: ${st.full_name.trim()} is already booked between ${item.startTime} and ${item.endTime}.`);
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
            setWName(''); setWPhone(''); setPhoneError(''); 
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

    // Filter bookings by client name or service name
    const filteredBookings = bookings.filter(b => 
        (b.client_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (b.service_name || '').toLowerCase().includes(search.toLowerCase())
    );

    // Calculate dynamic grid hour range based on today's bookings to ensure early/late bookings are visible
    let startHour = 8;
    let endHour = 20; // standard grid has 13 slots: 8:00 to 20:00 (ends at 21:00)

    if (viewMode === 'today' && filteredBookings.length > 0) {
        const hours = filteredBookings.map(b => b.start_hour);
        const endHours = filteredBookings.map(b => b.start_hour + b.duration_hours);
        
        const minHour = Math.min(...hours);
        const maxHour = Math.max(...endHours);
        
        if (minHour < 8) {
            startHour = Math.max(0, Math.floor(minHour));
        }
        if (maxHour > 21) {
            endHour = Math.min(24, Math.ceil(maxHour) - 1);
        }
    }

    const dayTimeSlots = Array.from(
        { length: endHour - startHour + 1 },
        (_, i) => `${i + startHour}:00`
    );

    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
    const pendingBookings = bookings.filter(b => b.status === 'pending' || b.status === 'pending_deposit').length;

    // Group bookings by date for list view
    const bookingsByDate = filteredBookings.reduce<Record<string, Booking[]>>((acc, b) => {
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

    const displayColumns = [...displayStaff];

    if (loading) return <CalendarSkeleton />;

    return (
        <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500 overflow-hidden">


            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-4">
                {/* Left Side: Icon + Title + Date Navigation inline */}
                <div className="flex items-center gap-6 flex-wrap xl:flex-nowrap min-w-0">
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                        <div className="p-2 bg-luxe-gold/10 rounded-xl border border-luxe-gold/20">
                            <CalendarIcon className="w-5 h-5 text-luxe-gold" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold whitespace-nowrap text-white">Bookings Calendar</h3>
                            <p className="text-[9px] text-white/40 uppercase tracking-widest whitespace-nowrap">Schedule & Appointments</p>
                        </div>
                    </div>
                    
                    {/* View Controls Shifted Up */}
                    <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap flex-shrink-0">
                        {/* View Mode Tabs */}
                        <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10">
                            {(['today', 'weekly', 'monthly'] as ViewMode[]).map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => { setViewMode(mode); setDateOffset(0); }}
                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${viewMode === mode
                                        ? 'bg-luxe-gold text-luxe-obsidian shadow-lg'
                                        : 'text-white/50 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    {mode}
                                </button>
                            ))}
                        </div>

                        {/* Date Navigation */}
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setDateOffset(prev => prev - 1)}
                                className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
                                title="Previous"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            {dateOffset !== 0 && (
                                <button
                                    onClick={() => setDateOffset(0)}
                                    className="px-2.5 py-1.5 rounded-lg bg-luxe-gold/20 border border-luxe-gold/30 text-luxe-gold text-[10px] font-bold hover:bg-luxe-gold/30 transition-all"
                                >
                                    Today
                                </button>
                            )}
                            <button
                                onClick={() => setDateOffset(prev => prev + 1)}
                                className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
                                title="Next"
                            >
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Date Label */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-white/80 font-bold whitespace-nowrap">{rangeLabel}</span>
                            {isFetching && <Loader2 className="w-3.5 h-3.5 animate-spin text-luxe-gold" />}
                        </div>

                        {/* Pending Refunds (if any) */}
                        {pendingRefunds.length > 0 && (
                            <button
                                onClick={() => setShowPendingRefunds(true)}
                                className="bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold px-3 py-1.5 rounded-xl text-[10px] uppercase hover:bg-amber-500/20 transition-all flex items-center gap-1.5 animate-pulse shadow-[0_0_15px_rgba(251,191,36,0.2)]"
                                title="Action Required: Pending Refunds"
                            >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {pendingRefunds.length} REFUND{pendingRefunds.length !== 1 ? 'S' : ''}
                            </button>
                        )}
                    </div>
                </div>
                
                {/* Right Side: Search + Add Walk-in + Action Menu */}
                <div className="flex items-center gap-2 flex-shrink-0 w-full lg:w-auto justify-end">
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                        <input
                            type="text" placeholder="Search bookings..." value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-full pl-9 pr-4 py-1.5 text-xs outline-none focus:border-white/20 w-44 transition-all text-white placeholder-white/30"
                        />
                    </div>
                    
                    {!isStaff && (
                        <button
                            onClick={() => {
                                setWServiceItems([{ id: 'initial-1', serviceId: '', stylistId: '', startTime: getSalonTime(), endTime: '', guestName: '' }]);
                                setShowModal(true);
                            }}
                            className="bg-gold-gradient text-luxe-obsidian px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 hover:bg-white/90 active:scale-[0.98] transition-all whitespace-nowrap"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            ADD WALK-IN
                        </button>
                    )}

                    {/* More Actions Dropdown (3-dots) */}
                    <div className="relative" ref={actionsMenuRef}>
                        <button
                            onClick={() => setShowActionsMenu(!showActionsMenu)}
                            className="p-1.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-all flex items-center justify-center"
                        >
                            <MoreHorizontal className="w-4 h-4" />
                        </button>
                        
                        {showActionsMenu && (
                            <div className="absolute right-0 top-full mt-2 w-44 bg-luxe-obsidian border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <button
                                    onClick={() => { setShowActionsMenu(false); fetchData(true); }}
                                    className="w-full px-4 py-2.5 text-left text-xs flex items-center gap-2 hover:bg-white/5 text-white/80 transition-colors"
                                >
                                    <Clock className="w-3.5 h-3.5 text-luxe-gold" /> Refresh Calendar
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Calendar Grid (Today View) */}
            {viewMode === 'today' && (
                <div className={`flex-1 glass-panel border border-white/5 flex flex-col overflow-hidden relative transition-opacity duration-200 ${isFetching ? 'opacity-65' : 'opacity-100'}`}>
                    {/* Staff Header */}
                    <div className="grid border-b border-white/5 bg-white/5" style={{ gridTemplateColumns: `80px repeat(${displayColumns.length}, 1fr)` }}>
                        <div className="p-4 border-r border-white/5 flex items-center justify-center">
                            <Clock className="w-4 h-4 text-white/20" />
                        </div>
                        {displayColumns.map(s => (
                            <div key={s.id} className="p-4 border-r border-white/5 flex flex-col items-center justify-center text-center gap-2">
                                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold overflow-hidden" style={{ color: s.color, borderColor: s.color || 'rgba(255,255,255,0.1)' }}>
                                    {s.photo_url ? (
                                        <img src={s.photo_url} alt={s.full_name} className="w-full h-full object-cover" />
                                    ) : (
                                        s.full_name.trim().charAt(0)
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold truncate">{s.full_name.trim().split(' ')[0]}</p>
                                    <p className="text-[9px] text-white/30 uppercase tracking-tighter truncate">{s.role}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Scrollable Grid */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar relative">
                        <div className="relative" style={{ gridTemplateColumns: `80px repeat(${displayColumns.length}, 1fr)`, display: 'grid' }}>
                            {/* Current Time Indicator Line */}
                            {currentHour !== null && currentHour >= startHour && currentHour <= (endHour + 1) && (
                                <div 
                                    className="absolute left-[80px] right-0 border-t-2 border-luxe-gold z-20 pointer-events-none flex items-center"
                                    style={{ 
                                        top: `${(currentHour - startHour) * 80}px`,
                                    }}
                                >
                                    <div className="w-2.5 h-2.5 rounded-full bg-luxe-gold -ml-1 shadow-[0_0_10px_#D4AF37]" />
                                </div>
                            )}

                            <div className="flex flex-col">
                                {dayTimeSlots.map(time => {
                                    const formatTime12h = (t: string) => {
                                        const [h] = t.split(':').map(Number);
                                        const ampm = h >= 12 ? 'PM' : 'AM';
                                        const h12 = h % 12 || 12;
                                        return `${h12}:00 ${ampm}`;
                                    };
                                    return (
                                        <div key={time} className="h-20 border-r border-b border-white/5 flex items-start justify-center pt-2 bg-white/[0.01]">
                                            <span className="text-[9px] font-black text-white/35 uppercase tracking-wider">{formatTime12h(time)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            {displayColumns.map(s => (
                                <div key={s.id} className="relative border-r border-white/5 min-h-full">
                                    {dayTimeSlots.map(time => {
                                        const offShift = isSlotOffShift(s.id, time);
                                        return (
                                            <div 
                                                key={time} 
                                                onClick={() => !offShift && openBookingFor(s.id, time)}
                                                className={`h-20 border-b border-white/5 w-full transition-all relative ${
                                                    offShift 
                                                        ? 'bg-black/40 opacity-40 cursor-not-allowed bg-[linear-gradient(45deg,rgba(255,255,255,0.03)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.03)_50%,rgba(255,255,255,0.03)_75%,transparent_75%,transparent)] bg-[length:8px_8px]' 
                                                        : 'hover:bg-white/[0.03] cursor-pointer group/cell'
                                                }`}
                                                title={offShift ? 'Stylist is off-shift' : `Click to book at ${time} with ${s.full_name.trim().split(' ')[0]}`}
                                            >
                                                {!offShift && (
                                                    <Plus className="w-3.5 h-3.5 text-white/0 group-hover/cell:text-luxe-gold/30 group-hover/cell:scale-110 transition-all pointer-events-none" />
                                                )}
                                            </div>
                                        );
                                    })}
                                    {filteredBookings.filter(b => s.id === 'unassigned' 
                                        ? (!b.stylist_id || !staff.some(st => st.id === b.stylist_id))
                                        : b.stylist_id === s.id
                                    ).map(b => {
                                        const colors = statusColors[b.status] || statusColors.pending;
                                        const isCancelled = b.status === 'cancelled';
                                        const isConfirmed = b.status === 'confirmed';
                                        const isCompact = b.duration_hours < 0.75;
                                        return (
                                            <div
                                                key={b.id}
                                                onClick={() => setSelectedBooking(b)}
                                                className={`absolute left-1.5 right-1.5 rounded-r-xl rounded-l-md border border-white/5 border-l-4 ${colors.borderLeft} shadow-lg transition-all duration-300 ease-out hover:scale-[1.015] hover:shadow-2xl cursor-pointer group z-10 ${colors.bg} ${colors.text} ${isCancelled ? 'opacity-40 line-through' : ''} ${isConfirmed ? 'hover:shadow-[0_0_20px_rgba(212,175,55,0.2)]' : 'hover:shadow-lg'} ${isCompact ? 'p-2 flex flex-col justify-center' : 'p-3 flex flex-col'}`}
                                                style={{
                                                    top: `${(b.start_hour - startHour) * 80}px`,
                                                    height: `${Math.max(b.duration_hours * 80, 42)}px`
                                                }}
                                            >
                                                {isCompact ? (
                                                    <div className="flex flex-col justify-between h-full min-w-0">
                                                        <div className="flex justify-between items-center min-w-0 gap-1">
                                                            <p className="text-[10px] font-bold uppercase tracking-wide text-white truncate flex-1 min-w-0">
                                                                {b.client_name}
                                                            </p>
                                                            <span className="text-[9px] font-semibold opacity-75 truncate max-w-[45%] shrink-0">
                                                                {b.service_name}
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-[8px] font-medium opacity-65 mt-0.5">
                                                            <span>
                                                                {toSalonTimeStr(b.start_time, timezone || 'America/Chicago')}
                                                            </span>
                                                            <span className="text-[7px] font-extrabold uppercase px-1.5 py-0.5 bg-white/10 rounded tracking-wider">{b.status.replace('_', ' ')}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex justify-between items-start">
                                                            <div className="min-w-0">
                                                                <p className="text-[11px] font-bold uppercase tracking-wide text-white truncate">{b.client_name}</p>
                                                                <p className="text-[10px] font-medium mt-0.5 truncate opacity-75">{b.service_name}</p>
                                                            </div>
                                                            <Scissors className="w-3.5 h-3.5 opacity-30 group-hover:opacity-50 transition-opacity" />
                                                        </div>
                                                        <div className="mt-auto pt-1 flex items-center justify-between">
                                                            <span className="text-[9px] font-medium opacity-65">
                                                                {toSalonTimeStr(b.start_time, timezone || 'America/Chicago')}
                                                            </span>
                                                            <span className="text-[7px] font-extrabold uppercase px-1.5 py-0.5 bg-white/10 rounded tracking-wider">{b.status.replace('_', ' ')}</span>
                                                        </div>
                                                    </>
                                                )}
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
                <div className={`flex-1 glass-panel border border-white/5 overflow-y-auto overflow-x-auto custom-scrollbar p-6 space-y-6 transition-opacity duration-200 ${isFetching ? 'opacity-65' : 'opacity-100'}`}>
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
                                <div className="space-y-2 min-w-[650px] sm:min-w-0">
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
                                                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all hover:scale-[1.005] hover:bg-white/[0.04] hover:shadow-lg hover:border-white/10 cursor-pointer ${colors.border} bg-white/[0.02] ${isCancelled ? 'opacity-45 line-through' : ''}`}
                                            >
                                                {/* Time (Fixed Width) */}
                                                <div className="w-16 sm:w-20 shrink-0 text-center">
                                                    <p className="text-xs font-black text-white/70 leading-tight whitespace-nowrap">{timeStr}</p>
                                                </div>
                                                {/* Status bar (Fixed Width) */}
                                                <div className={`w-1 h-8 rounded-full shrink-0 ${colors.solidBg || colors.bg}`} />
                                                {/* Client + Service (Flex-1) */}
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <p className="text-sm font-bold truncate leading-tight">{b.client_name}</p>
                                                    <p className="text-[10px] text-white/40 truncate leading-tight mt-0.5">{b.service_name}</p>
                                                </div>
                                                {/* Stylist Details (Fixed Width) */}
                                                <div className="w-24 sm:w-36 shrink-0 flex items-center gap-1.5">
                                                    <div
                                                        className="w-6 h-6 rounded-full bg-white/5 border overflow-hidden flex items-center justify-center text-[9px] font-bold shrink-0"
                                                        style={{ borderColor: stylist?.color || 'rgba(255,255,255,0.1)', color: stylist?.color || '#999' }}
                                                    >
                                                        {stylist?.photo_url ? (
                                                            <img src={stylist.photo_url} alt={stylist.full_name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            stylist?.full_name?.trim().charAt(0) || '?'
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-white/50 font-medium hidden sm:block truncate">{stylist?.full_name?.trim().split(' ')[0] || '—'}</span>
                                                </div>
                                                {/* Price (Fixed Width) */}
                                                <span className="text-xs font-black text-luxe-gold w-10 sm:w-12 text-right shrink-0">${b.price}</span>
                                                {/* Status Badge (Fixed Width) */}
                                                <div className="w-20 sm:w-28 shrink-0 flex justify-center">
                                                    <span
                                                        onClick={() => handleStatusCycle(b)}
                                                        title={
                                                            b.status === 'pending_deposit' ? 'Deposit required — cannot advance'
                                                                : STATUS_FLOW[b.status] ? `Click → ${STATUS_FLOW[b.status].replace('_', ' ')}`
                                                                    : 'Final status'
                                                        }
                                                        className={`text-[8px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg shrink-0 w-full text-center truncate ${colors.bg} ${colors.text} ${b.status !== 'pending_deposit' && STATUS_FLOW[b.status] ? 'cursor-pointer hover:opacity-85 transition-opacity' : b.status === 'pending_deposit' ? 'cursor-not-allowed opacity-70' : ''}`}
                                                    >
                                                        {b.status.replace(/_/g, ' ')}
                                                    </span>
                                                </div>
                                                {/* Smart Payment Badge (Fixed Width) */}
                                                <div className="w-24 sm:w-32 shrink-0 flex items-center justify-end gap-1">
                                                    {(() => {
                                                        const isWalkin = b.client_name === 'Walk-in';
                                                        const hasDeposit = b.deposit_amount > 0;
                                                        const depositPaid = b.deposit_paid_amount > 0;
                                                        const isCompleted = b.status === 'completed';

                                                        if (isWalkin && !hasDeposit) {
                                                            return (
                                                                <span className="text-[8px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg shrink-0 w-full text-center truncate bg-orange-500/15 text-orange-300 border border-orange-500/30">
                                                                    Walk-in
                                                                </span>
                                                            );
                                                        }
                                                        if (!hasDeposit) {
                                                            return (
                                                                <span className="text-[8px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg shrink-0 w-full text-center truncate bg-luxe-gold/10 text-luxe-gold border border-luxe-gold/20">
                                                                    ${b.price}
                                                                </span>
                                                            );
                                                        }
                                                        if (isCompleted) {
                                                            return (
                                                                <span className="text-[8px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg shrink-0 w-full text-center truncate bg-green-500/15 text-green-300 border border-green-500/30">
                                                                    ✓ Paid
                                                                </span>
                                                            );
                                                        }
                                                        if (depositPaid) {
                                                            const remaining = b.price - (b.deposit_paid_amount || 0);
                                                            return (
                                                                <div className="flex gap-1 w-full justify-end min-w-0">
                                                                    <span className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-1 rounded-lg shrink-0 text-center truncate bg-green-500/15 text-green-300 border border-green-500/30 max-w-[50%]">
                                                                        Paid
                                                                    </span>
                                                                    {remaining > 0 && (
                                                                        <span className="text-[8px] font-bold uppercase tracking-wide px-1.5 py-1 rounded-lg shrink-0 text-center truncate bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 max-w-[50%]">
                                                                            ${remaining} Due
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            );
                                                        }
                                                        // Deposit required but not paid
                                                        return (
                                                            <span className="text-[8px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg shrink-0 w-full text-center truncate bg-red-500/15 text-red-300 border border-red-500/30">
                                                                ⏳ ${b.deposit_amount} Due
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
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
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-luxe-obsidian border border-white/10 rounded-2xl p-5 w-full max-w-md shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
                        {/* Sticky Header */}
                        <div className="flex justify-between items-center pb-3 border-b border-white/10 flex-shrink-0">
                            <h3 className="text-base font-bold flex items-center gap-2 text-white">
                                <UserPlus className="w-5 h-5 text-luxe-gold" />
                                Add Walk-in Customer
                            </h3>
                            <button onClick={() => { setShowModal(false); setPhoneError(''); }} title="Close" className="p-1.5 hover:bg-white/10 rounded-xl transition-all text-white/50 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Scrollable Form Body */}
                        <div className="flex-1 overflow-y-auto pr-1 my-3 space-y-4 max-h-[50vh] custom-scrollbar">
                            {/* Client Details Row (Inline) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1 block">Client Name *</label>
                                    <input
                                        value={wName} onChange={e => setWName(e.target.value)}
                                        placeholder="Jessica Martinez"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-luxe-gold/50 transition-all text-white placeholder-white/30"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1 block">Phone Number *
                                        <span className="ml-1 font-normal normal-case text-white/30">(International)</span>
                                    </label>
                                    <input
                                        value={wPhone}
                                        onChange={e => {
                                            setWPhone(e.target.value);
                                            if (phoneError) setPhoneError(validatePhone(e.target.value));
                                        }}
                                        onBlur={e => {
                                            const err = validatePhone(e.target.value);
                                            setPhoneError(err);
                                            // Auto-format on blur if valid
                                            if (!err) setWPhone(formatPhoneDisplay(e.target.value));
                                        }}
                                        placeholder="+1 555-0101 or +44 7911 123456"
                                        maxLength={20}
                                        className={`w-full bg-white/5 border rounded-xl px-3 py-2 text-xs outline-none transition-all text-white placeholder-white/30 ${
                                            phoneError
                                                ? 'border-red-500/70 focus:border-red-500'
                                                : wPhone && isPhoneValid
                                                    ? 'border-emerald-500/60 focus:border-emerald-500'
                                                    : 'border-white/10 focus:border-luxe-gold/50'
                                        }`}
                                    />
                                    {phoneError && (
                                        <p className="text-[9px] text-red-400 mt-1 flex items-center gap-1">
                                            <span>⚠</span> {phoneError}
                                        </p>
                                    )}
                                    {!phoneError && wPhone && isPhoneValid && (
                                        <p className="text-[9px] text-emerald-400 mt-1 flex items-center gap-1">
                                            <span>✓</span> Valid international number
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Service Items Custom Array Mapping */}
                            <div className="space-y-3 mt-4">
                                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block border-b border-white/10 pb-1">Requested Services / Guests</label>
                                
                                {wServiceItems.map((item, index) => (
                                    <div key={item.id} className="bg-white/5 border border-white/5 rounded-xl p-3 relative group">
                                        {wServiceItems.length > 1 && (
                                            <button onClick={() => removeServiceItem(item.id)} title="Remove Service" className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 shadow-xl transition-all">
                                                <X className="w-2.5 h-2.5" />
                                            </button>
                                        )}
                                        <div className="grid grid-cols-2 gap-3 mb-2">
                                            <div>
                                                <label className="text-[9px] font-bold text-white/40 uppercase mb-0.5 block">Service *</label>
                                                <select 
                                                    value={item.serviceId} 
                                                    onChange={e => updateServiceItem(item.id, 'serviceId', e.target.value)} 
                                                    title="Select service"
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-1.5 text-xs outline-none focus:border-luxe-gold/50 text-white"
                                                >
                                                    <option value="">Select service...</option>
                                                    {services.map(s => <option key={s.id} value={s.id}>{s.name} — ${s.price}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-bold text-white/40 uppercase mb-0.5 block">Stylist *</label>
                                                <select 
                                                    value={item.stylistId} 
                                                    onChange={e => updateServiceItem(item.id, 'stylistId', e.target.value)} 
                                                    title="Select stylist"
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-1.5 text-xs outline-none focus:border-luxe-gold/50 text-white"
                                                >
                                                    <option value="">Select stylist...</option>
                                                    {staff.map(s => <option key={s.id} value={s.id}>{s.full_name.trim().split(' ')[0]} ({s.role})</option>)}
                                                </select>
                                                {(() => {
                                                    if (!item.stylistId) return null;
                                                    const shift = getStylistShift(item.stylistId);
                                                    if (!shift || !shift.is_working) {
                                                        return <p className="text-[8px] text-red-400 mt-1 font-semibold">⚠️ Selected stylist is OFF today</p>;
                                                    }
                                                    return (
                                                        <p className="text-[8px] text-luxe-gold/80 mt-1 font-semibold">
                                                            🕒 Shift: {formatDbTime12h(shift.start_time)} - {formatDbTime12h(shift.end_time)}
                                                        </p>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {/* Start Time Custom Picker */}
                                            <div className="relative time-picker-container">
                                                <label className="text-[9px] font-bold text-white/40 uppercase mb-0.5 block">Start *</label>
                                                <button
                                                    type="button"
                                                    onClick={() => setActivePicker(activePicker === `${item.id}-start` ? null : `${item.id}-start`)}
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-1.5 text-xs text-white text-left flex items-center justify-between hover:border-luxe-gold/50 transition-all h-8"
                                                >
                                                    <span>{format24hTo12h(item.startTime)}</span>
                                                    <Clock className="w-3.5 h-3.5 text-white/30" />
                                                </button>
                                                
                                                {activePicker === `${item.id}-start` && (
                                                    <div className="absolute left-0 bottom-full mb-1.5 bg-luxe-obsidian border border-white/10 rounded-xl p-3 shadow-2xl z-50 flex flex-col gap-2.5 w-52 animate-in fade-in slide-in-from-bottom-1 duration-150">
                                                        {/* Quick Actions */}
                                                        <div className="flex gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    updateServiceItem(item.id, 'startTime', getSalonTime());
                                                                    setActivePicker(null);
                                                                }}
                                                                className="flex-1 bg-luxe-gold/10 border border-luxe-gold/20 hover:bg-luxe-gold/20 text-luxe-gold font-bold py-1 rounded text-[9px] uppercase tracking-wider transition-colors"
                                                            >
                                                                Current Time
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setActivePicker(null)}
                                                                className="px-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 py-1 rounded text-[9px] uppercase font-bold transition-colors"
                                                            >
                                                                Close
                                                            </button>
                                                        </div>
                                                        
                                                        {/* Scroller Columns Frame */}
                                                        <div className="relative border border-white/5 bg-black/35 rounded-lg p-1.5 flex items-center justify-between">
                                                            {/* Hours Column */}
                                                            <div className="flex-1 flex flex-col items-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const { h12, m, ampm } = parse24hTime(item.startTime);
                                                                        const nextH = h12 === 1 ? 12 : h12 - 1;
                                                                        updateServiceItem(item.id, 'startTime', convert12hTo24h(nextH, m, ampm));
                                                                    }}
                                                                    className="text-white/40 hover:text-luxe-gold p-0.5 transition-colors"
                                                                >
                                                                    <ChevronUp className="w-3.5 h-3.5" />
                                                                </button>
                                                                <div ref={activePicker === `${item.id}-start` ? hourScrollRef : null} className="h-8 overflow-y-auto scroll-smooth flex flex-col w-full py-[6px] relative scrollbar-none">
                                                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(h => {
                                                                        const { h12 } = parse24hTime(item.startTime);
                                                                        const isSelected = h12 === h;
                                                                        return (
                                                                            <button
                                                                                key={h}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const { m, ampm } = parse24hTime(item.startTime);
                                                                                    updateServiceItem(item.id, 'startTime', convert12hTo24h(h, m, ampm));
                                                                                }}
                                                                                className={`py-0.5 text-xs w-full text-center transition-all ${isSelected ? 'text-luxe-gold font-black scale-110' : 'text-white/40 hover:text-white/80'}`}
                                                                            >
                                                                                {String(h).padStart(2, '0')}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const { h12, m, ampm } = parse24hTime(item.startTime);
                                                                        const nextH = h12 === 12 ? 1 : h12 + 1;
                                                                        updateServiceItem(item.id, 'startTime', convert12hTo24h(nextH, m, ampm));
                                                                    }}
                                                                    className="text-white/40 hover:text-luxe-gold p-0.5 transition-colors"
                                                                >
                                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                            
                                                            <span className="text-white/20 font-black text-xs shrink-0 mx-0.5">:</span>
                                                            
                                                            {/* Minutes Column */}
                                                            <div className="flex-1 flex flex-col items-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const { h12, m, ampm } = parse24hTime(item.startTime);
                                                                        const nextM = getNextMinute(m, -10);
                                                                        updateServiceItem(item.id, 'startTime', convert12hTo24h(h12, nextM, ampm));
                                                                    }}
                                                                    className="text-white/40 hover:text-luxe-gold p-0.5 transition-colors"
                                                                >
                                                                    <ChevronUp className="w-3.5 h-3.5" />
                                                                </button>
                                                                <div ref={activePicker === `${item.id}-start` ? minuteScrollRef : null} className="h-8 overflow-y-auto scroll-smooth flex flex-col w-full py-[6px] relative scrollbar-none">
                                                                    {[0, 10, 20, 30, 40, 50].map(m => {
                                                                        const { m: currentM } = parse24hTime(item.startTime);
                                                                        let snappedM = Math.round(currentM / 10) * 10;
                                                                        if (snappedM === 60) snappedM = 0;
                                                                        const isSelected = snappedM === m;
                                                                        return (
                                                                            <button
                                                                                key={m}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const { h12, ampm } = parse24hTime(item.startTime);
                                                                                    updateServiceItem(item.id, 'startTime', convert12hTo24h(h12, m, ampm));
                                                                                }}
                                                                                className={`py-0.5 text-xs w-full text-center transition-all ${isSelected ? 'text-luxe-gold font-black scale-110' : 'text-white/40 hover:text-white/80'}`}
                                                                            >
                                                                                {String(m).padStart(2, '0')}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const { h12, m, ampm } = parse24hTime(item.startTime);
                                                                        const nextM = getNextMinute(m, 10);
                                                                        updateServiceItem(item.id, 'startTime', convert12hTo24h(h12, nextM, ampm));
                                                                    }}
                                                                    className="text-white/40 hover:text-luxe-gold p-0.5 transition-colors"
                                                                >
                                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                            
                                                            {/* AM/PM Column */}
                                                            <div className="flex-1 flex flex-col items-center border-l border-white/5 ml-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const { h12, m, ampm } = parse24hTime(item.startTime);
                                                                        const nextAp = ampm === 'AM' ? 'PM' : 'AM';
                                                                        updateServiceItem(item.id, 'startTime', convert12hTo24h(h12, m, nextAp));
                                                                    }}
                                                                    className="text-white/40 hover:text-luxe-gold p-0.5 transition-colors"
                                                                >
                                                                    <ChevronUp className="w-3.5 h-3.5" />
                                                                </button>
                                                                <div ref={activePicker === `${item.id}-start` ? ampmScrollRef : null} className="h-8 overflow-y-auto scroll-smooth flex flex-col w-full py-[6px] relative scrollbar-none">
                                                                    {['AM', 'PM'].map(ap => {
                                                                        const { ampm } = parse24hTime(item.startTime);
                                                                        const isSelected = ampm === ap;
                                                                        return (
                                                                            <button
                                                                                key={ap}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const { h12, m } = parse24hTime(item.startTime);
                                                                                    updateServiceItem(item.id, 'startTime', convert12hTo24h(h12, m, ap));
                                                                                }}
                                                                                className={`py-0.5 px-2 text-[9px] font-black rounded transition-all ${isSelected ? 'bg-luxe-gold text-luxe-obsidian scale-105' : 'text-white/40 hover:text-white/80'}`}
                                                                            >
                                                                                {ap}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const { h12, m, ampm } = parse24hTime(item.startTime);
                                                                        const nextAp = ampm === 'AM' ? 'PM' : 'AM';
                                                                        updateServiceItem(item.id, 'startTime', convert12hTo24h(h12, m, nextAp));
                                                                    }}
                                                                    className="text-white/40 hover:text-luxe-gold p-0.5 transition-colors"
                                                                >
                                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* End Time Custom Picker */}
                                            <div className="relative time-picker-container">
                                                <label className="text-[9px] font-bold text-white/40 uppercase mb-0.5 block">End *</label>
                                                <button
                                                    type="button"
                                                    onClick={() => setActivePicker(activePicker === `${item.id}-end` ? null : `${item.id}-end`)}
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-1.5 text-xs text-white text-left flex items-center justify-between hover:border-luxe-gold/50 transition-all h-8"
                                                >
                                                    <span>{format24hTo12h(item.endTime)}</span>
                                                    <Clock className="w-3.5 h-3.5 text-white/30" />
                                                </button>
                                                
                                                {activePicker === `${item.id}-end` && (
                                                    <div className="absolute right-0 bottom-full mb-1.5 bg-luxe-obsidian border border-white/10 rounded-xl p-3 shadow-2xl z-50 flex flex-col gap-2.5 w-52 animate-in fade-in slide-in-from-bottom-1 duration-150">
                                                        {/* Quick Actions */}
                                                        <div className="flex gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    updateServiceItem(item.id, 'endTime', getSalonTime());
                                                                    setActivePicker(null);
                                                                }}
                                                                className="flex-1 bg-luxe-gold/10 border border-luxe-gold/20 hover:bg-luxe-gold/20 text-luxe-gold font-bold py-1 rounded text-[9px] uppercase tracking-wider transition-colors"
                                                            >
                                                                Current Time
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setActivePicker(null)}
                                                                className="px-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 py-1 rounded text-[9px] uppercase font-bold transition-colors"
                                                            >
                                                                Close
                                                            </button>
                                                        </div>
                                                        
                                                        {/* Scroller Columns Frame */}
                                                        <div className="relative border border-white/5 bg-black/35 rounded-lg p-1.5 flex items-center justify-between">
                                                            {/* Hours Column */}
                                                            <div className="flex-1 flex flex-col items-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const { h12, m, ampm } = parse24hTime(item.endTime);
                                                                        const nextH = h12 === 1 ? 12 : h12 - 1;
                                                                        updateServiceItem(item.id, 'endTime', convert12hTo24h(nextH, m, ampm));
                                                                    }}
                                                                    className="text-white/40 hover:text-luxe-gold p-0.5 transition-colors"
                                                                >
                                                                    <ChevronUp className="w-3.5 h-3.5" />
                                                                </button>
                                                                <div ref={activePicker === `${item.id}-end` ? hourScrollRef : null} className="h-8 overflow-y-auto scroll-smooth flex flex-col w-full py-[6px] relative scrollbar-none">
                                                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(h => {
                                                                        const { h12 } = parse24hTime(item.endTime);
                                                                        const isSelected = h12 === h;
                                                                        return (
                                                                            <button
                                                                                key={h}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const { m, ampm } = parse24hTime(item.endTime);
                                                                                    updateServiceItem(item.id, 'endTime', convert12hTo24h(h, m, ampm));
                                                                                }}
                                                                                className={`py-0.5 text-xs w-full text-center transition-all ${isSelected ? 'text-luxe-gold font-black scale-110' : 'text-white/40 hover:text-white/80'}`}
                                                                            >
                                                                                {String(h).padStart(2, '0')}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const { h12, m, ampm } = parse24hTime(item.endTime);
                                                                        const nextH = h12 === 12 ? 1 : h12 + 1;
                                                                        updateServiceItem(item.id, 'endTime', convert12hTo24h(nextH, m, ampm));
                                                                    }}
                                                                    className="text-white/40 hover:text-luxe-gold p-0.5 transition-colors"
                                                                >
                                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                            
                                                            <span className="text-white/20 font-black text-xs shrink-0 mx-0.5">:</span>
                                                            
                                                            {/* Minutes Column */}
                                                            <div className="flex-1 flex flex-col items-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const { h12, m, ampm } = parse24hTime(item.endTime);
                                                                        const nextM = getNextMinute(m, -10);
                                                                        updateServiceItem(item.id, 'endTime', convert12hTo24h(h12, nextM, ampm));
                                                                    }}
                                                                    className="text-white/40 hover:text-luxe-gold p-0.5 transition-colors"
                                                                >
                                                                    <ChevronUp className="w-3.5 h-3.5" />
                                                                </button>
                                                                <div ref={activePicker === `${item.id}-end` ? minuteScrollRef : null} className="h-8 overflow-y-auto scroll-smooth flex flex-col w-full py-[6px] relative scrollbar-none">
                                                                    {[0, 10, 20, 30, 40, 50].map(m => {
                                                                        const { m: currentM } = parse24hTime(item.endTime);
                                                                        let snappedM = Math.round(currentM / 10) * 10;
                                                                        if (snappedM === 60) snappedM = 0;
                                                                        const isSelected = snappedM === m;
                                                                        return (
                                                                            <button
                                                                                key={m}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const { h12, ampm } = parse24hTime(item.endTime);
                                                                                    updateServiceItem(item.id, 'endTime', convert12hTo24h(h12, m, ampm));
                                                                                }}
                                                                                className={`py-0.5 text-xs w-full text-center transition-all ${isSelected ? 'text-luxe-gold font-black scale-110' : 'text-white/40 hover:text-white/80'}`}
                                                                            >
                                                                                {String(m).padStart(2, '0')}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const { h12, m, ampm } = parse24hTime(item.endTime);
                                                                        const nextM = getNextMinute(m, 10);
                                                                        updateServiceItem(item.id, 'endTime', convert12hTo24h(h12, nextM, ampm));
                                                                    }}
                                                                    className="text-white/40 hover:text-luxe-gold p-0.5 transition-colors"
                                                                >
                                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                            
                                                            {/* AM/PM Column */}
                                                            <div className="flex-1 flex flex-col items-center border-l border-white/5 ml-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const { h12, m, ampm } = parse24hTime(item.endTime);
                                                                        const nextAp = ampm === 'AM' ? 'PM' : 'AM';
                                                                        updateServiceItem(item.id, 'endTime', convert12hTo24h(h12, m, nextAp));
                                                                    }}
                                                                    className="text-white/40 hover:text-luxe-gold p-0.5 transition-colors"
                                                                >
                                                                    <ChevronUp className="w-3.5 h-3.5" />
                                                                </button>
                                                                <div ref={activePicker === `${item.id}-end` ? ampmScrollRef : null} className="h-8 overflow-y-auto scroll-smooth flex flex-col w-full py-[6px] relative scrollbar-none">
                                                                    {['AM', 'PM'].map(ap => {
                                                                        const { ampm } = parse24hTime(item.endTime);
                                                                        const isSelected = ampm === ap;
                                                                        return (
                                                                            <button
                                                                                key={ap}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const { h12, m } = parse24hTime(item.endTime);
                                                                                    updateServiceItem(item.id, 'endTime', convert12hTo24h(h12, m, ap));
                                                                                }}
                                                                                className={`py-0.5 px-2 text-[9px] font-black rounded transition-all ${isSelected ? 'bg-luxe-gold text-luxe-obsidian scale-105' : 'text-white/40 hover:text-white/80'}`}
                                                                            >
                                                                                {ap}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const { h12, m, ampm } = parse24hTime(item.endTime);
                                                                        const nextAp = ampm === 'AM' ? 'PM' : 'AM';
                                                                        updateServiceItem(item.id, 'endTime', convert12hTo24h(h12, m, nextAp));
                                                                    }}
                                                                    className="text-white/40 hover:text-luxe-gold p-0.5 transition-colors"
                                                                >
                                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {/* Optional Guest Name for group bookings */}
                                        <div className="mt-2">
                                            <input 
                                                value={item.guestName} 
                                                onChange={e => updateServiceItem(item.id, 'guestName', e.target.value)} 
                                                placeholder="Guest Name (Optional — Group Booking)" 
                                                className="w-full bg-black/40 border border-white/5 rounded-lg p-1.5 text-[11px] outline-none focus:border-luxe-gold/50 text-white placeholder-white/20" 
                                            />
                                        </div>
                                    </div>
                                ))}

                                <button 
                                    onClick={addServiceItem} 
                                    className="w-full border border-dashed border-white/10 hover:border-luxe-gold/30 text-white/45 hover:text-luxe-gold rounded-xl py-2 flex justify-center items-center gap-1.5 transition-all text-[11px] font-bold uppercase tracking-wider"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add Service / Guest
                                </button>
                            </div>

                            {/* Auto-Repeat Appointment Box */}
                            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 mt-3">
                                <label className="text-[10px] font-bold text-luxe-gold uppercase tracking-wider mb-2 block">
                                    🔁 Auto-Repeat Appointment
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <select
                                        value={wRecurring} onChange={e => setWRecurring(e.target.value as any)}
                                        title="Repeat Frequency"
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-1.5 text-xs outline-none focus:border-luxe-gold/50 text-white"
                                    >
                                        <option value="none">Do Not Repeat</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="biweekly">Every 2 Weeks</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                    
                                    {wRecurring !== 'none' && (
                                        <select
                                            value={wRecurringCount} onChange={e => setWRecurringCount(Number(e.target.value))}
                                            title="Number of repeats"
                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-1.5 text-xs outline-none focus:border-luxe-gold/50 text-white font-bold"
                                        >
                                            <option value={2}>2 Times Total</option>
                                            <option value={3}>3 Times Total</option>
                                            <option value={4}>4 Times Total</option>
                                            <option value={5}>5 Times Total</option>
                                            <option value={8}>8 Times Total</option>
                                            <option value={12}>12 Times Total</option>
                                        </select>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Sticky Footer */}
                        <div className="pt-3 border-t border-white/10 flex-shrink-0">
                            <button
                                onClick={handleWalkin}
                                disabled={saving || !isFormValid}
                                className="w-full bg-gold-gradient text-luxe-obsidian font-bold py-2.5 rounded-xl shadow-lg shadow-luxe-gold/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-xs"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                {saving ? 'BOOKING...' : 'CONFIRM WALK-IN'}
                            </button>
                        </div>
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
