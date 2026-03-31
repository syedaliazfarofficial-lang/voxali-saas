import React, { useState, useEffect, useCallback } from 'react';
import {
    TrendingUp,
    Users,
    Calendar as CalendarIcon,
    PhoneCall,
    Activity,
    Zap,
    ShieldAlert,
    MessageSquare,
    MoreVertical,
    CheckCircle2,
    XCircle,
    Bot,
    Loader2,
    Clock,
    BarChart3,
    CalendarDays
} from 'lucide-react';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import { supabaseAdmin } from '../lib/supabase';
import { useTenant } from '../context/TenantContext';
import { showToast } from './ui/ToastNotification';
import { DashboardSkeleton } from './ui/Skeleton';

interface DashboardStats {
    bookings_today: number;
    revenue_today: number;
    new_clients: number;
    calls_today: number;
    twilio_number?: string;
    ai_used?: number;
    ai_limit?: number;
    sms_used?: number;
    sms_limit?: number;
    email_used?: number;
    email_limit?: number;
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
    const { tenantId } = useTenant();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [chartData, setChartData] = useState<RevenueDay[]>([]);
    const [activities, setActivities] = useState<RecentBooking[]>([]);
    const [loading, setLoading] = useState(true);

    const [announcement, setAnnouncement] = useState('');
    const [announceSaving, setAnnounceSaving] = useState(false);
    const [chartRange, setChartRange] = useState('week');


    const fetchAll = useCallback(async () => {
        if (!tenantId) return;
        setLoading(true);
        try {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayISO = todayStart.toISOString();

            // Stats: counts for today
            const [bookingsRes, clientsRes, callsRes, tenantRes] = await Promise.all([
                supabaseAdmin.from('bookings').select('id, total_price')
                    .eq('tenant_id', tenantId).gte('start_time', todayISO)
                    .not('status', 'eq', 'cancelled'),
                supabaseAdmin.from('clients').select('id')
                    .eq('tenant_id', tenantId).gte('created_at', todayISO),
                supabaseAdmin.from('call_logs').select('id')
                    .eq('tenant_id', tenantId).gte('created_at', todayISO),
                supabaseAdmin.from('tenants').select('twilio_number, ai_minutes_used, plan_ai_minutes_limit, sms_used, plan_sms_limit, emails_used, plan_email_limit')
                    .eq('id', tenantId).single()
            ]);

            const revToday = (bookingsRes.data || []).reduce((s: number, b: any) => s + (Number(b.total_price) || 0), 0);

            const tData = tenantRes.data || {};
            setStats({
                bookings_today: bookingsRes.data?.length || 0,
                revenue_today: revToday,
                new_clients: clientsRes.data?.length || 0,
                calls_today: callsRes.data?.length || 0,
                twilio_number: tData.twilio_number || '',
                ai_used: tData.ai_minutes_used || 0,
                ai_limit: tData.plan_ai_minutes_limit || 150,
                sms_used: tData.sms_used || 0,
                sms_limit: tData.plan_sms_limit || 200,
                email_used: tData.emails_used || 0,
                email_limit: tData.plan_email_limit || 500,
            });

            // Weekly revenue chart
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

            // Recent activity (today's bookings with client/service/stylist names)
            const { data: recentData } = await supabaseAdmin.from('bookings')
                .select(`id, status, created_at, start_time, clients(name), services(name), staff!bookings_stylist_id_fkey(full_name)`)
                .eq('tenant_id', tenantId)
                .gte('start_time', todayISO)
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

    if (loading) return <DashboardSkeleton />;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Today's Bookings" value={String(stats?.bookings_today ?? 0)} trend="live" icon={CalendarIcon} onClick={() => setActiveTab?.('bookings')} />
                <StatCard label="Today's Revenue" value={fmt(stats?.revenue_today ?? 0)} trend="live" icon={TrendingUp} onClick={() => setActiveTab?.('analytics')} />
                <StatCard label="New Clients" value={String(stats?.new_clients ?? 0)} trend="today" icon={Users} onClick={() => setActiveTab?.('clients')} />
                <StatCard label="Bella Calls Today" value={String(stats?.calls_today ?? 0)} trend="live" icon={PhoneCall} onClick={() => setActiveTab?.('call_logs')} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart */}
                <div className="lg:col-span-2 glass-panel p-6 flex flex-col h-[400px]">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <Activity className="w-5 h-5 text-luxe-gold" />
                            {chartRange === 'today' ? "Today's Revenue" : chartRange === 'month' ? 'Monthly Revenue' : 'Weekly Revenue'}
                        </h3>
                        <select
                            value={chartRange}
                            onChange={e => setChartRange(e.target.value)}
                            title="Select date range"
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-bold text-white/60 outline-none focus:border-luxe-gold/50 cursor-pointer transition-all"
                        >
                            <option value="today">Today</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                        </select>
                    </div>
                    <div className="flex-1 w-full">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#ffffff40', fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#ffffff40', fontSize: 12 }} tickFormatter={(v: number) => `$${v}`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                        itemStyle={{ color: '#D4AF37' }}
                                        formatter={(value: number) => [`$${value}`, 'Revenue']}
                                    />
                                    <Area type="monotone" dataKey="revenue" stroke="#D4AF37" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full gap-3">
                                <BarChart3 className="w-12 h-12 text-white/[0.06]" />
                                <p className="text-white/30 text-sm">No revenue data this week</p>
                                <p className="text-white/15 text-[10px]">Revenue will appear once bookings are completed</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Today's Schedule */}
                <div className="glass-panel p-6 flex flex-col">
                    <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-luxe-gold" />
                        Today's Schedule
                    </h3>
                    <div className="flex-1 space-y-1 overflow-y-auto max-h-72">
                        {activities.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                <CalendarDays className="w-12 h-12 text-white/[0.06]" />
                                <p className="text-white/30 text-sm">No appointments today</p>
                                <p className="text-white/15 text-[10px]">New bookings will appear here</p>
                            </div>
                        ) : (
                            activities.map((act, idx) => (
                                <div key={act.id} className="flex gap-3 py-3 px-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 group">
                                    {/* Timeline dot */}
                                    <div className="flex flex-col items-center pt-1">
                                        <div className={`w-2.5 h-2.5 rounded-full ${act.status === 'confirmed' ? 'bg-green-500' : act.status === 'pending' ? 'bg-yellow-500' : 'bg-white/20'}`} />
                                        {idx < activities.length - 1 && <div className="w-px flex-1 bg-white/10 mt-1" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold">
                                            <span className="text-luxe-gold">{act.client_name}</span>
                                            <span className="text-white/40 font-normal"> — {act.service_name}</span>
                                        </p>
                                        <p className="text-[11px] text-white/40 mt-0.5">
                                            with {act.stylist_name} · <span className={act.status === 'confirmed' ? 'text-green-400' : act.status === 'pending' ? 'text-yellow-400' : 'text-white/30'}>{act.status}</span>
                                        </p>
                                    </div>
                                    <button
                                        aria-label="More options"
                                        className="opacity-0 group-hover:opacity-100 p-1 text-white/40 hover:text-white transition-all self-center"
                                    >
                                        <MoreVertical className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                    <button
                        onClick={fetchAll}
                        className="mt-4 w-full py-2.5 rounded-xl border border-white/10 text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 transition-all"
                    >
                        ↻ REFRESH
                    </button>
                </div>
            </div>

            {/* AI Control Center */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-panel p-6 border-l-4 border-l-luxe-gold">
                    {stats?.twilio_number && (
                        <div className="mb-6 p-4 rounded-xl bg-luxe-gold/10 border border-luxe-gold/20 flex flex-col gap-2">
                            <h4 className="font-bold text-luxe-gold flex items-center gap-2">
                                <PhoneCall className="w-5 h-5" />
                                Your AI Receptionist Number
                            </h4>
                            <p className="text-2xl font-mono text-white/90 tracking-wide">{stats.twilio_number}</p>
                            <p className="text-xs text-white/50">
                                <b>Setup Instructions:</b> Using your current Salon phone provider's settings, set up <b>Call Forwarding</b> so missed calls or all incoming calls automatically forward to this number to have Bella answer them.
                            </p>
                        </div>
                    )}
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Bot className="w-6 h-6 text-luxe-gold" />
                                AI Control Center (Bella)
                            </h3>
                            <p className="text-white/40 text-xs mt-1">Manage Bella's behavior and knowledge in real-time</p>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-[10px] text-green-400/70">Last AI Activity: Handled a booking 15 mins ago</span>
                            </div>
                        </div>
                        <button
                            onClick={async () => {
                                const { data } = await supabaseAdmin.from('ai_agent_config').select('id, is_active').eq('tenant_id', tenantId).single();
                                if (data) {
                                    await supabaseAdmin.from('ai_agent_config').update({ is_active: !data.is_active, updated_at: new Date().toISOString() }).eq('id', data.id);
                                    showToast(data.is_active ? '🛑 Bella STOPPED' : '✅ Bella RESTARTED');
                                }
                            }}
                            className="p-2 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center gap-2"
                        >
                            <ShieldAlert className="w-4 h-4" />
                            <span className="text-xs font-bold">EMERGENCY STOP</span>
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Shop Announcements</label>
                            <textarea
                                value={announcement}
                                onChange={e => setAnnouncement(e.target.value)}
                                placeholder="e.g. Closing early at 3pm today for a team event..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-luxe-gold/50 h-24 resize-none transition-all"
                            />
                        </div>
                        <button
                            disabled={announceSaving}
                            onClick={async () => {
                                setAnnounceSaving(true);
                                const { data } = await supabaseAdmin.from('ai_agent_config').select('id').eq('tenant_id', tenantId).single();
                                if (data) {
                                    await supabaseAdmin.from('ai_agent_config').update({ announcements: announcement, updated_at: new Date().toISOString() }).eq('id', data.id);
                                    showToast('Bella updated!');
                                }
                                setAnnounceSaving(false);
                            }}
                            className="w-full bg-gold-gradient text-luxe-obsidian font-bold py-3 rounded-xl shadow-lg shadow-luxe-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {announceSaving ? 'SAVING...' : "UPDATE BELLA'S KNOWLEDGE"}
                        </button>
                    </div>
                </div>

                <div className="glass-panel p-6 border-t-4 border-t-blue-500/50 flex flex-col justify-between">
                    <div>
                        <h3 className="font-bold text-lg flex items-center gap-2 mb-6">
                            <Activity className="w-5 h-5 text-blue-400" />
                            Current Plan Usage
                        </h3>
                        <div className="space-y-5">
                            <UsageBar label="AI Call Minutes" used={stats?.ai_used ?? 0} limit={stats?.ai_limit ?? 150} color="bg-emerald-500" />
                            <UsageBar label="SMS Credits" used={stats?.sms_used ?? 0} limit={stats?.sms_limit ?? 200} color="bg-blue-500" />
                            <UsageBar label="Email Campaigns" used={stats?.email_used ?? 0} limit={stats?.email_limit ?? 500} color="bg-purple-500" />
                        </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center text-xs">
                        <span className="text-white/40">Usage resets on your billing cycle</span>
                        <button onClick={() => setActiveTab?.('settings')} className="text-luxe-gold font-bold hover:underline">Manage Plan</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface UsageBarProps {
    label: string;
    used: number;
    limit: number;
    color: string;
}

const UsageBar: React.FC<UsageBarProps> = ({ label, used, limit, color }) => {
    const percent = Math.min(100, Math.max(0, (used / limit) * 100));
    const isWarning = percent > 85;
    const isDanger = percent >= 100;

    return (
        <div>
            <div className="flex justify-between items-end mb-1.5">
                <span className="text-xs font-bold text-white/70 tracking-wide">{label}</span>
                <span className="text-xs font-mono">
                    <span className={isDanger ? 'text-red-400 font-bold' : isWarning ? 'text-yellow-400 font-bold' : 'text-white'}>
                        {used}
                    </span>
                    <span className="text-white/30"> / {limit}</span>
                </span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                    className={`h-full ${isDanger ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : color} transition-all duration-1000 ease-out`}
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    );
};

interface StatCardProps {
    label: string;
    value: string;
    trend: string;
    icon: React.ElementType;
    onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, trend, icon: Icon, onClick }) => (
    <div
        onClick={onClick}
        className={`glass-panel p-6 group hover:gold-border duration-300 transition-all relative overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}
    >
        <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-luxe-gold/10 transition-colors">
                <Icon className="w-5 h-5 text-white/40 group-hover:text-luxe-gold" />
            </div>
            <span className="text-xs font-bold text-luxe-gold bg-luxe-gold/10 px-2 py-1 rounded flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                {trend}
            </span>
        </div>
        <p className="text-white/40 text-sm font-medium relative z-10">{label}</p>
        <h3 className="text-3xl font-bold mt-1 relative z-10">{value}</h3>
        <div className="absolute top-0 right-0 p-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
            <Icon className="w-24 h-24 -mr-8 -mt-8" />
        </div>
    </div>
);

interface QuickActionProps {
    title: string;
    desc: string;
    icon: React.ElementType;
    color: string;
    onClick?: () => void;
}

const QuickActionCard: React.FC<QuickActionProps> = ({ title, desc, icon: Icon, color, onClick }) => (
    <button onClick={onClick} className="glass-panel p-6 flex flex-col items-center justify-center text-center group hover:gold-border duration-300 transition-all">
        <Icon className={`w-8 h-8 ${color} mb-3 group-hover:scale-110 transition-transform`} />
        <h4 className="font-bold text-sm tracking-tight">{title}</h4>
        <p className="text-[10px] text-white/30 mt-1 uppercase tracking-widest">{desc}</p>
    </button>
);
