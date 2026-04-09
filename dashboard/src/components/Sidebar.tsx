import React from 'react';
import {
    LayoutDashboard,
    Calendar,
    Users,
    UsersRound,
    BarChart3,
    PhoneCall,
    Megaphone,
    Star,
    Bot,
    Settings,
    Package,
    Moon,
    Sun,
    LogOut,
    Building2,
    UserCircle,
    Lock,
    Calculator
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
    { icon: Calculator, label: 'Point of Sale', id: 'pos', roles: ['super_admin', 'owner', 'manager', 'receptionist'] },
    { icon: Calendar, label: 'Bookings', id: 'bookings', roles: ['super_admin', 'owner', 'manager', 'staff'] },
    { icon: Users, label: 'Clients', id: 'clients', roles: ['super_admin', 'owner', 'manager', 'receptionist'] },
    { icon: UsersRound, label: 'Stylists', id: 'stylists', roles: ['super_admin', 'owner', 'manager'] },
    { icon: BarChart3, label: 'Analytics', id: 'analytics', roles: ['super_admin', 'owner'] },
    { icon: PhoneCall, label: 'Call Logs', id: 'calls', roles: ['super_admin', 'owner', 'manager', 'receptionist'], minTier: 'starter' },
    // { icon: Package, label: 'Packages', id: 'packages', roles: ['super_admin', 'owner', 'manager', 'receptionist'] },
    { icon: Megaphone, label: 'Marketing', id: 'marketing', roles: ['super_admin', 'owner'] },
    { icon: Star, label: 'Reviews', id: 'reviews', roles: ['super_admin', 'owner', 'manager'] },
    { icon: Bot, label: 'AI Assistant', id: 'bella', roles: ['super_admin', 'owner'], minTier: 'starter' },
    { icon: Settings, label: 'Settings', id: 'settings', roles: ['super_admin', 'owner'] },
    { icon: UserCircle, label: 'My Profile', id: 'my_profile', roles: ['staff', 'manager', 'receptionist'] },
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
    const { salonName, salonTagline, logoUrl, planTier } = useTenant();
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

    const filteredSuperAdminItems = superAdminItems.filter(() =>
        role === 'super_admin'
    );

    return (
        <div className="w-64 h-screen bg-luxe-obsidian border-r border-white/5 flex flex-col p-6">
            <div className="flex items-center gap-3 px-2 mb-6">
                {logoUrl ? (
                    <img src={logoUrl} alt={salonName} className="w-10 h-10 flex-shrink-0 rounded-lg object-cover" />
                ) : (
                    <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg bg-yellow-500/20 text-yellow-500 font-bold text-lg">
                        {salonName.charAt(0)}
                    </div>
                )}
                <div className="flex flex-col justify-center overflow-hidden">
                    <h1 className="text-sm font-extrabold text-white uppercase tracking-wider truncate leading-none mb-1">{salonName.toUpperCase()}</h1>
                    <p className="text-[9px] text-yellow-500/70 font-bold uppercase tracking-[0.2em] truncate leading-none">{salonTagline}</p>
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
                {filteredItems.map((item) => {
                    // Check tier access
                    const tierWeight: Record<string, number> = { basic: 0, Essentials: 0, starter: 1, 'AI Starter': 1, growth: 2, 'AI Growth': 2, elite: 3, Enterprise: 3 };
                    const currentWeight = tierWeight[planTier] || 0;
                    const requiredWeight = item.minTier ? tierWeight[item.minTier] : 0;
                    const isLocked = currentWeight < requiredWeight;

                    return (
                        <button
                            key={item.id}
                            onClick={() => {
                                if (isLocked) {
                                    alert(`The ${item.label} feature requires the ${item.minTier?.toUpperCase()} plan. Please upgrade to access it.`);
                                } else {
                                    setActiveTab(item.id);
                                }
                            }}
                            className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative",
                                activeTab === item.id
                                    ? "bg-luxe-gold/10 text-luxe-gold"
                                    : "text-white/50 hover:text-white hover:bg-white/5",
                                isLocked && "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-white/50"
                            )}
                            title={isLocked ? `Requires ${item.minTier?.toUpperCase()} Plan` : ''}
                        >
                            <item.icon className={cn(
                                "w-5 h-5",
                                activeTab === item.id ? "text-luxe-gold" : "text-white/40 group-hover:text-white",
                                isLocked && "text-white/30 group-hover:text-white/30"
                            )} />
                            <span className="font-medium">{item.label}</span>

                            {/* Lock Badge */}
                            {isLocked && (
                                <div className="ml-auto flex items-center justify-center p-1 bg-white/10 rounded-full">
                                    <Lock className="w-3.5 h-3.5 text-luxe-gold/70" />
                                </div>
                            )}

                            {/* Active Dot */}
                            {activeTab === item.id && !isLocked && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-luxe-gold shadow-[0_0_8px_#D4AF37]" />
                            )}
                        </button>
                    );
                })}
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
