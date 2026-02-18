import React, { useState, useEffect, useCallback } from 'react';
import {
    TrendingUp,
    BarChart3,
    PieChart as PieIcon,
    DollarSign,
    Calendar,
    Loader2,
    Download
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
import { supabase } from '../lib/supabase';
import { TENANT_ID } from '../config/constants';

interface RevDay { day: string; revenue: number; booking_count: number }
interface ServiceRow { service_name: string; booking_count: number; total_revenue: number }
interface StatusRow { status: string; count: number }

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
    const [revData, setRevData] = useState<RevDay[]>([]);
    const [services, setServices] = useState<ServiceRow[]>([]);
    const [statuses, setStatuses] = useState<StatusRow[]>([]);
    const [days, setDays] = useState(30);
    const [loading, setLoading] = useState(true);

    const fetchAll = useCallback(async () => {
        if (!TENANT_ID) return;
        setLoading(true);
        try {
            const [revRes, svcRes, stRes] = await Promise.all([
                supabase.rpc('rpc_analytics_revenue', { p_tenant_id: TENANT_ID, p_days: days }),
                supabase.rpc('rpc_analytics_services', { p_tenant_id: TENANT_ID }),
                supabase.rpc('rpc_analytics_statuses', { p_tenant_id: TENANT_ID }),
            ]);
            if (revRes.data) setRevData((revRes.data as RevDay[]).map(r => ({
                day: new Date(r.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                revenue: Number(r.revenue),
                booking_count: Number(r.booking_count),
            })));
            if (svcRes.data) setServices((svcRes.data as ServiceRow[]).map(s => ({ ...s, total_revenue: Number(s.total_revenue), booking_count: Number(s.booking_count) })));
            if (stRes.data) setStatuses((stRes.data as StatusRow[]).map(s => ({ ...s, count: Number(s.count) })));
        } catch (err) {
            console.error('Analytics fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [days]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const totalRevenue = revData.reduce((s, r) => s + r.revenue, 0);
    const totalBookings = revData.reduce((s, r) => s + r.booking_count, 0);
    const avgPerBooking = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    const exportCSV = () => {
        const header = 'Date,Revenue,Bookings\n';
        const rows = revData.map(r => `${r.day},${r.revenue},${r.booking_count}`).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `luxe_analytics_${days}d.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-luxe-gold animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-luxe-gold/10 rounded-2xl border border-luxe-gold/20">
                        <BarChart3 className="w-6 h-6 text-luxe-gold" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">Revenue Analytics</h3>
                        <p className="text-xs text-white/40 uppercase tracking-widest">Performance Insights</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        aria-label="Select time range"
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                        className="bg-white/5 border border-white/10 rounded-xl text-xs px-4 py-2.5 outline-none focus:border-luxe-gold/50"
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
                        EXPORT CSV
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SummaryCard label="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} icon={DollarSign} />
                <SummaryCard label="Total Bookings" value={String(totalBookings)} icon={Calendar} />
                <SummaryCard label="Avg / Booking" value={`$${avgPerBooking.toFixed(0)}`} icon={TrendingUp} />
            </div>

            {/* Revenue Chart */}
            <div className="glass-panel p-6">
                <h4 className="font-bold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-luxe-gold" />
                    Revenue Over Time
                </h4>
                <div className="h-[300px]">
                    {revData.length > 0 ? (
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

            {/* Bottom Row: Services + Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Services */}
                <div className="glass-panel p-6">
                    <h4 className="font-bold mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-luxe-gold" />
                        Top Services
                    </h4>
                    {services.length > 0 ? (
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={services} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" horizontal={false} />
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#ffffff40', fontSize: 11 }} tickFormatter={(v: number) => `$${v}`} />
                                    <YAxis type="category" dataKey="service_name" axisLine={false} tickLine={false} tick={{ fill: '#ffffff80', fontSize: 12 }} width={110} />
                                    <Tooltip
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

                {/* Booking Statuses */}
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
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                        />
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
            </div>
        </div>
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
