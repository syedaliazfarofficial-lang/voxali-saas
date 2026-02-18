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
    Loader2
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
import { supabase } from '../lib/supabase';
import { TENANT_ID } from '../config/constants';
import { showToast } from './ui/ToastNotification';

interface DashboardStats {
    bookings_today: number;
    revenue_today: number;
    new_clients: number;
    calls_today: number;
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
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [chartData, setChartData] = useState<RevenueDay[]>([]);
    const [activities, setActivities] = useState<RecentBooking[]>([]);
    const [loading, setLoading] = useState(true);

    const [announcement, setAnnouncement] = useState('');
    const [announceSaving, setAnnounceSaving] = useState(false);


    const fetchAll = useCallback(async () => {
        if (!TENANT_ID) return;
        setLoading(true);
        try {
            const [statsRes, revenueRes, activityRes] = await Promise.all([
                supabase.rpc('rpc_dashboard_stats', { p_tenant_id: TENANT_ID }),
                supabase.rpc('rpc_weekly_revenue', { p_tenant_id: TENANT_ID }),
                supabase.rpc('rpc_recent_activity', { p_tenant_id: TENANT_ID }),
            ]);

            if (statsRes.data) setStats(statsRes.data as DashboardStats);
            if (revenueRes.data) setChartData((revenueRes.data as RevenueDay[]).map(r => ({ day: r.day, revenue: Number(r.revenue) })));
            if (activityRes.data) setActivities(activityRes.data as RecentBooking[]);
        } catch (err) {
            console.error('Dashboard fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-luxe-gold animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Today's Bookings" value={String(stats?.bookings_today ?? 0)} trend="live" icon={CalendarIcon} />
                <StatCard label="Today's Revenue" value={fmt(stats?.revenue_today ?? 0)} trend="live" icon={TrendingUp} />
                <StatCard label="New Clients" value={String(stats?.new_clients ?? 0)} trend="today" icon={Users} />
                <StatCard label="Bella Calls Today" value={String(stats?.calls_today ?? 0)} trend="live" icon={PhoneCall} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart */}
                <div className="lg:col-span-2 glass-panel p-6 flex flex-col h-[400px]">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <Activity className="w-5 h-5 text-luxe-gold" />
                            Weekly Revenue
                        </h3>
                        <span className="text-xs text-white/40">Last 7 days</span>
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
                            <div className="flex items-center justify-center h-full text-white/30 text-sm">No revenue data this week</div>
                        )}
                    </div>
                </div>

                {/* Live Activity Feed */}
                <div className="glass-panel p-6 flex flex-col">
                    <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-luxe-gold" />
                        Recent Bookings
                    </h3>
                    <div className="flex-1 space-y-4 overflow-y-auto max-h-72">
                        {activities.length === 0 && (
                            <p className="text-white/30 text-sm text-center py-8">No recent bookings</p>
                        )}
                        {activities.map((act) => (
                            <div key={act.id} className="flex gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 group">
                                <div className="w-10 h-10 rounded-full bg-luxe-gold/10 flex items-center justify-center flex-shrink-0">
                                    <CalendarIcon className="w-5 h-5 text-luxe-gold" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                        <span className="text-luxe-gold">{act.client_name}</span>
                                        {' — '}{act.service_name}
                                    </p>
                                    <p className="text-[11px] text-white/40 mt-0.5">with {act.stylist_name} · {act.status}</p>
                                </div>
                                <button
                                    aria-label="More options"
                                    className="opacity-0 group-hover:opacity-100 p-1 text-white/40 hover:text-white transition-all"
                                >
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={fetchAll}
                        className="mt-6 w-full py-2.5 rounded-xl border border-white/10 text-xs font-bold text-white/60 hover:text-white hover:bg-white/5 transition-all"
                    >
                        ↻ REFRESH
                    </button>
                </div>
            </div>

            {/* AI Control Center */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-panel p-6 border-l-4 border-l-luxe-gold">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Bot className="w-6 h-6 text-luxe-gold" />
                                AI Control Center (Bella)
                            </h3>
                            <p className="text-white/40 text-xs mt-1">Manage Bella's behavior and knowledge in real-time</p>
                        </div>
                        <button
                            onClick={async () => {
                                const { data } = await supabase.from('ai_agent_config').select('id, is_active').eq('tenant_id', TENANT_ID).single();
                                if (data) {
                                    await supabase.from('ai_agent_config').update({ is_active: !data.is_active, updated_at: new Date().toISOString() }).eq('id', data.id);
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
                                const { data } = await supabase.from('ai_agent_config').select('id').eq('tenant_id', TENANT_ID).single();
                                if (data) {
                                    await supabase.from('ai_agent_config').update({ announcements: announcement, updated_at: new Date().toISOString() }).eq('id', data.id);
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

                <div className="grid grid-cols-2 gap-6">
                    <QuickActionCard title="Add Walk-in" desc="One-click manual booking" icon={Zap} color="text-yellow-400" onClick={() => setActiveTab?.('bookings')} />
                    <QuickActionCard title="Marketing Blast" desc="Send SMS to all clients" icon={MessageSquare} color="text-blue-400" onClick={() => setActiveTab?.('marketing')} />
                    <QuickActionCard title="Confirmations" desc={`${stats?.bookings_today ?? 0} bookings today`} icon={CheckCircle2} color="text-green-400" onClick={() => setActiveTab?.('bookings')} />
                    <QuickActionCard title="No-Shows" desc="Track missed appointments" icon={XCircle} color="text-red-400" onClick={() => setActiveTab?.('bookings')} />
                </div>
            </div>
        </div>
    );
};

interface StatCardProps {
    label: string;
    value: string;
    trend: string;
    icon: React.ElementType;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, trend, icon: Icon }) => (
    <div className="glass-panel p-6 group hover:gold-border duration-300 transition-all relative overflow-hidden">
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
