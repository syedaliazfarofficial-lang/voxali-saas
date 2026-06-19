import React, { useState } from 'react';
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
    Moon,
    Sun,
    LogOut,
    Building2,
    UserCircle,
    Lock,
    Calculator,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTenant } from '../context/TenantContext';

const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard',    id: 'dashboard',  roles: ['super_admin', 'owner', 'manager'] },
    { icon: Calendar,        label: 'Calendar',      id: 'bookings',   roles: ['super_admin', 'owner', 'manager', 'staff'] },
    { icon: Calculator,      label: 'Point of Sale', id: 'pos',        roles: ['super_admin', 'owner', 'manager', 'receptionist'] },
    { icon: Users,           label: 'Clients',       id: 'clients',    roles: ['super_admin', 'owner', 'manager', 'receptionist'] },
    { icon: UsersRound,      label: 'Team',          id: 'stylists',   roles: ['super_admin', 'owner', 'manager'] },
    { icon: BarChart3,       label: 'Reports',       id: 'analytics',  roles: ['super_admin', 'owner'] },
    { icon: PhoneCall,       label: 'Call Logs',     id: 'calls',      roles: ['super_admin', 'owner', 'manager', 'receptionist'], minTier: 'starter' },
    { icon: Megaphone,       label: 'Marketing',     id: 'marketing',  roles: ['super_admin', 'owner'] },
    { icon: Star,            label: 'Reviews',       id: 'reviews',    roles: ['super_admin', 'owner', 'manager'] },
    { icon: Bot,             label: 'AI Assistant',  id: 'bella',      roles: ['super_admin', 'owner'], minTier: 'starter' },
    { icon: Settings,        label: 'Settings',      id: 'settings',   roles: ['super_admin', 'owner'] },
    { icon: UserCircle,      label: 'My Profile',    id: 'my_profile', roles: ['staff', 'manager', 'receptionist'] },
];

const superAdminItems = [
    { icon: LayoutDashboard, label: 'SaaS Overview', id: 'saas_dashboard' },
    { icon: Building2,       label: 'All Salons',    id: 'salons_list' },
];

interface SidebarProps {
    activeTab: string;
    setActiveTab: (id: string) => void;
    isDarkMode: boolean;
    toggleTheme: () => void;
    onLogout?: () => void;
}

// Sidebar is FIXED at 64px — never changes with zoom
export const Sidebar: React.FC<SidebarProps> = ({
    activeTab,
    setActiveTab,
    isDarkMode,
    toggleTheme,
    onLogout,
}) => {
    const { salonName, logoUrl, planTier } = useTenant();
    const { role } = useAuth();

    const filteredItems = navItems.filter(item =>
        !item.roles || (role && item.roles.includes(role))
    );
    const showSuperAdmin = role === 'super_admin';

    const tierWeight: Record<string, number> = {
        basic: 0, Essentials: 0,
        starter: 1, 'AI Starter': 1,
        growth: 2, 'AI Growth': 2,
        elite: 3, Enterprise: 3,
    };
    const currentWeight = tierWeight[planTier] || 0;

    const handleLogout = () => {
        if (onLogout) onLogout();
        else { localStorage.clear(); sessionStorage.clear(); window.location.reload(); }
    };

    // ── Color constants ──
    const SIDEBAR_BG   = '#1a1a2e';
    const ACTIVE_BG    = 'rgba(255,255,255,0.92)';
    const HOVER_BG     = 'rgba(255,255,255,0.07)';
    const ICON_COLOR   = 'rgba(255,255,255,0.5)';
    const ICON_ACTIVE  = '#000000';
    const DIVIDER      = 'rgba(255,255,255,0.08)';

    return (
        <div style={{
            // Fixed dimensions — never changes with zoom
            width: '64px',
            minWidth: '64px',
            maxWidth: '64px',
            height: '100%',
            background: SIDEBAR_BG,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            flexShrink: 0,
            overflowX: 'visible',
            position: 'relative',
            zIndex: 50,
        }}>

            {/* ── Logo avatar ── */}
            <div style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '18px 0 14px',
                borderBottom: `1px solid ${DIVIDER}`,
                flexShrink: 0,
            }}>
                <div title={salonName} style={{ position: 'relative' }}>
                    {logoUrl ? (
                        <img
                            src={logoUrl}
                            alt={salonName}
                            style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', display: 'block' }}
                        />
                    ) : (
                        <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: 'rgba(255,255,255,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: 800, fontSize: 16,
                            letterSpacing: '-0.5px',
                            backdropFilter: 'blur(4px)',
                        }}>
                            {salonName.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Navigation icons ── */}
            <nav style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'visible',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '8px 0',
                gap: 2,
                // hide scrollbar
                scrollbarWidth: 'none',
            }}>
                {showSuperAdmin && (
                    <>
                        {superAdminItems.map(item => (
                            <IconNavItem
                                key={item.id}
                                item={item}
                                active={activeTab === item.id}
                                onClick={() => setActiveTab(item.id)}
                                activeBg={ACTIVE_BG}
                                hoverBg={HOVER_BG}
                                iconColor={ICON_COLOR}
                                iconActive={ICON_ACTIVE}
                            />
                        ))}
                        <div style={{ width: 32, height: 1, background: DIVIDER, margin: '6px 0' }} />
                    </>
                )}

                {filteredItems.map(item => {
                    const isLocked = (item.minTier ? tierWeight[item.minTier] : 0) > currentWeight;
                    return (
                        <IconNavItem
                            key={item.id}
                            item={item}
                            active={activeTab === item.id}
                            onClick={() => {
                                if (!isLocked) setActiveTab(item.id);
                            }}
                            activeBg={ACTIVE_BG}
                            hoverBg={HOVER_BG}
                            iconColor={ICON_COLOR}
                            iconActive={ICON_ACTIVE}
                            isLocked={isLocked}
                        />
                    );
                })}
            </nav>

            {/* ── Bottom controls ── */}
            <div style={{
                width: '100%',
                borderTop: `1px solid ${DIVIDER}`,
                padding: '8px 0 14px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                flexShrink: 0,
            }}>
                {/* Theme toggle */}
                <button
                    onClick={toggleTheme}
                    title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
                    style={{
                        width: 40, height: 40, borderRadius: 10,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'transparent', border: 'none',
                        color: ICON_COLOR, cursor: 'pointer',
                        transition: 'background 0.15s, color 0.15s',
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = HOVER_BG; e.currentTarget.style.color = ICON_ACTIVE; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = ICON_COLOR; }}
                >
                    {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                {/* Logout */}
                <button
                    onClick={handleLogout}
                    title="Log out"
                    style={{
                        width: 40, height: 40, borderRadius: 10,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'transparent', border: 'none',
                        color: 'rgba(255,200,200,0.6)', cursor: 'pointer',
                        transition: 'background 0.15s, color 0.15s',
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#fca5a5'; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,200,200,0.6)'; }}
                >
                    <LogOut size={18} />
                </button>
            </div>
        </div>
    );
};

// ── Icon-only nav item with tooltip ─────────────────────────────────────────
interface IconNavItemProps {
    item: { icon: React.ElementType; label: string; id: string };
    active: boolean;
    onClick: () => void;
    activeBg: string;
    hoverBg: string;
    iconColor: string;
    iconActive: string;
    isLocked?: boolean;
}

const IconNavItem: React.FC<IconNavItemProps> = ({
    item, active, onClick, activeBg, hoverBg, iconColor, iconActive, isLocked
}) => {
    const Icon = item.icon;
    const [hovered, setHovered] = useState(false);

    return (
        <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
            <button
                onClick={onClick}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                title={item.label}
                style={{
                    width: 40, height: 40,
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: active ? activeBg : 'transparent',
                    border: 'none',
                    color: active ? iconActive : (isLocked ? 'rgba(255,255,255,0.2)' : iconColor),
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    transition: 'background 0.15s, color 0.15s, transform 0.1s',
                    opacity: isLocked ? 0.45 : 1,
                    flexShrink: 0,
                    position: 'relative',
                    transform: hovered && !isLocked ? 'scale(1.08)' : 'scale(1)',
                }}
                onMouseOver={e => {
                    if (!active && !isLocked) {
                        e.currentTarget.style.background = hoverBg;
                        e.currentTarget.style.color = iconActive;
                    }
                }}
                onMouseOut={e => {
                    if (!active) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = isLocked ? 'rgba(255,255,255,0.2)' : iconColor;
                    }
                }}
            >
                {/* Active left glow bar */}
                {active && (
                    <div style={{
                        position: 'absolute',
                        left: -12,
                        top: '15%', bottom: '15%',
                        width: 3,
                        borderRadius: 99,
                        background: '#ffffff',
                    }} />
                )}
                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                {isLocked && (
                    <div style={{
                        position: 'absolute', bottom: 4, right: 4,
                        width: 7, height: 7, borderRadius: '50%',
                        background: 'rgba(255,200,100,0.5)',
                    }} />
                )}
            </button>

            {/* Tooltip on hover */}
            {hovered && (
                <div style={{
                    position: 'absolute',
                    left: '100%',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    marginLeft: 10,
                    background: 'rgba(10,10,20,0.92)',
                    color: '#ffffff',
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '5px 10px',
                    borderRadius: 7,
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    zIndex: 9999,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(8px)',
                    letterSpacing: '0.01em',
                }}>
                    {item.label}
                    {isLocked && (
                        <span style={{ marginLeft: 6, fontSize: 9, opacity: 0.7, color: '#fbbf24' }}>🔒 Upgrade</span>
                    )}
                    {/* Arrow */}
                    <div style={{
                        position: 'absolute',
                        left: -5, top: '50%', transform: 'translateY(-50%)',
                        width: 0, height: 0,
                        borderTop: '5px solid transparent',
                        borderBottom: '5px solid transparent',
                        borderRight: '5px solid rgba(10,10,20,0.92)',
                    }} />
                </div>
            )}
        </div>
    );
};
