import React from 'react';
import { Bot, Phone, Clock, TrendingUp } from 'lucide-react';

const mockData = [
    { salon: 'Luxe Beauty Spa', calls30d: 342, lastActive: '2 min ago', status: 'active', trend: '+18%' },
    { salon: 'Golden Cuts Studio', calls30d: 287, lastActive: '15 min ago', status: 'active', trend: '+12%' },
    { salon: 'Elite Hair Lounge', calls30d: 156, lastActive: '1 hr ago', status: 'active', trend: '+5%' },
    { salon: 'Bella Nails & Spa', calls30d: 98, lastActive: '3 hr ago', status: 'active', trend: '+22%' },
    { salon: 'The Style Bar', calls30d: 67, lastActive: '1 day ago', status: 'idle', trend: '-3%' },
];

const summaryCards = [
    { label: 'Total AI Calls (30d)', value: '1,847', icon: Phone, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Avg per Salon', value: '190', icon: Bot, color: 'text-violet-400', bg: 'bg-violet-500/10' },
    { label: 'Peak Hour', value: '2–4 PM', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Month-over-Month', value: '+14%', icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
];

export const AIMonitorPage: React.FC = () => {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-sa-platinum tracking-tight">AI Monitor</h1>
                <p className="text-sa-muted mt-1">Bella AI usage across all tenants</p>
            </div>

            {/* Summary Cards */}
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

            {/* Usage Table */}
            <div className="bg-sa-navy rounded-2xl border border-sa-border overflow-hidden">
                <div className="px-6 py-4 border-b border-sa-border">
                    <h2 className="text-lg font-bold text-sa-platinum">Usage by Salon</h2>
                    <p className="text-sa-muted text-xs mt-0.5">AI call volume in the last 30 days</p>
                </div>
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
                        {mockData.map((row, i) => (
                            <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-sa-slate flex items-center justify-center">
                                            <Bot className="w-4 h-4 text-sa-accent" />
                                        </div>
                                        <span className="font-semibold text-sm text-sa-platinum">{row.salon}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-sm font-bold text-sa-platinum">{row.calls30d.toLocaleString()}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-xs font-semibold ${row.trend.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
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
            </div>
        </div>
    );
};
