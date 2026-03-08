import React, { useState, useEffect } from 'react';
import { Bot, Phone, Clock, TrendingUp, Loader2 } from 'lucide-react';
import { supabaseAdmin } from '../../lib/supabase';

interface SalonUsage {
    tenant_id: string;
    name: string;
    calls30d: number;
    lastActive: string;
    status: 'active' | 'idle';
    trend: string;
}

export const AIMonitorPage: React.FC = () => {
    const [salons, setSalons] = useState<SalonUsage[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalCalls, setTotalCalls] = useState(0);

    useEffect(() => {
        fetchAIData();
    }, []);

    const fetchAIData = async () => {
        setLoading(true);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        // Fetch only active tenants (not deleted/suspended)
        const { data: tenants } = await supabaseAdmin
            .from('tenants')
            .select('id, name')
            .or('status.eq.active,status.is.null');
        if (!tenants) { setLoading(false); return; }

        // Fetch call_logs for last 30 days
        const { data: recentCalls } = await supabaseAdmin
            .from('call_logs')
            .select('tenant_id, created_at')
            .gte('created_at', thirtyDaysAgo.toISOString());

        // Fetch call_logs for previous 30 days (for trend)
        const { data: prevCalls } = await supabaseAdmin
            .from('call_logs')
            .select('tenant_id, created_at')
            .gte('created_at', sixtyDaysAgo.toISOString())
            .lt('created_at', thirtyDaysAgo.toISOString());

        const callsByTenant: Record<string, { count: number; lastCall: string }> = {};
        const prevByTenant: Record<string, number> = {};

        (recentCalls || []).forEach((c: any) => {
            if (!callsByTenant[c.tenant_id]) {
                callsByTenant[c.tenant_id] = { count: 0, lastCall: c.created_at };
            }
            callsByTenant[c.tenant_id].count++;
            if (c.created_at > callsByTenant[c.tenant_id].lastCall) {
                callsByTenant[c.tenant_id].lastCall = c.created_at;
            }
        });

        (prevCalls || []).forEach((c: any) => {
            prevByTenant[c.tenant_id] = (prevByTenant[c.tenant_id] || 0) + 1;
        });

        let total = 0;
        const salonData: SalonUsage[] = tenants.map(t => {
            const stats = callsByTenant[t.id] || { count: 0, lastCall: '' };
            const prevCount = prevByTenant[t.id] || 0;
            total += stats.count;

            // Calculate trend
            let trend = '0%';
            if (prevCount > 0) {
                const pct = Math.round(((stats.count - prevCount) / prevCount) * 100);
                trend = (pct >= 0 ? '+' : '') + pct + '%';
            } else if (stats.count > 0) {
                trend = '+100%';
            }

            // Calculate last active
            let lastActive = 'Never';
            if (stats.lastCall) {
                const diff = Date.now() - new Date(stats.lastCall).getTime();
                const mins = Math.floor(diff / 60000);
                if (mins < 1) lastActive = 'Just now';
                else if (mins < 60) lastActive = `${mins} min ago`;
                else if (mins < 1440) lastActive = `${Math.floor(mins / 60)} hr ago`;
                else lastActive = `${Math.floor(mins / 1440)} day ago`;
            }

            return {
                tenant_id: t.id,
                name: t.name,
                calls30d: stats.count,
                lastActive,
                status: stats.lastCall && (Date.now() - new Date(stats.lastCall).getTime()) < 86400000 ? 'active' : 'idle',
                trend,
            };
        });

        // Sort by calls descending
        salonData.sort((a, b) => b.calls30d - a.calls30d);
        setSalons(salonData);
        setTotalCalls(total);
        setLoading(false);
    };

    const avgPerSalon = salons.length > 0 ? Math.round(totalCalls / salons.length) : 0;
    const activeSalons = salons.filter(s => s.status === 'active').length;

    const summaryCards = [
        { label: 'Total AI Calls (30d)', value: totalCalls.toLocaleString(), icon: Phone, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { label: 'Avg per Salon', value: avgPerSalon.toLocaleString(), icon: Bot, color: 'text-violet-400', bg: 'bg-violet-500/10' },
        { label: 'Active Salons', value: `${activeSalons}/${salons.length}`, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        { label: 'Total Salons', value: salons.length.toString(), icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 gap-3 text-sa-muted">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading AI data...</span>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-black text-sa-platinum tracking-tight">AI Monitor</h1>
                <p className="text-sa-muted mt-1">Bella AI usage across all tenants</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                {summaryCards.map((card) => (
                    <div key={card.label} className="p-5 rounded-2xl bg-sa-navy border border-sa-border">
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`p-2.5 rounded-xl ${card.bg}`}>
                                <card.icon className={`w-4 h-4 ${card.color}`} />
                            </div>
                            <span className="text-xs text-sa-muted font-medium">{card.label}</span>
                        </div>
                        <div className="text-2xl font-black text-sa-platinum">{card.value}</div>
                    </div>
                ))}
            </div>

            <div className="bg-sa-navy rounded-2xl border border-sa-border overflow-hidden">
                <div className="px-6 py-4 border-b border-sa-border">
                    <h2 className="text-lg font-bold text-sa-platinum">Usage by Salon</h2>
                    <p className="text-sa-muted text-xs mt-0.5">AI call volume in the last 30 days</p>
                </div>

                {salons.length === 0 ? (
                    <div className="px-6 py-12 text-center text-sa-muted">
                        <Bot className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No AI call data yet</p>
                        <p className="text-xs mt-1">Call logs will appear here once Bella starts handling calls</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-sa-border">
                                <th className="text-left px-6 py-3 text-[10px] font-bold text-sa-muted uppercase tracking-[0.15em]">Salon</th>
                                <th className="text-left px-6 py-3 text-[10px] font-bold text-sa-muted uppercase tracking-[0.15em]">AI Calls (30d)</th>
                                <th className="text-left px-6 py-3 text-[10px] font-bold text-sa-muted uppercase tracking-[0.15em]">Trend</th>
                                <th className="text-left px-6 py-3 text-[10px] font-bold text-sa-muted uppercase tracking-[0.15em]">Last Active</th>
                                <th className="text-left px-6 py-3 text-[10px] font-bold text-sa-muted uppercase tracking-[0.15em]">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-sa-border">
                            {salons.map((row) => (
                                <tr key={row.tenant_id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-sa-slate flex items-center justify-center">
                                                <Bot className="w-4 h-4 text-sa-accent" />
                                            </div>
                                            <span className="font-semibold text-sm text-sa-platinum">{row.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm font-bold text-sa-platinum">{row.calls30d.toLocaleString()}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-xs font-semibold ${row.trend.startsWith('+') ? 'text-emerald-400' : row.trend.startsWith('-') ? 'text-red-400' : 'text-sa-muted'}`}>
                                            {row.trend}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-sa-muted">{row.lastActive}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${row.status === 'active'
                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${row.status === 'active' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                            {row.status === 'active' ? 'Active' : 'Idle'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
