import React from 'react';
import {
    LayoutDashboard,
    Calendar,
    Users,
    UsersRound,
    BarChart3,
    PhoneCall,
    Megaphone,
    Bot,
    Settings,
    Moon,
    Sun,
    LogOut,
    Building2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTenant } from '../context/TenantContext';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard', roles: ['super_admin', 'owner', 'manager'] },
    { icon: Calendar, label: 'Bookings', id: 'bookings', roles: ['super_admin', 'owner', 'manager', 'staff'] },
    { icon: Users, label: 'Clients', id: 'clients', roles: ['super_admin', 'owner', 'manager', 'receptionist'] },
    { icon: UsersRound, label: 'Stylists', id: 'stylists', roles: ['super_admin', 'owner', 'manager'] },
    { icon: BarChart3, label: 'Analytics', id: 'analytics', roles: ['super_admin', 'owner', 'manager'] },
    { icon: PhoneCall, label: 'Call Logs', id: 'calls', roles: ['super_admin', 'owner', 'manager', 'receptionist'] },
    { icon: Megaphone, label: 'Marketing', id: 'marketing', roles: ['super_admin', 'owner', 'manager'] },
    { icon: Bot, label: 'Bella AI', id: 'bella', roles: ['super_admin', 'owner', 'manager'] },
    { icon: Settings, label: 'Settings', id: 'settings', roles: ['super_admin', 'owner'] },
];

const superAdminItems = [
    { icon: LayoutDashboard, label: 'SaaS Overview', id: 'saas_dashboard', roles: ['super_admin'] },
    { icon: Building2, label: 'All Salons', id: 'salons_list', roles: ['super_admin'] },
];

interface SidebarProps {
    activeTab: string;
    setActiveTab: (id: string) => void;
    isDarkMode: boolean;
    toggleTheme: () => void;
    onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    activeTab,
    setActiveTab,
    isDarkMode,
    toggleTheme,
    onLogout
}) => {
    const { salonName, salonTagline, logoUrl } = useTenant();
    const { role } = useAuth(); // Use role from AuthContext

    const handleLogout = () => {
        if (onLogout) {
            onLogout();
        } else {
            localStorage.clear();
            sessionStorage.clear();
            window.location.reload();
        }
    };

    // Filter items based on role
    const filteredItems = navItems.filter(item =>
        !item.roles || (role && item.roles.includes(role))
    );

    const filteredSuperAdminItems = superAdminItems.filter(item =>
        role === 'super_admin'
    );

    return (
        <div className="w-64 h-screen bg-luxe-obsidian border-r border-white/5 flex flex-col p-6">
            <div className="mb-10 flex items-center gap-3">
                {logoUrl ? (
                    <img src={logoUrl} alt={salonName} className="w-8 h-8 rounded-lg object-cover" />
                ) : (
                    <div className="w-8 h-8 bg-gold-gradient rounded-lg flex items-center justify-center">
                        <span className="text-luxe-obsidian font-bold text-xl">{salonName.charAt(0)}</span>
                    </div>
                )}
                <div>
                    <h1 className="text-luxe-white font-bold tracking-tight text-lg leading-none">{salonName.toUpperCase()}</h1>
                    <p className="text-luxe-gold/60 text-[10px] uppercase tracking-[0.2em] mt-1">{salonTagline}</p>
                </div>
            </div>

            <nav className="flex-1 space-y-1">
                {/* Super Admin Section */}
                {filteredSuperAdminItems.length > 0 && (
                    <>
                        <div className="text-xs font-bold text-white/40 uppercase tracking-wider px-4 mb-2 mt-2">
                            Super Admin
                        </div>
                        {filteredSuperAdminItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                                    activeTab === item.id
                                        ? "bg-luxe-gold/10 text-luxe-gold"
                                        : "text-white/50 hover:text-white hover:bg-white/5"
                                )}
                            >
                                <item.icon className={cn(
                                    "w-5 h-5",
                                    activeTab === item.id ? "text-luxe-gold" : "text-white/40 group-hover:text-white"
                                )} />
                                <span className="font-medium">{item.label}</span>
                                {activeTab === item.id && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-luxe-gold shadow-[0_0_8px_#D4AF37]" />
                                )}
                            </button>
                        ))}
                        <div className="my-4 border-t border-white/5" />
                        <div className="text-xs font-bold text-white/40 uppercase tracking-wider px-4 mb-2">
                            Salon Management
                        </div>
                    </>
                )}

                {/* Standard Nav Items */}
                {filteredItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                            "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                            activeTab === item.id
                                ? "bg-luxe-gold/10 text-luxe-gold"
                                : "text-white/50 hover:text-white hover:bg-white/5"
                        )}
                    >
                        <item.icon className={cn(
                            "w-5 h-5",
                            activeTab === item.id ? "text-luxe-gold" : "text-white/40 group-hover:text-white"
                        )} />
                        <span className="font-medium">{item.label}</span>
                        {activeTab === item.id && (
                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-luxe-gold shadow-[0_0_8px_#D4AF37]" />
                        )}
                    </button>
                ))}
            </nav>

            <div className="mt-auto space-y-4">
                <button
                    onClick={toggleTheme}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 text-white/70 hover:bg-white/5 transition-all"
                >
                    {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    <span className="text-sm font-medium">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                </button>

                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400/70 hover:text-red-400 hover:bg-red-400/5 transition-all"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Logout</span>
                </button>
            </div>
        </div>
    );
};
