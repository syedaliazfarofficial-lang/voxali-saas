import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    TrendingUp,
    BarChart3,
    PieChart as PieIcon,
    DollarSign,
    Calendar,
    Loader2,
    Download,
    CreditCard,
    Wallet,
    Scissors,
    ShoppingBag,
    Users,
    Plus,
    X,
    Banknote,
    Receipt,
    CheckCircle2
} from 'lucide-react';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import { supabaseAdmin } from '../lib/supabase';
import { useTenant } from '../context/TenantContext';
import { generateMasterReportPDF, generateSalaryReportPDF, generateIndividualStaffReportPDF, generateAnalyticsReportPDF } from '../utils/pdfGenerator';
import { Skeleton } from './ui/Skeleton';
import { FeatureLock } from './ui/FeatureLock';

interface RevDay { day: string; revenue: number; booking_count: number }
interface ServiceRow { service_name: string; booking_count: number; total_revenue: number }
interface ProductRow { product_name: string; sales_count: number; total_revenue: number }
interface StatusRow { status: string; count: number }
interface PaymentRow { method: string; amount: number; count: number }

const STATUS_COLORS: Record<string, string> = {
    confirmed: '#22c55e',
    completed: '#3b82f6',
    pending: '#f97316',
    pending_deposit: '#eab308',
    cancelled: '#ef4444',
    no_show: '#6b7280',
    checked_in: '#14b8a6',
    in_progress: '#a855f7',
};

export const Analytics: React.FC = () => {
    const { tenantId, salonName, logoUrl } = useTenant();
    const [activeTab, setActiveTab] = useState<'overview' | 'drawer' | 'staff' | 'sales' | 'pnl'>('overview');
    
    // Overview Data
    const [revData, setRevData] = useState<RevDay[]>([]);
    const [services, setServices] = useState<ServiceRow[]>([]);
    const [products, setProducts] = useState<ProductRow[]>([]);
    const [statuses, setStatuses] = useState<StatusRow[]>([]);
    const [peakHours, setPeakHours] = useState<{hour: string, count: number}[]>([]);
    const [salesBreakdown, setSalesBreakdown] = useState<{type: string, value: number}[]>([]);
    const [days, setDays] = useState(30);
    
    // Drawer Data
    const [drawerData, setDrawerData] = useState<PaymentRow[]>([]);
    const [totalExpectedCash, setTotalExpectedCash] = useState(0);
    const [dailyDrawerLogs, setDailyDrawerLogs] = useState<{date: string, cash: number, card: number, other: number}[]>([]);
    
    // Staff Data
    const [staffData, setStaffData] = useState<{
        id: string; name: string; color: string;
        base_salary: number; commission_percent: number;
        bookings_count: number; service_revenue: number;
        commission_earned: number; tip_amount: number;
        already_paid: number; gross_payout: number; total_payout: number;
        isUnassigned?: boolean;
        photo_url?: string;
    }[]>([]);

    // Payout modal state
    const [showPayoutModal, setShowPayoutModal] = useState(false);
    const [payoutStaff, setPayoutStaff] = useState<any>(null);
    const [payoutAmount, setPayoutAmount] = useState('');
    const [payoutType, setPayoutType] = useState('salary_clearance');
    const [payoutNotes, setPayoutNotes] = useState('');
    const [savingPayout, setSavingPayout] = useState(false);

    // P&L Data
    const [expenses, setExpenses] = useState<any[]>([]);
    const [staffPaymentsList, setStaffPaymentsList] = useState<any[]>([]);
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [expTitle, setExpTitle] = useState('');
    const [expCat, setExpCat] = useState('supplies');
    const [expAmt, setExpAmt] = useState('');
    const [expNotes, setExpNotes] = useState('');
    const [addingExp, setAddingExp] = useState(false);

    // Loading states
    const [loadingOverview, setLoadingOverview] = useState(true);
    const [loadingDrawer, setLoadingDrawer] = useState(false);
    const [loadingStaff, setLoadingStaff] = useState(false);
    const [loadingPnL, setLoadingPnL] = useState(false);

    // Track which sub-tabs have already been fetched
    const loadedTabs = useRef<Set<string>>(new Set());

    // ─── OVERVIEW + SALES fetch ───
    const fetchOverviewData = useCallback(async () => {
        if (!tenantId) return;
        setLoadingOverview(true);
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const startDateStr = startDate.toISOString();

            const { data: bookings } = await supabaseAdmin
                .from('bookings')
                .select(`id, start_time, total_price, status, service_id, services (name), stylist_id, booking_items (name_snapshot, price_snapshot)`)
                .eq('tenant_id', tenantId)
                .gte('start_time', startDateStr);

            const activeBookings = (bookings || []).filter((b: any) => b.status !== 'cancelled' && b.status !== 'no_show');

            // Revenue by day
            const dayMap: Record<string, { revenue: number; booking_count: number }> = {};
            for (let i = 0; i <= days; i++) {
                const d = new Date(); d.setDate(d.getDate() - days + i);
                dayMap[d.toISOString().split('T')[0]] = { revenue: 0, booking_count: 0 };
            }
            activeBookings.forEach((b: any) => {
                const key = new Date(b.start_time).toISOString().split('T')[0];
                if (dayMap[key]) { dayMap[key].revenue += Number(b.total_price) || 0; dayMap[key].booking_count += 1; }
            });
            setRevData(Object.entries(dayMap).map(([day, v]) => ({
                day: new Date(day + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                revenue: v.revenue, booking_count: v.booking_count,
            })));

            // Services, Products + Sales Breakdown
            const svcMap: Record<string, { booking_count: number; total_revenue: number }> = {};
            const productsMap: Record<string, { sales_count: number; total_revenue: number }> = {};
            let serviceRev = 0, productRev = 0;
            activeBookings.forEach((b: any) => {
                const bItems = b.booking_items || [];
                if (bItems.length === 0) {
                    const lineTotal = Number(b.total_price) || 0;
                    const sn = b.services?.name || 'Unknown Service';
                    if (sn.startsWith('[RETAIL]') || sn.startsWith('[CUSTOM]') || sn.includes('Custom Charge') || sn.includes('Retail')) {
                        productRev += lineTotal;
                        const cleanedName = sn.replace('[RETAIL]', '').replace('[CUSTOM]', '').replace('Custom Charge', 'Custom Service').trim();
                        if (!productsMap[cleanedName]) productsMap[cleanedName] = { sales_count: 0, total_revenue: 0 };
                        productsMap[cleanedName].sales_count += 1;
                        productsMap[cleanedName].total_revenue += lineTotal;
                    } else {
                        serviceRev += lineTotal;
                        if (!svcMap[sn]) svcMap[sn] = { booking_count: 0, total_revenue: 0 };
                        svcMap[sn].booking_count += 1;
                        svcMap[sn].total_revenue += lineTotal;
                    }
                } else {
                    bItems.forEach((item: any) => {
                        const iName = item.name_snapshot || 'Unknown Item', iPrice = Number(item.price_snapshot) || 0;
                        if (iName.startsWith('[RETAIL]') || iName.startsWith('[CUSTOM]') || iName.includes('Retail')) {
                            productRev += iPrice;
                            const cleanedName = iName.replace('[RETAIL]', '').replace('[CUSTOM]', '').trim();
                            if (!productsMap[cleanedName]) productsMap[cleanedName] = { sales_count: 0, total_revenue: 0 };
                            productsMap[cleanedName].sales_count += 1;
                            productsMap[cleanedName].total_revenue += iPrice;
                        } else {
                            serviceRev += iPrice;
                            const cleanedName = iName;
                            if (!svcMap[cleanedName]) svcMap[cleanedName] = { booking_count: 0, total_revenue: 0 };
                            svcMap[cleanedName].total_revenue += iPrice;
                        }
                    });
                    const uniqueServices = new Set<string>(
                        bItems
                            .filter((i: any) => !i.name_snapshot?.startsWith('[RETAIL]') && !i.name_snapshot?.startsWith('[CUSTOM]') && !i.name_snapshot?.includes('Retail'))
                            .map((i: any) => i.name_snapshot || 'Unknown')
                    );
                    uniqueServices.forEach(svc => { if (svcMap[svc]) svcMap[svc].booking_count += 1; });
                }
            });
            setServices(Object.entries(svcMap).map(([service_name, v]) => ({ service_name, ...v })).sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 10));
            setProducts(Object.entries(productsMap).map(([product_name, v]) => ({ product_name, ...v })).sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 10));
            setSalesBreakdown([{ type: 'Salon Services', value: serviceRev }, { type: 'Retail & Custom', value: productRev }].filter(d => d.value > 0));

            // Statuses
            const statusMap: Record<string, number> = {};
            (bookings || []).forEach((b: any) => { statusMap[b.status] = (statusMap[b.status] || 0) + 1; });
            setStatuses(Object.entries(statusMap).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count));

            // Peak Hours
            const hourMap: Record<number, number> = {};
            activeBookings.forEach((b: any) => { if (b.start_time) { const h = new Date(b.start_time).getHours(); hourMap[h] = (hourMap[h] || 0) + 1; } });
            const hourData = [];
            for (let i = 6; i <= 22; i++) {
                const ampm = i >= 12 ? 'PM' : 'AM', displayNum = i > 12 ? i - 12 : (i === 0 ? 12 : i);
                hourData.push({ hour: `${displayNum} ${ampm}`, count: hourMap[i] || 0 });
            }
            setPeakHours(hourData);
        } catch (err) { console.error('Analytics overview fetch error:', err); }
        finally { setLoadingOverview(false); }
    }, [days, tenantId]);

    // ─── STAFF fetch ───
    const fetchStaffData = useCallback(async () => {
        if (!tenantId) return;
        setLoadingStaff(true);
        try {
            const startDate = new Date(); startDate.setDate(startDate.getDate() - days);
            const startDateStr = startDate.toISOString();
            const [{ data: staffList }, { data: periodPayments }, { data: bookings }, { data: staffPayouts }] = await Promise.all([
                supabaseAdmin.rpc('rpc_staff_board', { p_tenant_id: tenantId }),
                supabaseAdmin.from('payments').select('booking_id, tip_amount').eq('tenant_id', tenantId).gte('created_at', startDateStr).gt('tip_amount', 0),
                supabaseAdmin.from('bookings').select('id, start_time, total_price, status, stylist_id, booking_items(name_snapshot, price_snapshot)').eq('tenant_id', tenantId).gte('start_time', startDateStr),
                supabaseAdmin.from('staff_payments').select('staff_id, amount').eq('tenant_id', tenantId).gte('payment_date', startDateStr)
            ]);

            const tipMap: Record<string, number> = {};
            (periodPayments || []).forEach((p: any) => { if (p.booking_id && p.tip_amount) tipMap[p.booking_id] = (tipMap[p.booking_id] || 0) + Number(p.tip_amount); });

            const payoutMap: Record<string, number> = {};
            (staffPayouts || []).forEach((p: any) => {
                if (p.staff_id && p.amount) {
                    payoutMap[p.staff_id] = (payoutMap[p.staff_id] || 0) + Number(p.amount);
                }
            });

            const activeBookings = (bookings || []).filter((b: any) => b.status !== 'cancelled' && b.status !== 'no_show');
            const staffRevMap: Record<string, any> = {};
            (staffList || []).forEach((s: any) => { 
                staffRevMap[s.id] = { 
                    id: s.id, 
                    name: s.full_name, 
                    color: s.color || '#ffffff', 
                    base_salary: Number(s.base_salary) || 0, 
                    commission_percent: Number(s.commission_rate) || 0, 
                    bookings_count: 0, 
                    service_revenue: 0, 
                    tip_amount: 0,
                    already_paid: payoutMap[s.id] || 0,
                    photo_url: s.photo_url
                }; 
            });

            let unassignedRev = 0;
            let unassignedCount = 0;

            activeBookings.forEach((b: any) => {
                const sid = b.stylist_id; 
                
                // Calculate service-only revenue (exclude retail products)
                let bookingServiceRev = 0;
                const bItems = b.booking_items || [];
                if (bItems.length === 0) {
                    bookingServiceRev = Number(b.total_price) || 0;
                } else {
                    bItems.forEach((item: any) => {
                        const iName = item.name_snapshot || 'Unknown Item', iPrice = Number(item.price_snapshot) || 0;
                        if (!iName.startsWith('[RETAIL]') && !iName.startsWith('[CUSTOM]') && !iName.includes('Retail')) {
                            bookingServiceRev += iPrice;
                        }
                    });
                }

                if (!sid || !staffRevMap[sid]) {
                    unassignedCount += 1;
                    unassignedRev += bookingServiceRev;
                    return;
                }
                staffRevMap[sid].bookings_count += 1;
                staffRevMap[sid].service_revenue += bookingServiceRev;
                if (tipMap[b.id]) staffRevMap[sid].tip_amount += tipMap[b.id];
            });

            const list = Object.values(staffRevMap).map((d: any) => { 
                const ce = d.service_revenue * (d.commission_percent / 100); 
                const gross = d.base_salary + ce + d.tip_amount;
                const net = gross - d.already_paid;
                return { 
                    ...d, 
                    commission_earned: ce, 
                    gross_payout: gross, 
                    total_payout: net 
                }; 
            }).sort((a, b) => b.gross_payout - a.gross_payout);

            if (unassignedRev > 0 || unassignedCount > 0) {
                list.push({
                    id: 'unassigned',
                    name: 'Unassigned (No Stylist)',
                    color: '#6b7280',
                    base_salary: 0,
                    commission_percent: 0,
                    bookings_count: unassignedCount,
                    service_revenue: unassignedRev,
                    commission_earned: 0,
                    tip_amount: 0,
                    already_paid: 0,
                    gross_payout: 0,
                    total_payout: 0,
                    isUnassigned: true
                });
            }

            setStaffData(list);
        } catch (err) { console.error('Analytics staff fetch error:', err); }
        finally { setLoadingStaff(false); }
    }, [days, tenantId]);

    // ─── DRAWER fetch ───
    const fetchDrawerData = useCallback(async () => {
        if (!tenantId) return;
        setLoadingDrawer(true);
        try {
            const startDate = new Date(); startDate.setDate(startDate.getDate() - days);
            const { data: allPayments } = await supabaseAdmin.from('payments').select('id, created_at, amount, payment_method').eq('tenant_id', tenantId).gte('created_at', startDate.toISOString());

            const todayStr = new Date().toISOString().split('T')[0];
            const todayPayments = (allPayments || []).filter((p: any) => p.created_at && new Date(p.created_at).toISOString().split('T')[0] === todayStr);

            const pMap: Record<string, { amount: number; count: number }> = { cash: { amount: 0, count: 0 }, card: { amount: 0, count: 0 }, other: { amount: 0, count: 0 } };
            todayPayments.forEach((p: any) => {
                const method = p.payment_method?.toLowerCase() || 'other', amt = Number(p.amount) || 0;
                if (method.includes('cash')) { pMap.cash.amount += amt; pMap.cash.count += 1; }
                else if (method.includes('card')) { pMap.card.amount += amt; pMap.card.count += 1; }
                else { pMap.other.amount += amt; pMap.other.count += 1; }
            });
            setDrawerData([{ method: 'Cash', ...pMap.cash }, { method: 'Card (Terminal/Online)', ...pMap.card }, { method: 'Other', ...pMap.other }].filter(d => d.amount > 0 || d.method === 'Cash'));
            setTotalExpectedCash(pMap.cash.amount);

            const dailyLogsMap: Record<string, { cash: number; card: number; other: number }> = {};
            for (let i = 0; i <= days; i++) { const d = new Date(); d.setDate(d.getDate() - days + i); dailyLogsMap[d.toISOString().split('T')[0]] = { cash: 0, card: 0, other: 0 }; }
            (allPayments || []).forEach((p: any) => {
                if (!p.created_at) return;
                const key = new Date(p.created_at).toISOString().split('T')[0], method = p.payment_method?.toLowerCase() || 'other', amt = Number(p.amount) || 0;
                if (dailyLogsMap[key]) { if (method.includes('cash')) dailyLogsMap[key].cash += amt; else if (method.includes('card')) dailyLogsMap[key].card += amt; else dailyLogsMap[key].other += amt; }
            });
            setDailyDrawerLogs(Object.entries(dailyLogsMap).map(([date, vals]) => ({ date, ...vals })).sort((a, b) => a.date.localeCompare(b.date)));
        } catch (err) { console.error('Analytics drawer fetch error:', err); }
        finally { setLoadingDrawer(false); }
    }, [days, tenantId]);

    // ─── P&L fetch ───
    const fetchPnLData = useCallback(async () => {
        if (!tenantId) return;
        setLoadingPnL(true);
        try {
            const startDate = new Date(); startDate.setDate(startDate.getDate() - days);
            const startDateStr = startDate.toISOString();
            const [{ data: expData }, { data: spData }] = await Promise.all([
                supabaseAdmin.from('expenses').select('*').eq('tenant_id', tenantId).gte('expense_date', startDateStr.split('T')[0]),
                supabaseAdmin.from('staff_payments').select('*, staff(full_name)').eq('tenant_id', tenantId).gte('payment_date', startDateStr)
            ]);
            setExpenses(expData || []);
            setStaffPaymentsList(spData || []);
        } catch (err) { console.error('Analytics P&L fetch error:', err); }
        finally { setLoadingPnL(false); }
    }, [days, tenantId]);

    // Overview loads on mount and when days changes
    useEffect(() => { loadedTabs.current.clear(); fetchOverviewData(); }, [fetchOverviewData, days]);

    // Lazy tab loaders
    useEffect(() => {
        if (activeTab === 'staff' && !loadedTabs.current.has('staff')) { loadedTabs.current.add('staff'); fetchStaffData(); }
        if (activeTab === 'drawer' && !loadedTabs.current.has('drawer')) { loadedTabs.current.add('drawer'); fetchDrawerData(); }
        if (activeTab === 'pnl' && !loadedTabs.current.has('pnl')) { loadedTabs.current.add('pnl'); fetchPnLData(); }
    }, [activeTab, fetchStaffData, fetchDrawerData, fetchPnLData]);

    const totalRevenue = revData.reduce((s, r) => s + r.revenue, 0);
    const totalBookings = revData.reduce((s, r) => s + r.booking_count, 0);
    const avgPerBooking = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    const handleOpenPayoutModal = (staff: any) => {
        setPayoutStaff(staff);
        setPayoutAmount(String(staff.total_payout.toFixed(0)));
        setPayoutType('commission_payout');
        setPayoutNotes(`Commission and salary payout for the last ${days} days`);
        setShowPayoutModal(true);
    };

    const handleSavePayout = async () => {
        if (!payoutStaff || !payoutAmount) return;
        setSavingPayout(true);
        try {
            const { error } = await supabaseAdmin.from('staff_payments').insert({
                tenant_id: tenantId,
                staff_id: payoutStaff.id,
                amount: parseFloat(payoutAmount),
                payment_type: payoutType,
                notes: payoutNotes || null
            });
            if (error) throw error;
            setShowPayoutModal(false);
            setPayoutAmount(''); setPayoutNotes('');
            // Clear P&L cache and refresh P&L list & Staff list
            loadedTabs.current.delete('pnl');
            fetchPnLData();
            fetchStaffData();
        } catch (err: any) {
            console.error('Error saving staff payout:', err);
        }
        setSavingPayout(false);
    };

    const handleAddExpense = async () => {
        if (!expTitle || !expAmt) return;
        setAddingExp(true);
        try {
            const { error } = await supabaseAdmin.from('expenses').insert({
                tenant_id: tenantId,
                title: expTitle,
                category: expCat,
                amount: parseFloat(expAmt),
                notes: expNotes
            });
            if (error) throw error;
            setShowAddExpense(false);
            setExpTitle(''); setExpAmt(''); setExpNotes(''); setExpCat('supplies');
            loadedTabs.current.delete('pnl');
            fetchPnLData();
        } catch (err: unknown) {
            console.error('Error adding expense:', err);
        }
        setAddingExp(false);
    };

    const exportPDF = () => {
        generateAnalyticsReportPDF({
            salonName: salonName || 'Voxali Salon',
            dateRangeStr: `Last ${days} Days`,
            dailyData: revData
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            {/* Header & Controls */}
            <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-4 mb-4">
                <div className="flex items-center gap-2.5 flex-shrink-0">
                    <div className="p-2 bg-white/5 rounded-xl border border-white/10">
                        <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold whitespace-nowrap text-white">Analytics Center</h3>
                        <p className="text-[9px] text-white/40 uppercase tracking-widest whitespace-nowrap">Financials & Performance</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <select
                        aria-label="Select time range"
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                        className="bg-white/5 border border-white/10 rounded-full text-xs px-3.5 py-1.5 outline-none focus:border-white/20 cursor-pointer text-white transition-all"
                    >
                        <option value={7}>Last 7 Days</option>
                        <option value={14}>Last 14 Days</option>
                        <option value={30}>Last 30 Days</option>
                        <option value={90}>Last 90 Days</option>
                    </select>
                    
                    <button
                        onClick={exportPDF}
                        className="flex items-center gap-1.5 bg-white/5 text-white px-3.5 py-1.5 rounded-full font-bold border border-white/10 hover:bg-white/10 active:scale-[0.98] transition-all text-xs cursor-pointer"
                    >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">EXPORT PDF</span>
                        <span className="sm:hidden">PDF</span>
                    </button>
                    
                    <button
                        onClick={async () => {
                            const totalExp = expenses.reduce((s, e) => s + Number(e.amount), 0);
                            const totalStaff = staffPaymentsList.reduce((s, p) => s + Number(p.amount), 0);
                            const netProfit = totalRevenue - totalExp - totalStaff;
                            
                            const totalBookings = revData.reduce((s, r) => s + r.booking_count, 0);
                            const avgPerBooking = totalBookings > 0 ? totalRevenue / totalBookings : 0;
                            
                            await generateMasterReportPDF({
                                salonName: salonName || 'Voxali Salon',
                                logoUrl,
                                dateRangeStr: `Last ${days} Days`,
                                totalRevenue,
                                totalBookings,
                                avgPerBooking,
                                services,
                                drawerData,
                                totalExpectedCash,
                                dailyDrawerLogs,
                                staffData,
                                expenses,
                                staffPayments: staffPaymentsList,
                                netProfit
                            });
                        }}
                        className="flex items-center gap-2 bg-white text-black px-4 py-2.5 rounded-full font-bold hover:bg-white/90 transition-all text-xs shadow-md cursor-pointer"
                        title="Download Comprehensive PDF Report for all tabs"
                    >
                        <Download className="w-4 h-4 border-black" />
                        <span className="hidden sm:inline">MASTER REPORT</span>
                        <span className="sm:hidden">PDF</span>
                    </button>
                </div>
            </div>

            {/* TAB NAVIGATION (Segmented Control style) */}
            <div className="flex p-1 bg-white/5 border border-white/5 rounded-2xl gap-1 mb-6 max-w-4xl overflow-x-auto scrollbar-none">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        activeTab === 'overview'
                            ? 'bg-white text-black shadow-[0_4px_12px_rgba(0,0,0,0.15)]'
                            : 'text-white/50 hover:text-white/90 hover:bg-white/5'
                    }`}
                >
                    <TrendingUp className="w-4 h-4" /> Performance Overview
                </button>
                <button
                    onClick={() => setActiveTab('drawer')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        activeTab === 'drawer'
                            ? 'bg-white text-black shadow-[0_4px_12px_rgba(0,0,0,0.15)]'
                            : 'text-white/50 hover:text-white/90 hover:bg-white/5'
                    }`}
                >
                    <Wallet className="w-4 h-4" /> Daily Drawer (Register)
                </button>
                <button
                    onClick={() => setActiveTab('staff')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        activeTab === 'staff'
                            ? 'bg-white text-black shadow-[0_4px_12px_rgba(0,0,0,0.15)]'
                            : 'text-white/50 hover:text-white/90 hover:bg-white/5'
                    }`}
                >
                    <Users className="w-4 h-4" /> Staff Commissions
                </button>
                <button
                    onClick={() => setActiveTab('sales')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        activeTab === 'sales'
                            ? 'bg-white text-black shadow-[0_4px_12px_rgba(0,0,0,0.15)]'
                            : 'text-white/50 hover:text-white/90 hover:bg-white/5'
                    }`}
                >
                    <ShoppingBag className="w-4 h-4" /> Retail vs Services
                </button>
                <button
                    onClick={() => setActiveTab('pnl')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        activeTab === 'pnl'
                            ? 'bg-white text-black shadow-[0_4px_12px_rgba(0,0,0,0.15)]'
                            : 'text-white/50 hover:text-white/90 hover:bg-white/5'
                    }`}
                >
                    <Receipt className="w-4 h-4" /> Expenses & P&L
                </button>
            </div>

            {/* TAB CONTENT: OVERVIEW */}
            {activeTab === 'overview' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {loadingOverview ? (
                            [1, 2, 3].map(i => (
                                <div key={i} className="glass-panel p-4 bg-gradient-to-br from-white/[0.04] to-white/[0.01] min-h-[80px]">
                                    <Skeleton variant="text" width="50%" height={10} className="mb-2" />
                                    <Skeleton variant="text" width="70%" height={28} />
                                </div>
                            ))
                        ) : (
                            <>
                                <SummaryCard label={`Revenue (${days}D)`} value={`$${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={DollarSign} />
                                <SummaryCard label={`Bookings (${days}D)`} value={String(totalBookings)} icon={Calendar} />
                                <SummaryCard label="Avg Ticket Size" value={`$${avgPerBooking.toFixed(0)}`} icon={TrendingUp} />
                            </>
                        )}
                    </div>

                    {/* Chart Grid */}
                    <div className="grid grid-cols-1 gap-4">
                        {/* Revenue Over Time (Full Width) */}
                        <div className="glass-panel p-5 bg-gradient-to-br from-white/[0.02] to-transparent">
                            <h4 className="font-bold text-sm text-white mb-4 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-white/60" />
                                Revenue Over Time
                            </h4>
                            <div className="h-[220px]">
                                {loadingOverview ? (
                                    <Skeleton variant="rect" height={220} />
                                ) : revData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={revData}>
                                            <defs>
                                                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#ffffff" stopOpacity={0.12} />
                                                    <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} interval="preserveStartEnd" dy={8} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickFormatter={(v: number) => `$${v}`} dx={-8} />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'rgba(13,13,13,0.95)',
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    borderRadius: '12px',
                                                    backdropFilter: 'blur(8px)',
                                                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                                                }}
                                                itemStyle={{ color: '#ffffff', fontSize: 12 }}
                                                labelStyle={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700 }}
                                            />
                                            <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#ffffff" strokeWidth={2} fillOpacity={1} fill="url(#revenueGrad)" />
                                            <Area type="monotone" dataKey="booking_count" name="Bookings" stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} fillOpacity={0} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-white/30 text-xs">No data for this period</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Secondary Row (Grid) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Booking Statuses */}
                        <div className="glass-panel p-5">
                            <h4 className="font-bold text-sm text-white mb-4 flex items-center gap-2">
                                <PieIcon className="w-4 h-4 text-white/60" />
                                Booking Statuses
                            </h4>
                            {statuses.length > 0 ? (
                                <div className="flex flex-col sm:flex-row items-center gap-6">
                                    <div className="h-[150px] w-[150px] flex-shrink-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={statuses} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} strokeWidth={0}>
                                                    {statuses.map((s, i) => (
                                                        <Cell key={i} fill={STATUS_COLORS[s.status] ?? '#6b7280'} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{
                                                        backgroundColor: 'rgba(13,13,13,0.95)',
                                                        border: '1px solid rgba(255,255,255,0.08)',
                                                        borderRadius: '12px',
                                                        backdropFilter: 'blur(8px)',
                                                    }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex-1 space-y-2.5 w-full">
                                        {statuses.map((s) => (
                                            <div key={s.status} className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.status] ?? '#6b7280' }} />
                                                    <span className="text-white/60 capitalize">{s.status.replace('_', ' ')}</span>
                                                </div>
                                                <span className="font-bold text-white">{s.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-white/30 text-xs text-center py-12">No status data yet</p>
                            )}
                        </div>
                        
                        {/* Top Revenue Services */}
                        <div className="glass-panel p-5">
                            <h4 className="font-bold text-sm text-white mb-4 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-white/60" />
                                Top Revenue Services
                            </h4>
                            {services.length > 0 ? (
                                <div className="h-[150px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={services} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
                                            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickFormatter={(v: number) => `$${v}`} dy={4} />
                                            <YAxis type="category" dataKey="service_name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} width={100} />
                                            <Tooltip
                                                cursor={{ fill: 'transparent' }}
                                                contentStyle={{
                                                    backgroundColor: 'rgba(13,13,13,0.95)',
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    borderRadius: '12px',
                                                    backdropFilter: 'blur(8px)',
                                                }}
                                                formatter={(value: number, name: string) => [name === 'total_revenue' ? `$${value}` : value, name === 'total_revenue' ? 'Revenue' : 'Bookings']}
                                            />
                                            <Bar dataKey="total_revenue" name="Revenue" fill="rgba(255,255,255,0.8)" radius={[0, 4, 4, 0]} barSize={16} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <p className="text-white/30 text-xs text-center py-12">No booking data yet</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: DAILY DRAWER */}
            {activeTab === 'drawer' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Expected Cash in Drawer */}
                        <div className="glass-panel p-5 flex flex-col justify-between bg-gradient-to-br from-white/[0.02] to-transparent">
                            <div className="text-center py-4">
                                <Wallet className="w-10 h-10 text-white/60 mx-auto mb-3" />
                                <h3 className="text-lg font-bold text-white mb-1">Drawer Cash Checkout</h3>
                                <p className="text-white/40 text-xs max-w-sm mx-auto">Reconcile physical cash with expected drawer totals at the end of the shift.</p>
                            </div>
                            
                            <div className="bg-black/30 border border-white/5 rounded-2xl p-5 text-center shadow-lg my-4">
                                <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider block mb-1">Expected Cash In Drawer</span>
                                <span className="text-5xl font-black text-white">${totalExpectedCash.toFixed(2)}</span>
                            </div>

                            <div className="space-y-3 mt-4">
                                {drawerData.map((d, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3.5 rounded-xl bg-white/5 border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                                                {d.method === 'Cash' ? <DollarSign className="w-4 h-4 text-white" /> : <CreditCard className="w-4 h-4 text-white/60" />}
                                            </div>
                                            <div className="text-left">
                                                <div className="font-bold text-xs text-white">{d.method}</div>
                                                <div className="text-[10px] text-white/40">{d.count} Transactions</div>
                                            </div>
                                        </div>
                                        <div className="font-bold text-sm text-white">${d.amount.toFixed(2)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Drawer Reconciliation History */}
                        <div className="glass-panel p-5 flex flex-col bg-gradient-to-br from-white/[0.02] to-transparent">
                            <h4 className="font-bold text-sm text-white mb-4">Drawer History Logs</h4>
                            <p className="text-white/40 text-xs mb-4">Past daily transactions checkout history ledger.</p>
                            
                            {dailyDrawerLogs.length > 0 ? (
                                <div className="overflow-y-auto max-h-[360px] pr-1 custom-scrollbar text-left">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                            <tr className="border-b border-white/10 bg-white/5">
                                                <th className="p-3 font-bold text-white/50 uppercase tracking-wider">Date</th>
                                                <th className="p-3 text-center font-bold text-white/50 uppercase tracking-wider">Cash</th>
                                                <th className="p-3 text-center font-bold text-white/50 uppercase tracking-wider">Card</th>
                                                <th className="p-3 text-right font-bold text-white/50 uppercase tracking-wider">Total Sales</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {dailyDrawerLogs.slice().reverse().map((log, idx) => {
                                                const total = log.cash + log.card + log.other;
                                                return (
                                                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                        <td className="p-3 font-bold text-white">{new Date(log.date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                                                        <td className="p-3 text-center text-white/60">${log.cash.toFixed(0)}</td>
                                                        <td className="p-3 text-center text-white/60">${log.card.toFixed(0)}</td>
                                                        <td className="p-3 text-right font-bold text-white">${total.toFixed(0)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center text-white/30 text-xs py-12">No past records for this period</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: STAFF COMMISSION */}
            {activeTab === 'staff' && (
                <FeatureLock requiredTier="growth" featureName="Staff Payroll & Commissions" description="Growth Feature. Automate your staff payroll, calculate commissions, and track tips seamlessly." minHeight="min-h-[400px]">
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
                    <div className="glass-panel p-5 bg-gradient-to-br from-white/[0.02] to-transparent">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3">
                                <Users className="w-5 h-5 text-white/60" />
                                <div>
                                    <h3 className="text-sm font-bold text-white">Staff Payroll Breakdown ({days} Days)</h3>
                                    <p className="text-white/40 text-xs mt-0.5">Automated payout calculation: Base Salary + Service Commission + Tips.</p>
                                </div>
                            </div>
                            
                            <button
                                onClick={() => {
                                    generateSalaryReportPDF({
                                        salonName: salonName || 'Voxali Salon',
                                        dateRangeStr: `Last ${days} Days`,
                                        staffData: staffData
                                    });
                                }}
                                className="flex items-center justify-center gap-1.5 bg-white text-black px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-white/90 active:scale-[0.98] transition-all cursor-pointer shadow-md self-start sm:self-center"
                                title="Download Salary Report PDF"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>EXPORT SALARY REPORT</span>
                            </button>
                        </div>
                        
                        {staffData.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {staffData.map((staff, idx) => {
                                    if (staff.isUnassigned) {
                                        return (
                                            <div key={idx} className="glass-panel p-5 bg-gradient-to-br from-white/[0.01] to-transparent border border-white/5 flex flex-col justify-between h-full">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 border border-white/10 font-bold">
                                                            U
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-sm text-white">{staff.name}</h4>
                                                            <p className="text-[10px] text-white/40 uppercase tracking-wider">No Stylist Assigned</p>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="space-y-3 mt-4 text-xs">
                                                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                                                            <span className="text-white/50">Bookings Count</span>
                                                            <span className="font-semibold text-white">{staff.bookings_count} Bookings</span>
                                                        </div>
                                                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                                                            <span className="text-white/50">Service Revenue</span>
                                                            <span className="font-semibold text-white">${staff.service_revenue.toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mt-6 pt-4 border-t border-white/5 text-[10px] text-white/30 italic">
                                                    These service bookings were completed without an assigned stylist. No payouts or commissions are calculated for this card.
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={idx} className="glass-panel p-5 bg-gradient-to-br from-white/[0.02] to-transparent border border-white/5 flex flex-col justify-between h-full hover:border-white/10 transition-all duration-300">
                                            <div>
                                                {/* Header */}
                                                <div className="flex items-center justify-between mb-5">
                                                    <div className="flex items-center gap-3">
                                                        {staff.photo_url ? (
                                                            <img 
                                                                src={staff.photo_url} 
                                                                alt={staff.name} 
                                                                className="w-10 h-10 rounded-xl object-cover border border-white/10 shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                                                            />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black border" 
                                                                style={{ 
                                                                    backgroundColor: `${staff.color}15`, 
                                                                    color: staff.color, 
                                                                    borderColor: `${staff.color}30` 
                                                                }}>
                                                                {staff.name.charAt(0)}
                                                            </div>
                                                        )}
                                                        <div>
                                                            <h4 className="font-bold text-sm text-white">{staff.name}</h4>
                                                            <p className="text-[10px] text-white/40 uppercase tracking-wider">{staff.bookings_count} Bookings completed</p>
                                                        </div>
                                                    </div>
                                                    
                                                    <button
                                                        onClick={() => {
                                                            generateIndividualStaffReportPDF({
                                                                salonName: salonName || 'Voxali Salon',
                                                                dateRangeStr: `Last ${days} Days`,
                                                                staff: {
                                                                    name: staff.name,
                                                                    bookings_count: staff.bookings_count,
                                                                    base_salary: staff.base_salary,
                                                                    service_revenue: staff.service_revenue,
                                                                    commission_percent: staff.commission_percent,
                                                                    commission_earned: staff.commission_earned,
                                                                    tip_amount: staff.tip_amount,
                                                                    gross_payout: staff.gross_payout,
                                                                    already_paid: staff.already_paid,
                                                                    total_payout: staff.total_payout
                                                                }
                                                            });
                                                        }}
                                                        className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-white/60 hover:text-white transition-all cursor-pointer"
                                                        title="Download Personal Earnings Statement PDF"
                                                        aria-label="Download Personal Report"
                                                    >
                                                        <Download className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>

                                                {/* Mathematical Breakdown Sheet */}
                                                <div className="space-y-2.5 text-xs">
                                                    <div className="flex justify-between items-center text-white/50 py-1.5 border-b border-white/5">
                                                        <span>Monthly Base Salary</span>
                                                        <span className="font-semibold text-white">${staff.base_salary.toLocaleString()}</span>
                                                    </div>
                                                    
                                                    <div className="flex justify-between items-center text-white/50 py-1.5 border-b border-white/5">
                                                        <span>Service Commission ({staff.commission_percent}%)</span>
                                                        <span className="font-bold text-white/90">
                                                            + ${staff.commission_earned.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="flex justify-between items-center text-white/50 py-1.5 border-b border-white/5">
                                                        <span>Client Tips</span>
                                                        <span className="font-bold text-emerald-400">
                                                            + ${staff.tip_amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                        </span>
                                                    </div>

                                                    {/* Gross expected payout */}
                                                    <div className="flex justify-between items-center py-2.5 border-b border-white/10 text-white font-bold">
                                                        <span className="text-white/70">Total Expected Payout</span>
                                                        <span className="text-sm font-black">${staff.gross_payout.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                                    </div>

                                                    {/* Already paid amount */}
                                                    <div className="flex justify-between items-center text-white/50 py-1.5 border-b border-white/5">
                                                        <span>Already Paid (-)</span>
                                                        <span className="font-semibold text-rose-400">
                                                            - ${staff.already_paid.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                        </span>
                                                    </div>

                                                    {/* Net Due Balance */}
                                                    <div className="flex justify-between items-center py-3 text-white font-black">
                                                        <span className="text-white/60">Net Payout Due (=)</span>
                                                        <span className={`text-base font-black ${staff.total_payout <= 0 ? 'text-emerald-400' : 'text-[#E5C158]'}`}>
                                                            ${staff.total_payout.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Actions Button / Payout Badge */}
                                            <div className="mt-6 pt-4 border-t border-white/5">
                                                {staff.total_payout <= 0 ? (
                                                    <div className="w-full py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm">
                                                        <CheckCircle2 className="w-4 h-4" /> Paid & Cleared
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleOpenPayoutModal(staff)}
                                                        className="w-full bg-white hover:bg-white/90 text-black font-black py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all duration-200 active:scale-[0.98] shadow-md cursor-pointer"
                                                    >
                                                        Record Payout (${staff.total_payout.toFixed(0)})
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-white/40">No staff revenue data found for this period. Be sure appointments are assigned to staff.</div>
                        )}
                    </div>
                </div>
                </FeatureLock>
            )}

            {/* TAB CONTENT: SALES BREAKDOWN */}
            {activeTab === 'sales' && (
                <FeatureLock requiredTier="growth" featureName="Retail vs Services Pivot" description="Growth Feature. Break down your revenue between salon services and retail product sales." minHeight="min-h-[400px]">
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                         {/* Left: Pivot Breakdown Cards (1/3) */}
                         <div className="glass-panel p-5 flex flex-col justify-between bg-gradient-to-br from-white/[0.02] to-transparent lg:col-span-1 text-left">
                             <div>
                                 <h3 className="text-sm font-bold text-white mb-2">Service vs. Retail Pivot</h3>
                                 <p className="text-white/40 text-xs leading-relaxed">Compare how much of your revenue comes from salon services versus retail product upselling over the last {days} days.</p>
                             </div>
                             
                             <div className="space-y-3 mt-4">
                                 {salesBreakdown.map((item, idx) => (
                                     <div key={idx} className="glass-panel p-4 flex items-center gap-4 bg-black/20 hover:border-white/10 transition-colors">
                                         <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                                             {item.type.includes('Services') ? <Scissors className="w-4 h-4 text-white" /> : <ShoppingBag className="w-4 h-4 text-white" />}
                                         </div>
                                         <div>
                                             <div className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{item.type}</div>
                                             <div className="text-xl font-bold text-white mt-0.5">${item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         </div>
                         
                         {/* Right: Peak Hours Analysis chart (2/3) */}
                         <div className="glass-panel p-5 lg:col-span-2 bg-gradient-to-br from-white/[0.02] to-transparent shadow-lg text-left">
                              <h3 className="font-bold text-sm text-white mb-4 flex items-center gap-2">
                                  <BarChart3 className="w-4 h-4 text-white/60" /> Peak Hours Analysis
                              </h3>
                              <div className="w-full h-[220px]">
                                  <ResponsiveContainer width="100%" height="100%">
                                      <BarChart data={peakHours}>
                                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                          <XAxis dataKey="hour" stroke="rgba(255,255,255,0.2)" fontSize={9} tickMargin={8} minTickGap={8} />
                                          <YAxis stroke="rgba(255,255,255,0.2)" fontSize={9} allowDecimals={false} />
                                          <Tooltip 
                                              cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                              contentStyle={{ backgroundColor: 'rgba(13,13,13,0.95)', border: '1px solid rgba(255,255,255,0.08)' }}
                                              formatter={(value: number) => [value, 'Bookings']}
                                          />
                                          <Bar dataKey="count" fill="rgba(255,255,255,0.8)" radius={[4, 4, 0, 0]} barSize={24} />
                                      </BarChart>
                                  </ResponsiveContainer>
                              </div>
                         </div>
                     </div>

                     {/* Top Services & Top Products Sold List side-by-side */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                         {/* Top Services (1/2) */}
                         <div className="glass-panel p-5 shadow-lg">
                              <h3 className="font-bold text-sm text-white mb-4 flex items-center gap-2">
                                  <Scissors className="w-4 h-4 text-white/60" /> Top Services
                              </h3>
                              {services.length === 0 ? (
                                  <p className="text-white/30 text-xs py-6 text-center">No services booked in this period.</p>
                              ) : (
                                  <div className="space-y-4">
                                      {services.slice(0, 5).map((s, i) => (
                                          <div key={i} className="flex justify-between items-center group">
                                              <div className="flex items-center">
                                                  <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-bold text-white/40 mr-3 group-hover:bg-white/10 group-hover:text-white transition-colors">{i + 1}</div>
                                                  <span className="text-white/80 text-xs font-semibold">{s.service_name}</span>
                                              </div>
                                              <div className="text-right flex-shrink-0 ml-2">
                                                  <div className="text-white text-xs font-bold">${Number(s.total_revenue).toFixed(2)}</div>
                                                  <div className="text-white/40 text-[9px] uppercase font-bold tracking-wider">{s.booking_count} bookings</div>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              )}
                         </div>

                         {/* Top Products Sold (1/2) */}
                         <div className="glass-panel p-5 shadow-lg">
                              <h3 className="font-bold text-sm text-white mb-4 flex items-center gap-2">
                                  <ShoppingBag className="w-4 h-4 text-white/60" /> Top Products Sold
                              </h3>
                              {products.length === 0 ? (
                                  <p className="text-white/30 text-xs py-6 text-center">No retail products sold in this period.</p>
                              ) : (
                                  <div className="space-y-4">
                                      {products.slice(0, 5).map((p, i) => (
                                          <div key={i} className="flex justify-between items-center group">
                                              <div className="flex items-center">
                                                  <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-bold text-white/40 mr-3 group-hover:bg-white/10 group-hover:text-white transition-colors">{i + 1}</div>
                                                  <span className="text-white/80 text-xs font-semibold">{p.product_name}</span>
                                              </div>
                                              <div className="text-right flex-shrink-0 ml-2">
                                                  <div className="text-white text-xs font-bold">${Number(p.total_revenue).toFixed(2)}</div>
                                                  <div className="text-white/40 text-[9px] uppercase font-bold tracking-wider">{p.sales_count} units sold</div>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              )}
                         </div>
                     </div>
                </div>
                </FeatureLock>
            )}

            {/* TAB CONTENT: P&L */}
            {activeTab === 'pnl' && (
                <FeatureLock requiredTier="growth" featureName="Financials & Expenses" description="Growth Feature. Track business expenses, monitor payouts, and calculate your net profit in real time." minHeight="min-h-[400px]">
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <SummaryCard label="Gross Revenue" value={`$${totalRevenue.toLocaleString()}`} icon={DollarSign} />
                        <SummaryCard label="Total Expenses" value={`$${expenses.reduce((s, e) => s + Number(e.amount), 0).toLocaleString()}`} icon={Receipt} />
                        <SummaryCard label="Staff Payouts" value={`$${staffPaymentsList.reduce((s, p) => s + Number(p.amount), 0).toLocaleString()}`} icon={Banknote} />
                        <div className="glass-panel p-4 flex flex-col justify-center border border-white/5 bg-gradient-to-br from-white/[0.04] to-white/[0.01]">
                            <p className="text-white/40 text-[9px] font-bold uppercase tracking-[0.2em]">Net Profit</p>
                            <h3 className="text-xl font-black text-emerald-400 mt-1">
                                ${((totalRevenue) - expenses.reduce((s, e) => s + Number(e.amount), 0) - staffPaymentsList.reduce((s, p) => s + Number(p.amount), 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Expenses Section */}
                        <div className="glass-panel p-5 border border-white/5 relative">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                                    <Receipt className="w-4 h-4 text-white/60" />
                                    Business Expenses
                                </h4>
                                <button onClick={() => setShowAddExpense(true)} title="Add Expense" aria-label="Add Expense" className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors cursor-pointer border border-white/5">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                            
                            {expenses.length > 0 ? (
                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    {expenses.map((e, idx) => (
                                        <div key={idx} className="p-4 rounded-xl border border-white/5 bg-black/20 flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-white/90 text-xs">{e.title}</p>
                                                {e.notes && <p className="text-[10px] text-white/50 mt-0.5 italic">"{e.notes}"</p>}
                                                <div className="flex gap-2 items-center mt-1.5 text-[9px]">
                                                    <span className="bg-white/10 px-2 py-0.5 rounded-full text-white/60 capitalize">{e.category}</span>
                                                    <span className="text-white/40">{new Date(e.expense_date).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <div className="font-black text-white/90 text-sm">${Number(e.amount).toFixed(2)}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center py-12 text-white/30 text-xs">No expenses recorded for this period.</p>
                            )}
                        </div>

                        {/* Staff Ledger Section */}
                        <div className="glass-panel p-5 border border-white/5">
                            <div className="mb-4">
                                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                                    <Banknote className="w-4 h-4 text-emerald-400/80" />
                                    Staff Payments Ledger
                                </h4>
                                <p className="text-[10px] text-white/40 mt-1">Advances, salary clearances, and commission payouts.</p>
                            </div>
                            
                            {staffPaymentsList.length > 0 ? (
                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    {staffPaymentsList.map((p, idx) => (
                                        <div key={idx} className="p-4 rounded-xl border border-white/5 bg-black/20 flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-white/90 text-xs">{p.staff?.full_name}</p>
                                                {p.notes && <p className="text-[10px] text-white/50 mt-0.5 italic">"{p.notes}"</p>}
                                                <div className="flex gap-2 items-center mt-1.5 text-[9px]">
                                                    <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full capitalize">{p.payment_type.replace('_', ' ')}</span>
                                                    <span className="text-white/40">{new Date(p.payment_date).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <div className="font-black text-emerald-400 text-sm">${Number(p.amount).toFixed(2)}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center py-12 text-white/30 text-xs">No staff payments recorded for this period.</p>
                            )}
                        </div>
                    </div>
                </div>
                </FeatureLock>
            )}

            {/* ADD EXPENSE MODAL */}
            {showAddExpense && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-luxe-obsidian border border-white/10 rounded-2xl p-8 w-full max-w-md shadow-2xl text-left">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Receipt className="w-5 h-5 text-white" /> Add Expense
                            </h3>
                            <button onClick={() => setShowAddExpense(false)} title="Close Modal" aria-label="Close" className="p-2 hover:bg-white/10 rounded-xl transition-all cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-2 block">Item / Title</label>
                                <input type="text" value={expTitle} onChange={e => setExpTitle(e.target.value)} placeholder="e.g. Color Tubes Restock"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-white/30 transition-all text-white" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-2 block">Amount</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 font-bold">$</div>
                                        <input type="number" value={expAmt} onChange={e => setExpAmt(e.target.value)} min="0" step="0.01"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pl-8 text-sm outline-none focus:border-white/30 transition-all text-white" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-2 block">Category</label>
                                    <select value={expCat} onChange={e => setExpCat(e.target.value)}
                                        className="w-full bg-luxe-obsidian-light text-white border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-white/30 transition-all">
                                        <option value="supplies">Supplies</option>
                                        <option value="rent">Rent / Utilities</option>
                                        <option value="marketing">Marketing</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-2 block">Notes (Optional)</label>
                                <input type="text" value={expNotes} onChange={e => setExpNotes(e.target.value)} placeholder="Invoice # or details"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-white/30 transition-all text-white" />
                            </div>
                        </div>

                        <button onClick={handleAddExpense} disabled={addingExp || !expTitle || !expAmt}
                            className="w-full mt-8 bg-white text-black font-bold py-3 rounded-xl shadow-lg hover:bg-white/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer">
                            {addingExp ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                            SAVE EXPENSE
                        </button>
                    </div>
                </div>
            )}

            {/* STAFF PAYOUT RECORD MODAL */}
            {showPayoutModal && payoutStaff && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-luxe-obsidian border border-white/10 rounded-2xl p-8 w-full max-w-md shadow-2xl text-left">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Banknote className="w-5 h-5 text-emerald-400" /> Record Staff Payout
                            </h3>
                            <button onClick={() => setShowPayoutModal(false)} title="Close Modal" aria-label="Close" className="p-2 hover:bg-white/10 rounded-xl transition-all cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-2 block">Stylist</label>
                                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white/70 font-bold">
                                    {payoutStaff.name}
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-2 block">Amount</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 font-bold">$</div>
                                        <input type="number" value={payoutAmount} onChange={e => setPayoutAmount(e.target.value)} min="0" step="0.01"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pl-8 text-sm outline-none focus:border-white/30 transition-all text-white" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-2 block">Payment Type</label>
                                    <select value={payoutType} onChange={e => setPayoutType(e.target.value)}
                                        className="w-full bg-luxe-obsidian-light text-white border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-white/30 transition-all">
                                        <option value="commission_payout">Commission</option>
                                        <option value="salary_clearance">Base Salary</option>
                                        <option value="advance">Salary Advance</option>
                                        <option value="tip_payout">Tips Out</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-2 block">Notes</label>
                                <input type="text" value={payoutNotes} onChange={e => setPayoutNotes(e.target.value)} placeholder="Commission clearance or salary details"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-white/30 transition-all text-white" />
                            </div>
                        </div>

                        <button onClick={handleSavePayout} disabled={savingPayout || !payoutAmount}
                            className="w-full mt-8 bg-white text-black font-bold py-3 rounded-xl shadow-lg hover:bg-white/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer">
                            {savingPayout ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                            CONFIRM PAYOUT
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const SummaryCard: React.FC<{ label: string; value: string; icon: React.ElementType }> = ({ label, value, icon: Icon }) => (
    <div className="glass-panel p-4 flex items-center gap-3 bg-gradient-to-br from-white/[0.04] to-white/[0.01] hover:border-white/10 transition-all duration-300 hover:-translate-y-0.5">
        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white transition-colors">
            <Icon className="w-4 h-4 text-white" />
        </div>
        <div>
            <p className="text-white/40 text-[9px] font-bold uppercase tracking-[0.2em]">{label}</p>
            <h3 className="text-xl font-bold tracking-tight text-white mt-0.5">{value}</h3>
        </div>
    </div>
);
