import React, { useState, useCallback } from 'react';
import {
    LayoutDashboard,
    Building2,
    Bot,
    LogOut,
    ChevronRight,
    Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SuperAdminDashboard } from './SuperAdminDashboard';
import { TenantsPage } from './TenantsPage';
import { AIMonitorPage } from './AIMonitorPage';

const navItems = [
    { icon: LayoutDashboard, label: 'Overview', id: 'overview' },
    { icon: Building2, label: 'Tenants', id: 'tenants' },
    { icon: Bot, label: 'AI Monitor', id: 'ai_monitor' },
];

export const SuperAdminLayout: React.FC = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const { forceLogout } = useAuth();

    const handleLogout = useCallback(async () => {
        await forceLogout();
    }, [forceLogout]);

    const handleImpersonate = (tenantId: string, tenantName?: string) => {
        // Set both flags for impersonation
        localStorage.setItem('voxali_impersonate_tenant', tenantId);
        localStorage.setItem('admin_viewing_tenant', 'true');
        if (tenantName) {
            localStorage.setItem('voxali_impersonate_name', tenantName);
        }
        // Reload to pick up the new tenant context
        window.location.reload();
    };

    return (
        <div className="flex h-screen bg-sa-midnight text-sa-platinum overflow-hidden font-sans">
            {/* Sidebar */}
            <aside className="w-64 h-screen bg-sa-navy border-r border-sa-border flex flex-col">
                {/* Logo */}
                <div className="p-6 pb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sa-gradient flex items-center justify-center shadow-lg shadow-sa-accent/20">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black tracking-tight text-sa-platinum">VOXALI</h1>
                            <p className="text-[10px] uppercase tracking-[0.25em] text-sa-accent/70 font-semibold">Super Admin</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 space-y-1">
                    <div className="text-[10px] font-bold text-sa-muted/50 uppercase tracking-[0.2em] px-3 mb-3">
                        Management
                    </div>
                    {navItems.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                        ? 'bg-sa-accent/10 text-sa-accent border border-sa-accent/20'
                                        : 'text-sa-muted hover:text-sa-platinum hover:bg-white/[0.03] border border-transparent'
                                    }`}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? 'text-sa-accent' : 'text-sa-muted/60 group-hover:text-sa-platinum'}`} />
                                <span className="font-medium text-sm">{item.label}</span>
                                {isActive && (
                                    <ChevronRight className="ml-auto w-4 h-4 text-sa-accent/60" />
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Bottom */}
                <div className="p-4 space-y-3">
                    <div className="px-4 py-3 rounded-xl bg-sa-slate/50 border border-sa-border">
                        <p className="text-xs font-bold text-sa-platinum">Super Admin</p>
                        <p className="text-[10px] text-sa-muted mt-0.5">Full system access</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400/70 hover:text-red-400 hover:bg-red-400/5 transition-all"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium text-sm">Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-8 max-w-7xl mx-auto">
                    {activeTab === 'overview' && <SuperAdminDashboard />}
                    {activeTab === 'tenants' && <TenantsPage onImpersonate={handleImpersonate} />}
                    {activeTab === 'ai_monitor' && <AIMonitorPage />}
                </div>
            </main>
        </div>
    );
};
