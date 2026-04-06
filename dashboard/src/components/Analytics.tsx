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
import { generateMasterReportPDF } from '../utils/pdfGenerator';
import { Skeleton } from './ui/Skeleton';
import { FeatureLock } from './ui/FeatureLock';

interface RevDay { day: string; revenue: number; booking_count: number }
interface ServiceRow { service_name: string; booking_count: number; total_revenue: number }
interface StatusRow { status: string; count: number }
interface PaymentRow { method: string; amount: number; count: number }

const STATUS_COLORS: Record<string, string> = {
    confirmed: '#22c55e',
    completed: '#D4AF37',
    pending: '#f97316',
    pending_deposit: '#eab308',
    cancelled: '#ef4444',
    no_show: '#6b7280',
    checked_in: '#3b82f6',
    in_progress: '#8b5cf6',
};

export const Analytics: React.FC = () => {
    const { tenantId, salonName, logoUrl } = useTenant();
    const [activeTab, setActiveTab] = useState<'overview' | 'drawer' | 'staff' | 'sales' | 'pnl'>('overview');
    
    // Overview Data
    const [revData, setRevData] = useState<RevDay[]>([]);
    const [services, setServices] = useState<ServiceRow[]>([]);
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
        commission_earned: number; tip_amount: number; total_payout: number;
    }[]>([]);

    // P&L Data
    const [expenses, setExpenses] = useState<any[]>([]);
    const [staffPaymentsList, setStaffPaymentsList] = useState<any[]>([]);
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [expTitle, setExpTitle] = useState('');
    const [expCat, setExpCat] = useState('supplies');
    const [expAmt, setExpAmt] = useState('');
    const [expNotes, setExpNotes] = useState('');
    const [addingExp, setAddingExp] = useState(false);

    // Per-tab loading states
    const [loadingOverview, setLoadingOverview] = useState(true);
    const setLoadingDrawer = useState(false)[1];
    const setLoadingStaff = useState(false)[1];
    const setLoadingPnL = useState(false)[1];

    // Track which sub-tabs have already been fetched (lazy cache per session)
    const loadedTabs = useRef<Set<string>>(new Set());

    // ─── OVERVIEW + SALES fetch (runs on mount and when days changes) ───
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

            // Services + Sales Breakdown
            const svcMap: Record<string, { booking_count: number; total_revenue: number }> = {};
            let serviceRev = 0, productRev = 0;
            activeBookings.forEach((b: any) => {
                const bItems = b.booking_items || [];
                if (bItems.length === 0) {
                    const lineTotal = Number(b.total_price) || 0;
                    const sn = b.services?.name || 'Unknown Service';
                    if (sn.includes('Custom Charge') || sn.includes('Retail')) { productRev += lineTotal; }
                    else { serviceRev += lineTotal; if (!svcMap[sn]) svcMap[sn] = { booking_count: 0, total_revenue: 0 }; svcMap[sn].booking_count += 1; svcMap[sn].total_revenue += lineTotal; }
                } else {
                    bItems.forEach((item: any) => {
                        const iName = item.name_snapshot || 'Unknown Item', iPrice = Number(item.price_snapshot) || 0;
                        if (iName.startsWith('[RETAIL]') || iName.startsWith('[CUSTOM]')) { productRev += iPrice; }
                        else { serviceRev += iPrice; if (!svcMap[iName]) svcMap[iName] = { booking_count: 0, total_revenue: 0 }; svcMap[iName].total_revenue += iPrice; }
                    });
                    const uniqueServices = new Set<string>(bItems.filter((i: any) => !i.name_snapshot?.startsWith('[RETAIL]') && !i.name_snapshot?.startsWith('[CUSTOM]')).map((i: any) => i.name_snapshot || 'Unknown'));
                    uniqueServices.forEach(svc => { if (!svcMap[svc]) svcMap[svc] = { booking_count: 0, total_revenue: 0 }; svcMap[svc].booking_count += 1; });
                }
            });
            setServices(Object.entries(svcMap).map(([service_name, v]) => ({ service_name, ...v })).sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 10));
            setSalesBreakdown([{ type: 'Salon Services', value: serviceRev }, { type: 'Retail & Custom Charges', value: productRev }].filter(d => d.value > 0));

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

    // ─── STAFF fetch (runs when 'staff' tab first opened) ───
    const fetchStaffData = useCallback(async () => {
        if (!tenantId) return;
        setLoadingStaff(true);
        try {
            const startDate = new Date(); startDate.setDate(startDate.getDate() - days);
            const startDateStr = startDate.toISOString();

            const [{ data: staffList }, { data: periodPayments }, { data: bookings }] = await Promise.all([
                supabaseAdmin.rpc('rpc_staff_board', { p_tenant_id: tenantId }),
                supabaseAdmin.from('payments').select('booking_id, tip_amount').eq('tenant_id', tenantId).gte('created_at', startDateStr).gt('tip_amount', 0),
                supabaseAdmin.from('bookings').select('id, start_time, total_price, status, stylist_id').eq('tenant_id', tenantId).gte('start_time', startDateStr)
            ]);

            const tipMap: Record<string, number> = {};
            (periodPayments || []).forEach((p: any) => { if (p.booking_id && p.tip_amount) tipMap[p.booking_id] = (tipMap[p.booking_id] || 0) + Number(p.tip_amount); });

            const activeBookings = (bookings || []).filter((b: any) => b.status !== 'cancelled' && b.status !== 'no_show');
            const staffRevMap: Record<string, any> = {};
            (staffList || []).forEach((s: any) => { staffRevMap[s.id] = { id: s.id, name: s.full_name, color: s.color || '#D4AF37', base_salary: Number(s.base_salary) || 0, commission_percent: Number(s.commission_percent) || 0, bookings_count: 0, service_revenue: 0, tip_amount: 0 }; });
            activeBookings.forEach((b: any) => {
                const sid = b.stylist_id; if (!sid) return;
                if (!staffRevMap[sid]) staffRevMap[sid] = { id: sid, name: 'Unknown Stylist', color: '#666', base_salary: 0, commission_percent: 0, bookings_count: 0, service_revenue: 0, tip_amount: 0 };
                staffRevMap[sid].bookings_count += 1;
                staffRevMap[sid].service_revenue += Number(b.total_price) || 0;
                if (tipMap[b.id]) staffRevMap[sid].tip_amount += tipMap[b.id];
            });
            setStaffData(Object.values(staffRevMap).map((d: any) => { const ce = d.service_revenue * (d.commission_percent / 100); return { ...d, commission_earned: ce, total_payout: d.base_salary + ce + d.tip_amount }; }).sort((a, b) => b.total_payout - a.total_payout));
        } catch (err) { console.error('Analytics staff fetch error:', err); }
        finally { setLoadingStaff(false); }
    }, [days, tenantId]);

    // ─── DRAWER fetch (runs when 'drawer' tab first opened) ───
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

    // ─── P&L fetch (runs when 'pnl' tab first opened) ───
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

    // Overview always loads on mount and when days changes
    useEffect(() => { loadedTabs.current.clear(); fetchOverviewData(); }, [fetchOverviewData]);

    // Lazy tab loaders: only fetch when a new tab is opened for the first time in this session
    useEffect(() => {
        if (activeTab === 'staff' && !loadedTabs.current.has('staff')) { loadedTabs.current.add('staff'); fetchStaffData(); }
        if (activeTab === 'drawer' && !loadedTabs.current.has('drawer')) { loadedTabs.current.add('drawer'); fetchDrawerData(); }
        if (activeTab === 'pnl' && !loadedTabs.current.has('pnl')) { loadedTabs.current.add('pnl'); fetchPnLData(); }
    }, [activeTab, fetchStaffData, fetchDrawerData, fetchPnLData]);

    // When days changes, clear cache so all tabs reload with new range
    useEffect(() => { loadedTabs.current.clear(); }, [days]);




    const totalRevenue = revData.reduce((s, r) => s + r.revenue, 0);
    const totalBookings = revData.reduce((s, r) => s + r.booking_count, 0);
    const avgPerBooking = totalBookings > 0 ? totalRevenue / totalBookings : 0;

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
            // Refresh P&L data after adding an expense
            loadedTabs.current.delete('pnl');
            fetchPnLData();
        } catch (err: unknown) {
            console.error('Error adding expense:', err);
        }
        setAddingExp(false);
    };

    const exportCSV = () => {
        const header = 'Date,Revenue,Bookings\n';
        const rows = revData.map(r => `${r.day},${r.revenue},${r.booking_count}`).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `voxali_analytics_${days}d.csv`; a.click();
        URL.revokeObjectURL(url);
    };



    return (
        <FeatureLock 
            requiredTier="growth" 
            featureName="Advanced Analytics" 
            description="Unlock predictive insights, staff commissions, and real-time revenue reports to scale your salon business."
        >
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-luxe-gold/10 rounded-2xl border border-luxe-gold/20">
                        <BarChart3 className="w-6 h-6 text-luxe-gold" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">Analytics Center</h3>
                        <p className="text-xs text-white/40 uppercase tracking-widest">Financials & Performance</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                        <select
                            aria-label="Select time range"
                            value={days}
                            onChange={(e) => setDays(Number(e.target.value))}
                            className="bg-white/5 border border-white/10 rounded-xl text-xs px-4 py-2.5 outline-none focus:border-luxe-gold/50 cursor-pointer text-white"
                        >
                            <option value={7}>Last 7 Days</option>
                            <option value={14}>Last 14 Days</option>
                            <option value={30}>Last 30 Days</option>
                            <option value={90}>Last 90 Days</option>
                        </select>
                        
                        <button
                            onClick={exportCSV}
                            className="flex items-center gap-2 bg-luxe-gold/10 text-luxe-gold px-4 py-2.5 rounded-xl font-bold border border-luxe-gold/20 hover:bg-luxe-gold/20 transition-all text-xs"
                        >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">EXPORT CSV</span>
                            <span className="sm:hidden">CSV</span>
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
                            className="flex items-center gap-2 bg-luxe-gold text-black px-4 py-2.5 rounded-xl font-bold hover:bg-luxe-gold/90 transition-all text-xs shadow-[0_0_20px_rgba(212,175,55,0.3)] shadow-luxe-gold"
                            title="Download Comprehensive PDF Report for all tabs"
                        >
                            <Download className="w-4 h-4 border-black" />
                            <span className="hidden sm:inline">MASTER REPORT</span>
                            <span className="sm:hidden">PDF</span>
                        </button>
                </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="flex overflow-x-auto pb-2 border-b border-white/5 gap-2 hide-scrollbar">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-5 py-3 rounded-t-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                        activeTab === 'overview' ? 'bg-white/10 text-luxe-gold border-b-2 border-luxe-gold' : 'text-white/50 hover:bg-white/5 hover:text-white'
                    }`}
                >
                    <TrendingUp className="w-4 h-4" /> Performance Overview
                </button>
                <button
                    onClick={() => setActiveTab('drawer')}
                    className={`px-5 py-3 rounded-t-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                        activeTab === 'drawer' ? 'bg-white/10 text-luxe-gold border-b-2 border-luxe-gold' : 'text-white/50 hover:bg-white/5 hover:text-white'
                    }`}
                >
                    <Wallet className="w-4 h-4" /> Daily Drawer (Register)
                </button>
                <button
                    onClick={() => setActiveTab('staff')}
                    className={`px-5 py-3 rounded-t-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                        activeTab === 'staff' ? 'bg-white/10 text-luxe-gold border-b-2 border-luxe-gold' : 'text-white/50 hover:bg-white/5 hover:text-white'
                    }`}
                >
                    <Users className="w-4 h-4" /> Staff Commissions
                </button>
                <button
                    onClick={() => setActiveTab('sales')}
                    className={`px-5 py-3 rounded-t-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                        activeTab === 'sales' ? 'bg-white/10 text-luxe-gold border-b-2 border-luxe-gold' : 'text-white/50 hover:bg-white/5 hover:text-white'
                    }`}
                >
                    <ShoppingBag className="w-4 h-4" /> Retail vs Services
                </button>
                <button
                    onClick={() => setActiveTab('pnl')}
                    className={`px-5 py-3 rounded-t-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                        activeTab === 'pnl' ? 'bg-white/10 text-luxe-gold border-b-2 border-luxe-gold' : 'text-white/50 hover:bg-white/5 hover:text-white'
                    }`}
                >
                    <Receipt className="w-4 h-4" /> Expenses & P&L
                </button>
            </div>

            {/* TAB CONTENT: OVERVIEW */}
            {activeTab === 'overview' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {loadingOverview ? (
                            [1,2,3].map(i => (
                                <div key={i} className="glass-panel p-6">
                                    <Skeleton variant="text" width="60%" height={12} className="mb-3" />
                                    <Skeleton variant="text" width="45%" height={36} />
                                </div>
                            ))
                        ) : (
                            <>
                                <SummaryCard label={`Revenue (${days}D)`} value={`$${totalRevenue.toLocaleString()}`} icon={DollarSign} />
                                <SummaryCard label={`Bookings (${days}D)`} value={String(totalBookings)} icon={Calendar} />
                                <SummaryCard label="Avg / Booking" value={`$${avgPerBooking.toFixed(0)}`} icon={TrendingUp} />
                            </>
                        )}
                    </div>

                    <div className="glass-panel p-6">
                        <h4 className="font-bold mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-luxe-gold" />
                            Revenue Over Time
                        </h4>
                        <div className="h-[300px]">
                            {loadingOverview ? (
                                <Skeleton variant="rect" height={300} />
                            ) : revData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={revData}>
                                        <defs>
                                            <linearGradient id="analyticsGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#ffffff40', fontSize: 11 }} interval="preserveStartEnd" />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#ffffff40', fontSize: 11 }} tickFormatter={(v: number) => `$${v}`} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                            itemStyle={{ color: '#D4AF37' }}
                                        />
                                        <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#D4AF37" strokeWidth={2} fillOpacity={1} fill="url(#analyticsGrad)" />
                                        <Area type="monotone" dataKey="booking_count" name="Bookings" stroke="#22c55e" strokeWidth={1.5} fillOpacity={0} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-white/30 text-sm">No data for this period</div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="glass-panel p-6">
                            <h4 className="font-bold mb-4 flex items-center gap-2">
                                <PieIcon className="w-5 h-5 text-luxe-gold" />
                                Booking Statuses
                            </h4>
                            {statuses.length > 0 ? (
                                <div className="flex items-center gap-6">
                                    <div className="h-[220px] w-[220px] flex-shrink-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={statuses} dataKey="count" nameKey="status" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} strokeWidth={0}>
                                                    {statuses.map((s, i) => (
                                                        <Cell key={i} fill={STATUS_COLORS[s.status] ?? '#6b7280'} />
                                                    ))}
                                                </Pie>
                                                <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        {statuses.map((s) => (
                                            <div key={s.status} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.status] ?? '#6b7280' }} />
                                                    <span className="text-white/70 capitalize">{s.status.replace('_', ' ')}</span>
                                                </div>
                                                <span className="font-bold">{s.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-white/30 text-sm text-center py-12">No status data yet</p>
                            )}
                        </div>
                        
                        <div className="glass-panel p-6">
                            <h4 className="font-bold mb-4 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-luxe-gold" />
                                Top Revenue Services
                            </h4>
                            {services.length > 0 ? (
                                <div className="h-[250px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={services} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" horizontal={false} />
                                            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#ffffff40', fontSize: 11 }} tickFormatter={(v: number) => `$${v}`} />
                                            <YAxis type="category" dataKey="service_name" axisLine={false} tickLine={false} tick={{ fill: '#ffffff80', fontSize: 12 }} width={110} />
                                            <Tooltip
                                                cursor={{fill: 'transparent'}}
                                                contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                                formatter={(value: number, name: string) => [name === 'total_revenue' ? `$${value}` : value, name === 'total_revenue' ? 'Revenue' : 'Bookings']}
                                            />
                                            <Bar dataKey="total_revenue" name="Revenue" fill="#D4AF37" radius={[0, 6, 6, 0]} barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <p className="text-white/30 text-sm text-center py-12">No booking data yet</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: DAILY DRAWER */}
            {activeTab === 'drawer' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="glass-panel p-8 text-center bg-gradient-to-b from-white/5 to-transparent border-t-luxe-gold/30">
                        <Wallet className="w-12 h-12 text-luxe-gold mx-auto mb-4" />
                        <h2 className="text-3xl font-black text-white mb-2">Today's Register Checkout</h2>
                        <p className="text-white/50 mb-6">Use these values to reconcile the physical cash in your drawer at closing time.</p>
                        
                        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 md:p-10 max-w-xl mx-auto shadow-2xl">
                            <h4 className="text-white/40 font-bold uppercase tracking-widest text-xs mb-2">Expected Cash In Drawer</h4>
                            <div className="text-6xl font-black text-luxe-gold mb-8">${totalExpectedCash.toFixed(2)}</div>
                            
                            <div className="space-y-4">
                                {drawerData.map((d, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                                {d.method === 'Cash' ? <DollarSign className="w-5 h-5 text-emerald-400" /> : <CreditCard className="w-5 h-5 text-blue-400" />}
                                            </div>
                                            <div className="text-left">
                                                <div className="font-bold text-white">{d.method}</div>
                                                <div className="text-xs text-white/40">{d.count} Transactions</div>
                                            </div>
                                        </div>
                                        <div className="font-bold text-xl">${d.amount.toFixed(2)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: STAFF COMMISSION */}
            {activeTab === 'staff' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="glass-panel p-6">
                         <div className="flex items-center gap-3 mb-6">
                            <Users className="w-6 h-6 text-luxe-gold" />
                            <div>
                                <h3 className="text-xl font-bold">Staff Payroll Breakdown ({days} Days)</h3>
                                <p className="text-white/40 text-sm">Automated payout calculation: Base Salary + Service Commission + Tips.</p>
                            </div>
                        </div>
                        
                        {staffData.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/10 bg-white/5">
                                            <th className="p-4 text-white/50 font-bold text-xs uppercase tracking-wider">Stylist</th>
                                            <th className="p-4 text-center text-white/50 font-bold text-xs uppercase tracking-wider">Bookings</th>
                                            <th className="p-4 text-center text-white/50 font-bold text-xs uppercase tracking-wider">Base Salary</th>
                                            <th className="p-4 text-center text-white/50 font-bold text-xs uppercase tracking-wider">Service Rev</th>
                                            <th className="p-4 text-center text-white/50 font-bold text-xs uppercase tracking-wider">Comm %</th>
                                            <th className="p-4 text-center text-white/50 font-bold text-xs uppercase tracking-wider">Comm Earned</th>
                                            <th className="p-4 text-center text-white/50 font-bold text-xs uppercase tracking-wider">Tips</th>
                                            <th className="p-4 text-right text-luxe-gold font-bold text-xs uppercase tracking-wider">Total Payout</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {staffData.map((staff, idx) => (
                                            <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                <td className="p-4 font-bold text-white flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-inner" style={{ backgroundColor: `${staff.color}20`, color: staff.color, border: `1px solid ${staff.color}40` }}>
                                                        {staff.name.charAt(0)}
                                                    </div>
                                                    <span className="whitespace-nowrap">{staff.name}</span>
                                                </td>
                                                <td className="p-4 text-center font-bold text-white/70">{staff.bookings_count}</td>
                                                <td className="p-4 text-center text-white/60">${staff.base_salary.toLocaleString()}</td>
                                                <td className="p-4 text-center text-white/80">${staff.service_revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                                <td className="p-4 text-center text-white/50">{staff.commission_percent}%</td>
                                                <td className="p-4 text-center text-white/80">${staff.commission_earned.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                                <td className="p-4 text-center font-bold text-emerald-400">${staff.tip_amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                                <td className="p-4 text-right font-black text-luxe-gold text-lg">${staff.total_payout.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-white/40">No staff revenue data found for this period. Be sure appointments are assigned to staff.</div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB CONTENT: SALES BREAKDOWN */}
            {activeTab === 'sales' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                     
                     {/* Row 1: Retail vs Services Pivot */}
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         {/* Left: Intro */}
                         <div className="glass-panel p-6 flex flex-col justify-center col-span-1">
                             <h3 className="text-xl font-bold mb-2 text-luxe-gold">Service vs. Retail Pivot</h3>
                             <p className="text-white/50 text-sm">Compare how much of your revenue comes from salon services versus retail product upselling over the last {days} days.</p>
                         </div>
                         {/* Right: The Two Pivot Cards */}
                         <div className="col-span-1 md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                             {salesBreakdown.map((item, idx) => (
                                <div key={idx} className="glass-panel px-6 pt-4 pb-8 min-h-[140px] flex flex-col items-center justify-center group hover:border-luxe-gold/50 transition-colors bg-gradient-to-br from-black/40 to-transparent">
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:bg-luxe-gold/10 transition-colors">
                                        {item.type.includes('Services') ? <Scissors className="w-5 h-5 text-luxe-gold" /> : <ShoppingBag className="w-5 h-5 text-emerald-400" />}
                                    </div>
                                    <div className="text-white/50 text-sm font-medium uppercase tracking-wider mb-1">{item.type}</div>
                                    <div className="text-3xl font-black text-white">${item.value.toFixed(2)}</div>
                                </div>
                             ))}
                         </div>
                     </div>

                     {/* Row 2: Charts and Lists */}
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                         
                         {/* Peak Hours Heatmap */}
                         <div className="glass-panel p-6 lg:col-span-2 flex flex-col shadow-lg">
                              <h3 className="text-[#D4AF37] font-semibold mb-6 flex items-center text-lg">
                                  <BarChart3 className="w-5 h-5 mr-3" /> Peak Hours Analysis
                              </h3>
                              <div className="flex-1 w-full min-h-[300px]">
                                  <ResponsiveContainer width="100%" height="100%">
                                      <BarChart data={peakHours}>
                                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                          <XAxis dataKey="hour" stroke="rgba(255,255,255,0.2)" fontSize={12} tickMargin={10} minTickGap={10} />
                                          <YAxis stroke="rgba(255,255,255,0.2)" fontSize={12} allowDecimals={false} />
                                          <Tooltip 
                                              cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                              contentStyle={{ backgroundColor: '#18181B', borderColor: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px' }}
                                              itemStyle={{ color: 'white' }}
                                              formatter={(value: number) => [value, 'Bookings']}
                                          />
                                          <Bar dataKey="count" fill="#4ECDC4" radius={[6, 6, 0, 0]} barSize={28} />
                                      </BarChart>
                                  </ResponsiveContainer>
                              </div>
                         </div>

                         {/* Revenue Split Pie Chart & Top Services Stacked */}
                         <div className="space-y-6 lg:col-span-1 flex flex-col">
                             <div className="glass-panel p-6 flex flex-col items-center shadow-lg">
                                  <h3 className="text-[#D4AF37] font-semibold flex items-center w-full mb-4 text-lg">
                                      <PieIcon className="w-5 h-5 mr-3" /> Revenue Split
                                  </h3>
                                  {salesBreakdown.length === 0 ? (
                                      <p className="text-white/50 text-sm mt-10">No revenue data.</p>
                                  ) : (
                                      <div className="w-full h-[260px] flex flex-col">
                                          <div className="flex-1 min-h-0 w-full">
                                              <ResponsiveContainer width="100%" height="100%">
                                                  <PieChart>
                                                      <Pie
                                                          data={salesBreakdown}
                                                          cx="50%"
                                                          cy="50%"
                                                          innerRadius={65}
                                                          outerRadius={90}
                                                          paddingAngle={5}
                                                          dataKey="value"
                                                          nameKey="type"
                                                          strokeWidth={0}
                                                      >
                                                          {salesBreakdown.map((entry, index) => (
                                                              <Cell key={`cell-${index}`} fill={index === 0 ? '#D4AF37' : '#4ECDC4'} />
                                                          ))}
                                                      </Pie>
                                                      <Tooltip 
                                                          formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                                                          contentStyle={{ backgroundColor: '#1A1A1A', borderColor: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px' }}
                                                          itemStyle={{ color: 'white' }}
                                                      />
                                                  </PieChart>
                                              </ResponsiveContainer>
                                          </div>
                                          <div className="flex justify-center flex-wrap gap-x-6 gap-y-2 mt-4 pb-2">
                                              {salesBreakdown.map((entry, index) => (
                                                  <div key={index} className="flex items-center text-xs text-white/90 font-medium">
                                                      <span className="w-3 h-3 rounded-full flex-shrink-0 mr-2" style={{ backgroundColor: index === 0 ? '#D4AF37' : '#4ECDC4' }} />
                                                      <span className="truncate">{entry.type}</span>
                                                  </div>
                                              ))}
                                          </div>
                                      </div>
                                  )}
                             </div>
                             
                             {/* Top Services */}
                             <div className="glass-panel p-6 flex-1 shadow-lg">
                                  <h3 className="text-[#D4AF37] font-semibold mb-6 flex items-center text-lg">
                                      <Scissors className="w-5 h-5 mr-3" /> Top Services
                                  </h3>
                                  {services.length === 0 ? (
                                      <p className="text-white/50 text-sm">No services booked in this period.</p>
                                  ) : (
                                      <div className="space-y-4">
                                          {services.slice(0, 5).map((s, i) => (
                                              <div key={i} className="flex justify-between items-center group">
                                                  <div className="flex items-center">
                                                      <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-xs text-white/50 mr-3 group-hover:bg-[#D4AF37]/20 group-hover:text-[#D4AF37] transition-colors">{i + 1}</div>
                                                      <span className="text-white/90 text-[13px] font-medium leading-tight">{s.service_name}</span>
                                                  </div>
                                                  <div className="text-right flex-shrink-0 ml-2">
                                                      <div className="text-emerald-400 text-sm font-bold">${Number(s.total_revenue).toFixed(2)}</div>
                                                      <div className="text-white/40 text-[10px] uppercase font-bold tracking-wider">{s.booking_count} bookings</div>
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  )}
                             </div>
                         </div>
                         
                     </div>
                </div>
            )}

            {/* TAB CONTENT: P&L */}
            {activeTab === 'pnl' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <SummaryCard label="Gross Revenue" value={`$${totalRevenue.toLocaleString()}`} icon={DollarSign} />
                        <SummaryCard label="Total Expenses" value={`$${expenses.reduce((s, e) => s + Number(e.amount), 0).toLocaleString()}`} icon={Receipt} />
                        <SummaryCard label="Staff Payouts" value={`$${staffPaymentsList.reduce((s, p) => s + Number(p.amount), 0).toLocaleString()}`} icon={Banknote} />
                        <div className="glass-panel p-6 flex flex-col justify-center border-l-4 border-l-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/80 mb-1">Net Profit</p>
                            <h3 className="text-3xl font-black text-emerald-400">
                                ${((totalRevenue) - expenses.reduce((s, e) => s + Number(e.amount), 0) - staffPaymentsList.reduce((s, p) => s + Number(p.amount), 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Expenses Section */}
                        <div className="glass-panel p-6 border border-white/5 relative">
                            <div className="flex justify-between items-center mb-6">
                                <h4 className="font-bold flex items-center gap-2">
                                    <Receipt className="w-5 h-5 text-luxe-gold" />
                                    Business Expenses
                                </h4>
                                <button onClick={() => setShowAddExpense(true)} title="Add Expense" aria-label="Add Expense" className="p-2 rounded-xl bg-white/5 hover:bg-luxe-gold/20 text-luxe-gold transition-colors">
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                            
                            {expenses.length > 0 ? (
                                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {expenses.map((e, idx) => (
                                        <div key={idx} className="p-4 rounded-xl border border-white/5 bg-black/20 flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-white/90">{e.title}</p>
                                                {e.notes && <p className="text-[11px] text-white/50 mt-0.5 italic">"{e.notes}"</p>}
                                                <div className="flex gap-2 items-center mt-1 text-[10px]">
                                                    <span className="bg-white/10 px-2 py-0.5 rounded-full text-white/60 capitalize">{e.category}</span>
                                                    <span className="text-white/40">{new Date(e.expense_date).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <div className="font-black text-white/90">${Number(e.amount).toFixed(2)}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center py-12 text-white/30 text-sm">No expenses recorded for this period.</p>
                            )}
                        </div>

                        {/* Staff Ledger Section */}
                        <div className="glass-panel p-6 border border-white/5">
                            <div className="mb-6">
                                <h4 className="font-bold flex items-center gap-2">
                                    <Banknote className="w-5 h-5 text-emerald-400" />
                                    Staff Payments Ledger
                                </h4>
                                <p className="text-xs text-white/40 mt-1">Advances, salary clearances, and commission payouts.</p>
                            </div>
                            
                            {staffPaymentsList.length > 0 ? (
                                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {staffPaymentsList.map((p, idx) => (
                                        <div key={idx} className="p-4 rounded-xl border border-white/5 bg-black/20 flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-white/90">{p.staff?.full_name}</p>
                                                {p.notes && <p className="text-[11px] text-white/50 mt-0.5 italic">"{p.notes}"</p>}
                                                <div className="flex gap-2 items-center mt-1 text-[10px]">
                                                    <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full capitalize">{p.payment_type.replace('_', ' ')}</span>
                                                    <span className="text-white/40">{new Date(p.payment_date).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <div className="font-black text-emerald-400">${Number(p.amount).toFixed(2)}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center py-12 text-white/30 text-sm">No staff payments recorded for this period.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ADD EXPENSE MODAL */}
            {showAddExpense && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-luxe-obsidian border border-white/10 rounded-2xl p-8 w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Receipt className="w-6 h-6 text-luxe-gold" /> Add Expense
                            </h3>
                            <button onClick={() => setShowAddExpense(false)} title="Close Modal" aria-label="Close" className="p-2 hover:bg-white/10 rounded-xl transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Item / Title</label>
                                <input type="text" value={expTitle} onChange={e => setExpTitle(e.target.value)} placeholder="e.g. Color Tubes Restock"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all" />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Amount</label>
                                    <div className="relative">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 font-bold">$</div>
                                        <input type="number" value={expAmt} onChange={e => setExpAmt(e.target.value)} min="0" step="0.01"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 pl-8 text-sm outline-none focus:border-luxe-gold/50 transition-all" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Category</label>
                                    <select value={expCat} onChange={e => setExpCat(e.target.value)}
                                        className="w-full bg-zinc-900 text-white border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all">
                                        <option value="supplies">Supplies</option>
                                        <option value="rent">Rent / Utilities</option>
                                        <option value="marketing">Marketing</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Notes (Optional)</label>
                                <input type="text" value={expNotes} onChange={e => setExpNotes(e.target.value)} placeholder="Invoice # or details"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 transition-all" />
                            </div>
                        </div>

                        <button onClick={handleAddExpense} disabled={addingExp || !expTitle || !expAmt}
                            className="w-full mt-8 bg-gold-gradient text-luxe-obsidian font-bold py-3 rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                            {addingExp ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                            SAVE EXPENSE
                        </button>
                    </div>
                </div>
            )}

        </div>
        </FeatureLock>
    );
};

const SummaryCard: React.FC<{ label: string; value: string; icon: React.ElementType }> = ({ label, value, icon: Icon }) => (
    <div className="glass-panel p-6 flex items-center gap-4 group hover:gold-border transition-all">
        <div className="w-12 h-12 rounded-2xl bg-luxe-gold/10 flex items-center justify-center group-hover:bg-luxe-gold/20 transition-colors">
            <Icon className="w-6 h-6 text-luxe-gold" />
        </div>
        <div>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">{label}</p>
            <h3 className="text-2xl font-black">{value}</h3>
        </div>
    </div>
);
