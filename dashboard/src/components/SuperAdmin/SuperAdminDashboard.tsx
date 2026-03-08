import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Building2, Users, DollarSign, Bot, TrendingUp, Activity, PhoneCall, Calendar } from 'lucide-react';

interface Stats {
    totalSalons: number;
    totalUsers: number;
    totalRevenue: number;
    totalBookings: number;
    totalAICalls: number;
}

interface ActivityItem {
    action: string;
    salon: string;
    time: string;
    icon: React.ElementType;
}

export const SuperAdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<Stats>({
        totalSalons: 0,
        totalUsers: 0,
        totalRevenue: 0,
        totalBookings: 0,
        totalAICalls: 0,
    });
    const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            // Fetch all counts in parallel
            const [
                { count: salonCount },
                { count: userCount },
                { count: bookingCount },
                { count: callCount },
                { data: payments },
            ] = await Promise.all([
                supabase.from('tenants').select('*', { count: 'exact', head: true }).or('status.eq.active,status.is.null'),
                supabase.from('profiles').select('*, tenants!inner(status)', { count: 'exact', head: true }).neq('role', 'super_admin').or('status.eq.active,status.is.null', { referencedTable: 'tenants' }),
                supabase.from('bookings').select('*', { count: 'exact', head: true }),
                supabase.from('call_logs').select('*', { count: 'exact', head: true }),
                supabase.from('bookings').select('total_price').eq('status', 'completed'),
            ]);

            const totalRevenue = payments?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;

            setStats({
                totalSalons: salonCount || 0,
                totalUsers: userCount || 0,
                totalRevenue,
                totalBookings: bookingCount || 0,
                totalAICalls: callCount || 0,
            });

            // Fetch recent bookings for activity feed
            const { data: recentBookings } = await supabase
                .from('bookings')
                .select('client_name, created_at, status, tenants(name)')
                .order('created_at', { ascending: false })
                .limit(5);

            if (recentBookings && recentBookings.length > 0) {
                const activities = recentBookings.map((b) => ({
                    action: `Booking ${b.status === 'completed' ? 'completed' : 'created'} — ${b.client_name}`,
                    salon: (b.tenants as any)?.name || 'Unknown Salon',
                    time: formatTime(b.created_at),
                    icon: Calendar,
                }));
                setRecentActivity(activities);
            } else {
                setRecentActivity([]);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (dateStr: string) => {
        if (!dateStr) return '';
        const now = new Date();
        const then = new Date(dateStr);
        const diffMs = now.getTime() - then.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins} min ago`;
        const diffHrs = Math.floor(diffMins / 60);
        if (diffHrs < 24) return `${diffHrs} hr ago`;
        return `${Math.floor(diffHrs / 24)} days ago`;
    };

    const statCards = [
        {
            label: 'Active Salons',
            value: loading ? '—' : stats.totalSalons,
            icon: Building2,
            color: 'text-blue-400',
            bgColor: 'bg-blue-500/10',
            borderColor: 'border-blue-500/20',
        },
        {
            label: 'Total Revenue',
            value: loading ? '—' : `$${stats.totalRevenue.toLocaleString()}`,
            icon: DollarSign,
            color: 'text-emerald-400',
            bgColor: 'bg-emerald-500/10',
            borderColor: 'border-emerald-500/20',
        },
        {
            label: 'Total AI Calls',
            value: loading ? '—' : stats.totalAICalls,
            icon: PhoneCall,
            color: 'text-violet-400',
            bgColor: 'bg-violet-500/10',
            borderColor: 'border-violet-500/20',
        },
        {
            label: 'Active Users',
            value: loading ? '—' : stats.totalUsers,
            icon: Users,
            color: 'text-amber-400',
            bgColor: 'bg-amber-500/10',
            borderColor: 'border-amber-500/20',
        },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-sa-platinum tracking-tight">
                    Dashboard Overview
                </h1>
                <p className="text-sa-muted mt-1">Welcome back, Super Admin. Here's your system status.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                {statCards.map((card) => (
                    <div
                        key={card.label}
                        className={`p-6 rounded-2xl bg-sa-navy border ${card.borderColor} hover:border-sa-accent/30 transition-all duration-300 group`}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl ${card.bgColor}`}>
                                <card.icon className={`w-5 h-5 ${card.color}`} />
                            </div>
                        </div>
                        <div className="text-3xl font-black text-sa-platinum mb-1">{card.value}</div>
                        <div className="text-sa-muted text-sm">{card.label}</div>
                    </div>
                ))}
            </div>

            {/* Recent Activity */}
            <div className="bg-sa-navy rounded-2xl border border-sa-border overflow-hidden">
                <div className="px-6 py-4 border-b border-sa-border">
                    <h2 className="text-lg font-bold text-sa-platinum">Recent Activity</h2>
                    <p className="text-sa-muted text-xs mt-0.5">Latest bookings across all salons</p>
                </div>
                <div className="divide-y divide-sa-border">
                    {loading ? (
                        <div className="px-6 py-8 text-center text-sa-muted text-sm">Loading activity...</div>
                    ) : recentActivity.length === 0 ? (
                        <div className="px-6 py-8 text-center text-sa-muted text-sm">
                            <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            No activity yet. Bookings will appear here.
                        </div>
                    ) : (
                        recentActivity.map((item, i) => (
                            <div key={i} className="px-6 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                                <div className="p-2 rounded-lg bg-sa-slate/70">
                                    <item.icon className="w-4 h-4 text-sa-accent" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-sa-platinum font-medium">{item.action}</p>
                                    <p className="text-xs text-sa-muted">{item.salon}</p>
                                </div>
                                <span className="text-xs text-sa-muted/60 whitespace-nowrap">{item.time}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
