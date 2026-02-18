import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Building2, Users, DollarSign, Bot, TrendingUp, Activity } from 'lucide-react';

export const SuperAdminDashboard: React.FC = () => {
    const [stats, setStats] = useState({
        totalSalons: 0,
        totalUsers: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const { count: salonCount } = await supabase
                .from('tenants')
                .select('*', { count: 'exact', head: true });

            const { count: userCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });

            setStats({
                totalSalons: salonCount || 0,
                totalUsers: userCount || 0,
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        {
            label: 'Active Salons',
            value: loading ? '—' : stats.totalSalons,
            icon: Building2,
            change: '+12%',
            color: 'text-blue-400',
            bgColor: 'bg-blue-500/10',
            borderColor: 'border-blue-500/20',
        },
        {
            label: 'Monthly Revenue',
            value: '$12,450',
            icon: DollarSign,
            change: '+8.2%',
            color: 'text-emerald-400',
            bgColor: 'bg-emerald-500/10',
            borderColor: 'border-emerald-500/20',
        },
        {
            label: 'Total AI Calls',
            value: '1,847',
            icon: Bot,
            change: '+24%',
            color: 'text-violet-400',
            bgColor: 'bg-violet-500/10',
            borderColor: 'border-violet-500/20',
        },
        {
            label: 'Active Users',
            value: loading ? '—' : stats.totalUsers,
            icon: Users,
            change: '+5%',
            color: 'text-amber-400',
            bgColor: 'bg-amber-500/10',
            borderColor: 'border-amber-500/20',
        },
    ];

    const recentActivity = [
        { salon: 'Luxe Beauty Spa', action: 'New booking created', time: '2 min ago', icon: Activity },
        { salon: 'Golden Cuts Studio', action: 'AI call completed', time: '15 min ago', icon: Bot },
        { salon: 'Elite Hair Lounge', action: 'New client registered', time: '1 hr ago', icon: Users },
        { salon: 'Luxe Beauty Spa', action: 'Payment received — $85', time: '2 hr ago', icon: DollarSign },
        { salon: 'Golden Cuts Studio', action: 'Staff member added', time: '3 hr ago', icon: Users },
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
                            <div className="flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                                <TrendingUp className="w-3 h-3" />
                                {card.change}
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
                    <p className="text-sa-muted text-xs mt-0.5">Latest actions across all salons</p>
                </div>
                <div className="divide-y divide-sa-border">
                    {recentActivity.map((item, i) => (
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
                    ))}
                </div>
            </div>
        </div>
    );
};
