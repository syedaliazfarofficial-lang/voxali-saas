import React, { useState, useEffect, useCallback } from 'react';
import {
    TrendingUp,
    Users,
    Calendar as CalendarIcon,
    PhoneCall,
    Activity,
    ShieldAlert,
    CheckCircle2,
    Bot,
    Loader2,
    BarChart3,
    CalendarDays
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell,
    ReferenceLine,
} from 'recharts';
import { supabaseAdmin } from '../lib/supabase';
import { useTenant } from '../context/TenantContext';
import { showToast } from './ui/ToastNotification';
import { DashboardSkeleton } from './ui/Skeleton';
import { useAuth } from '../context/AuthContext';

interface DashboardStats {
    bookings_today: number;
    revenue_today: number;
    new_clients: number;
    calls_today: number;
    twilio_number?: string;
    ai_used?: number;
    sms_used?: number;
    ai_included?: number;
    sms_included?: number;
    ai_topup?: number;
    sms_topup?: number;
}

interface RevenueDay {
    day: string;
    revenue: number;
}

interface RecentBooking {
    id: string;
    client_name: string;
    service_name: string;
    stylist_name: string;
    status: string;
    created_at: string;
}

interface DashboardHomeProps {
    setActiveTab?: (tab: string) => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({ setActiveTab }) => {
    const { tenantId, planTier } = useTenant();
    const { isOwner, isSuperAdmin } = useAuth();
    const isOwnerPrivilege = isOwner || isSuperAdmin;
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [chartData, setChartData] = useState<RevenueDay[]>([]);
    const [activities, setActivities] = useState<RecentBooking[]>([]);
    const [loading, setLoading] = useState(true);

    const [announcement, setAnnouncement] = useState('');
    const [announceSaving, setAnnounceSaving] = useState(false);
    const [aiActive, setAiActive] = useState<boolean | null>(null);
    const [aiToggling, setAiToggling] = useState(false);
    const [chartRange, setChartRange] = useState('week');

    const fetchAll = useCallback(async () => {
        if (!tenantId) return;
        setLoading(true);
        try {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayISO = todayStart.toISOString();

            const [bookingsRes, clientsRes, callsRes, tenantRes, aiConfigRes] = await Promise.all([
                supabaseAdmin.from('bookings').select('id, total_price')
                    .eq('tenant_id', tenantId).gte('start_time', todayISO)
                    .not('status', 'eq', 'cancelled')
                    .not('service_id', 'eq', '00000000-0000-0000-0000-000000000000'),
                supabaseAdmin.from('clients').select('id')
                    .eq('tenant_id', tenantId).gte('created_at', todayISO),
                supabaseAdmin.from('call_logs').select('id')
                    .eq('tenant_id', tenantId).gte('created_at', todayISO)
                    .gt('call_duration', 0),
                supabaseAdmin.from('tenants').select('twilio_number, ai_minutes_used, sms_used, ai_minutes_included, sms_included, ai_minutes_topup_balance, sms_topup_balance')
                    .eq('id', tenantId).single(),
                supabaseAdmin.from('ai_agent_config').select('id, is_active, announcements')
                    .eq('tenant_id', tenantId).single()
            ]);

            if (aiConfigRes.data) {
                setAiActive(aiConfigRes.data.is_active);
                setAnnouncement(prev => prev || aiConfigRes.data.announcements || '');
            }

            const revToday = (bookingsRes.data || []).reduce((s: number, b: any) => s + (Number(b.total_price) || 0), 0);
            const tData = tenantRes.data || {};
            setStats({
                bookings_today: bookingsRes.data?.length || 0,
                revenue_today: revToday,
                new_clients: clientsRes.data?.length || 0,
                calls_today: callsRes.data?.length || 0,
                twilio_number: tData.twilio_number || '',
                ai_used: tData.ai_minutes_used || 0,
                sms_used: tData.sms_used || 0,
                ai_included: tData.ai_minutes_included || 0,
                sms_included: tData.sms_included || 0,
                ai_topup: tData.ai_minutes_topup_balance || 0,
                sms_topup: tData.sms_topup_balance || 0,
            });

            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - 6);
            weekStart.setHours(0, 0, 0, 0);
            const { data: weekBookings } = await supabaseAdmin.from('bookings')
                .select('start_time, total_price')
                .eq('tenant_id', tenantId)
                .gte('start_time', weekStart.toISOString())
                .not('status', 'eq', 'cancelled');

            const dayMap: Record<string, number> = {};
            for (let i = 0; i < 7; i++) {
                const d = new Date();
                d.setDate(d.getDate() - 6 + i);
                dayMap[d.toLocaleDateString('en-US', { weekday: 'short' })] = 0;
            }
            (weekBookings || []).forEach((b: any) => {
                const key = new Date(b.start_time).toLocaleDateString('en-US', { weekday: 'short' });
                if (dayMap[key] !== undefined) dayMap[key] += Number(b.total_price) || 0;
            });
            setChartData(Object.entries(dayMap).map(([day, revenue]) => ({ day, revenue })));

            const { data: recentData } = await supabaseAdmin.from('bookings')
                .select(`id, status, created_at, start_time, clients(name), services(name), staff!bookings_stylist_id_fkey(full_name)`)
                .eq('tenant_id', tenantId)
                .gte('start_time', todayISO)
                .not('service_id', 'eq', '00000000-0000-0000-0000-000000000000')
                .order('start_time')
                .limit(10);

            if (recentData) {
                setActivities(recentData.map((b: any) => ({
                    id: b.id,
                    client_name: b.clients?.name || 'Walk-in',
                    service_name: b.services?.name || 'Service',
                    stylist_name: b.staff?.full_name || 'Unassigned',
                    status: b.status,
                    created_at: b.created_at,
                })));
            }
        } catch (err) {
            console.error('Dashboard fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [tenantId]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;

    const totalAiMins = (stats?.ai_included ?? 0) + (stats?.ai_topup ?? 0);
    const availAiMins = Math.max(0, totalAiMins - (stats?.ai_used ?? 0));

    const totalSms = (stats?.sms_included ?? 0) + (stats?.sms_topup ?? 0);
    const availSms = Math.max(0, totalSms - (stats?.sms_used ?? 0));

    if (loading) return <DashboardSkeleton />;

    const maxRev = Math.max(...chartData.map(d => d.revenue), 1);

    return (
        <div className="flex flex-col gap-3 w-full max-w-7xl mx-auto pb-24 md:pb-4">

            {/* ── HEADER ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-bold text-on-surface tracking-tight">Overview</h1>
                </div>
            </div>

            {/* ── STAT CARDS ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: "Today's Bookings", value: String(stats?.bookings_today ?? 0), sub: '+12% from yesterday', icon: CalendarIcon, tab: 'bookings' },
                    { label: "Today's Revenue",   value: fmt(stats?.revenue_today ?? 0),    sub: '+8% vs weekly avg',   icon: TrendingUp,  tab: 'analytics' },
                    { label: 'New Clients',        value: String(stats?.new_clients ?? 0),   sub: '3 booked via AI',     icon: Users,       tab: 'clients' },
                    { label: 'Calls Today',        value: String(stats?.calls_today ?? 0),   sub: '88% handled by Bella',icon: PhoneCall,   tab: 'calls' },
                ].map((card, i) => {
                    const Icon = card.icon;
                    return (
                        <motion.button
                            key={card.label}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.06, duration: 0.35 }}
                            onClick={() => setActiveTab?.(card.tab)}
                            className="group relative text-left bg-surface-container-lowest border border-outline-variant rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
                        >
                            {/* Card top row: icon + live badge */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center">
                                    <Icon className="w-4 h-4 text-white/70" strokeWidth={1.8} />
                                </div>
                                {/* Live badge — with safe right padding */}
                                <span className="text-[9px] font-bold px-2 py-0.5 mr-0.5 rounded-full bg-white/10 text-white/50 flex items-center gap-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                                    Live
                                </span>
                            </div>
                            {/* Label — bright enough to read */}
                            <p className="text-[10px] font-semibold text-white/60 uppercase tracking-widest mb-1">{card.label}</p>
                            {/* Metric number */}
                            <p className="text-2xl font-bold text-on-surface tracking-tight leading-none mb-2">{card.value}</p>
                            {/* Trend */}
                            <p className="text-[10px] text-white/40 font-medium flex items-center gap-1">
                                <TrendingUp className="w-2.5 h-2.5" />
                                {card.sub}
                            </p>
                        </motion.button>
                    );
                })}
            </div>

            {/* ── CHART + SCHEDULE ── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

                {/* Revenue Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25, duration: 0.4 }}
                    className="lg:col-span-3 bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col"
                >
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-[13px] font-bold text-on-surface">Weekly Revenue</h2>
                                <span className="text-[13px] font-bold text-on-surface">${chartData.reduce((s, d) => s + d.revenue, 0).toFixed(0)}</span>
                                <span className="text-[10px] text-white/40 font-medium">this week</span>
                            </div>
                            <p className="text-[10px] text-white/40 mt-0.5">Last 7 days performance</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <select
                                value={chartRange}
                                onChange={e => setChartRange(e.target.value)}
                                className="text-[11px] font-semibold border border-outline-variant rounded-lg px-2 py-1 outline-none cursor-pointer bg-transparent text-white/70"
                            >
                                <option value="today">Today</option>
                                <option value="week">Last 7 Days</option>
                                <option value="month">This Month</option>
                            </select>
                            {/* Export button — readable contrast */}
                            <button className="text-[11px] font-semibold border border-white/20 rounded-lg px-2 py-1 text-white/70 hover:bg-surface-container-high hover:text-white transition-colors">
                                Export
                            </button>
                        </div>
                    </div>

                    <div className="flex-1">
                        <ResponsiveContainer width="100%" height={140}>
                            <BarChart data={chartData} margin={{ top: 4, right: 0, left: -18, bottom: 0 }} barCategoryGap="28%" maxBarSize={60}>
                                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(255,255,255,0.06)" />
                                {/* Dotted baseline to fill empty chart area */}
                                <ReferenceLine y={0} stroke="rgba(255,255,255,0.10)" strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="day"
                                    axisLine={false}
                                    tickLine={false}
                                    height={20}
                                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)', fontWeight: 600, dy: 4 }}
                                />
                                <YAxis
                                    domain={[0, 'auto']}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }}
                                    tickFormatter={(v: number) => v === 0 ? '' : `$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.04)', rx: 6 }}
                                    contentStyle={{
                                        borderRadius: '10px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        backgroundColor: '#1c1c20',
                                        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        padding: '6px 10px'
                                    }}
                                    labelStyle={{ color: '#ffffff', fontWeight: 700 }}
                                    itemStyle={{ color: '#ffffff', padding: 0 }}
                                    formatter={(value: number) => [`$${value.toFixed(0)}`, 'Revenue']}
                                />
                                <Bar dataKey="revenue" radius={[5, 5, 0, 0]} minPointSize={3}>
                                    {chartData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.revenue === maxRev && entry.revenue > 0
                                                ? '#ffffff'
                                                : entry.revenue > 0
                                                    ? 'rgba(255,255,255,0.25)'
                                                    : 'rgba(255,255,255,0.06)'
                                            }
                                            stroke="none"
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Today's Schedule */}
                <motion.div
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                    className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h2 className="text-[13px] font-bold text-on-surface">Today's Schedule</h2>
                            <p className="text-[10px] text-white/40 mt-0.5">{activities.length} appointments</p>
                        </div>
                        <button
                            onClick={() => setActiveTab?.('bookings')}
                            className="text-[10px] font-bold text-white/60 border border-outline-variant rounded-md px-2 py-1 hover:bg-surface-container-high hover:text-white transition-colors"
                        >
                            View Full
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 max-h-[220px] pr-1">
                        {activities.length === 0 ? (
                            /* Perfectly centered empty state */
                            <div className="flex flex-col items-center justify-center h-full min-h-[160px] gap-2 text-on-surface-variant">
                                <CalendarDays className="w-10 h-10 opacity-20" />
                                <p className="text-sm font-semibold text-white/50">Free day ahead!</p>
                                <p className="text-xs text-center max-w-[180px] text-white/30">No appointments scheduled for today.</p>
                            </div>
                        ) : (
                            activities.map((act, i) => {
                                const d = act.created_at ? new Date(act.created_at) : new Date();
                                const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                const isPending = act.status === 'pending';
                                const isConfirmed = act.status === 'confirmed';
                                return (
                                    <div
                                        key={i}
                                        className={`group flex items-start gap-3 p-3 rounded-xl transition-colors cursor-pointer hover:bg-surface-container-high border ${isPending ? 'border-[#e53935]/20 bg-[#e53935]/5' : 'border-transparent'}`}
                                    >
                                        <div className="min-w-[44px] text-right shrink-0 pt-0.5">
                                            <p className="text-[10px] font-bold text-on-surface leading-tight">{time}</p>
                                        </div>
                                        <div className={`w-0.5 self-stretch rounded-full shrink-0 ${isPending ? 'bg-[#e53935]' : isConfirmed ? 'bg-[#00b67a]' : 'bg-outline-variant'}`} />
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-[13px] font-bold truncate ${isPending ? 'text-[#e53935]' : 'text-on-surface'}`}>{act.service_name}</p>
                                            <p className="text-[11px] text-white/40 truncate">{act.client_name} · {act.stylist_name}</p>
                                            {isPending && (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[#e53935] mt-1">
                                                    <ShieldAlert className="w-2.5 h-2.5" /> Unconfirmed
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </motion.div>
            </div>

            {/* ── AI Control + Resource Usage ── */}
            {isOwnerPrivilege && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                    {/* Bella AI Panel */}
                    {(planTier === 'basic' || planTier === 'Essentials') ? (
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 flex flex-col items-center text-center gap-5"
                        >
                            <div className="w-14 h-14 bg-surface-container-high rounded-2xl flex items-center justify-center">
                                <Bot className="w-7 h-7 text-white/60" strokeWidth={1.5} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-on-surface">AI Receptionist</h3>
                                <p className="text-sm text-white/40 mt-1.5 max-w-xs mx-auto leading-relaxed">Upgrade to automate bookings and handle calls 24/7 with Bella AI.</p>
                            </div>
                            <button
                                onClick={() => setActiveTab?.('settings')}
                                className="px-6 py-2.5 bg-on-surface text-surface-container-lowest text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
                            >
                                View Plans →
                            </button>
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 flex flex-col gap-2"
                        >
                            {/* Header */}
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-on-surface rounded-lg flex items-center justify-center shrink-0">
                                    <Bot className="w-4 h-4 text-surface-container-lowest" strokeWidth={1.8} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-[12px] font-bold text-on-surface">Bella AI Control Panel</h3>
                                    <p className="text-[10px] text-white/40">Virtual Receptionist Status</p>
                                </div>
                                <button
                                    disabled={aiToggling || aiActive === null}
                                    onClick={async () => {
                                        setAiToggling(true);
                                        try {
                                            const { data } = await supabaseAdmin.from('ai_agent_config').select('id, is_active').eq('tenant_id', tenantId).single();
                                            if (data) {
                                                const newVal = !data.is_active;
                                                await supabaseAdmin.from('ai_agent_config').update({ is_active: newVal, updated_at: new Date().toISOString() }).eq('id', data.id);
                                                setAiActive(newVal);
                                                showToast(newVal ? '✅ Bella RESTARTED!' : '🛑 Bella STOPPED');
                                            }
                                        } catch (e) { console.error(e); }
                                        setAiToggling(false);
                                    }}
                                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all shrink-0 ${aiActive
                                        ? 'border-[#e53935]/30 text-[#e53935] bg-[#e53935]/10 hover:bg-[#e53935]/20'
                                        : 'border-[#00b67a]/30 text-[#00b67a] bg-[#00b67a]/10 hover:bg-[#00b67a]/20'
                                    } ${aiToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {aiToggling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : aiActive ? <ShieldAlert className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                    {aiToggling ? '...' : aiActive ? 'Stop' : 'Start'}
                                </button>
                            </div>

                            {/* Status Fields — symmetric boxes */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-surface-container-high rounded-xl p-3 border border-outline-variant min-h-[60px] flex flex-col justify-between">
                                    <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-1.5">Receptionist Number</p>
                                    <div className="flex items-center justify-between gap-1">
                                        <p className="text-[11px] font-bold text-on-surface font-mono truncate">{stats?.twilio_number || '—'}</p>
                                        <button
                                            className="shrink-0 text-white/40 hover:text-white transition-colors"
                                            onClick={() => { navigator.clipboard.writeText(stats?.twilio_number || ''); showToast('Copied!'); }}
                                        >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                        </button>
                                    </div>
                                </div>
                                <div className={`rounded-xl p-3 border min-h-[60px] flex flex-col justify-between ${aiActive ? 'bg-[#00b67a]/10 border-[#00b67a]/20' : 'bg-surface-container-high border-outline-variant'}`}>
                                    <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-1.5">Active Status</p>
                                    <div className="flex items-center gap-1.5">
                                        <div className={`w-1.5 h-1.5 rounded-full ${aiActive ? 'bg-[#00b67a] animate-pulse' : 'bg-[#e53935]'}`} />
                                        <p className={`text-[11px] font-bold ${aiActive ? 'text-[#00b67a]' : 'text-white/60'}`}>
                                            {aiActive === null ? 'Loading...' : aiActive ? 'Online & Handling Calls' : 'Offline'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Manage Settings — clear footer with border-top */}
                            <button
                                onClick={() => setActiveTab?.('ai')}
                                className="flex items-center justify-between px-3 py-2.5 bg-surface-container-high rounded-xl border border-outline-variant hover:bg-surface-container transition-colors mt-1"
                                style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
                            >
                                <span className="text-[11px] font-semibold text-white/70">Manage Bella AI Settings</span>
                                <span className="text-[11px] text-white/40">→</span>
                            </button>
                        </motion.div>
                    )}

                    {/* Resource Usage */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 flex flex-col gap-3"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-[13px] font-bold text-on-surface">Resource Usage</h3>
                                <p className="text-[10px] text-white/40 mt-0.5">Resets on billing cycle</p>
                            </div>
                            <button
                                onClick={() => { localStorage.setItem('voxali_settings_tab', 'billing'); setActiveTab?.('settings'); }}
                                className="text-[10px] font-bold border border-outline-variant rounded-md px-2 py-1 text-white/60 hover:bg-surface-container-high hover:text-white transition-colors"
                            >
                                View Billing
                            </button>
                        </div>

                        <div className="flex flex-col gap-4">
                            <PremiumUsageBar label="Call Minutes" used={stats?.ai_used ?? 0} limit={totalAiMins} color="#101113" darkColor="#F5F5F7" />
                            <PremiumUsageBar label="SMS Credits"  used={stats?.sms_used ?? 0} limit={totalSms}    color="#101113" darkColor="#F5F5F7" />
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

/* ── Premium Usage Bar ── */
interface PremiumUsageBarProps {
    label: string;
    used: number;
    limit: number;
    color: string;
    darkColor: string;
}

const PremiumUsageBar: React.FC<PremiumUsageBarProps> = ({ label, used, limit, color, darkColor }) => {
    const percent = limit === 0 ? 0 : Math.min(100, Math.max(0, (used / limit) * 100));
    const isDanger = percent >= 100;
    const isWarning = percent > 80 && !isDanger;
    const barColor = isDanger ? '#e53935' : isWarning ? '#f59e0b' : '#ffffff';

    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <span className="text-[12px] font-semibold text-white/70">{label}</span>
                {/* Bolder usage numbers */}
                <span className={`text-[12px] font-bold ${isDanger ? 'text-[#e53935]' : isWarning ? 'text-[#f59e0b]' : 'text-white/80'}`}>
                    {used.toLocaleString()} <span className="text-white/30 font-normal">/ {limit.toLocaleString()}</span>
                </span>
            </div>
            {/* Thicker progress bar (h-2.5) */}
            <div className="h-2.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: barColor }}
                />
            </div>
            <p className="text-[9px] font-bold text-white/30 uppercase tracking-wider mt-1.5">
                {Math.round(percent)}% consumed
            </p>
        </div>
    );
};

interface UsageBarProps {
    label: string;
    used: number;
    limit: number;
    colorClass: string;
    hideBar?: boolean;
}

const UsageBar: React.FC<UsageBarProps> = ({ label, used, limit, colorClass, hideBar }) => {
    const percent = limit === 0 ? 0 : Math.min(100, Math.max(0, (used / limit) * 100));
    return (
        <div>
            <div className="flex justify-between mb-2">
                <span className="text-xs text-white/40">{label}</span>
                <span className="text-xs font-bold text-on-surface">{used} / {limit}</span>
            </div>
            {!hideBar && (
                <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                    <div className={`h-full ${colorClass} rounded-full`} style={{ width: `${percent}%` }} />
                </div>
            )}
        </div>
    );
};