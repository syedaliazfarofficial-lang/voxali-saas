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

export const Sidebar: React.FC<SidebarProps> = ({
    activeTab,
    setActiveTab,
    isDarkMode,
    toggleTheme,
    onLogout,
}) => {
    const { salonName, logoUrl, planTier } = useTenant();
    const { role } = useAuth();
    const [isSidebarHovered, setIsSidebarHovered] = useState(false);
    const [themeHovered, setThemeHovered] = useState(false);
    const [logoutHovered, setLogoutHovered] = useState(false);

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
            // Root container spacer — maintains fixed 64px layout spacer
            width: '64px',
            minWidth: '64px',
            maxWidth: '64px',
            height: '100%',
            flexShrink: 0,
            position: 'relative',
            zIndex: 50,
        }}>
            {/* Actual panel that expands and floats over content */}
            <div
                onMouseEnter={() => setIsSidebarHovered(true)}
                onMouseLeave={() => setIsSidebarHovered(false)}
                style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: isSidebarHovered ? '220px' : '64px',
                    height: '100%',
                    background: SIDEBAR_BG,
                    borderRight: `1px solid ${DIVIDER}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    overflowX: 'hidden',
                    transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isSidebarHovered ? '8px 0 28px rgba(0, 0, 0, 0.45)' : 'none',
                    zIndex: 100,
                }}
            >
                {/* ── Logo avatar & Title ── */}
                <div style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    padding: '18px 0 14px 14px',
                    borderBottom: `1px solid ${DIVIDER}`,
                    flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div title={salonName} style={{ position: 'relative', flexShrink: 0 }}>
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
                        {/* Salon Name Text fading in */}
                        <span style={{
                            opacity: isSidebarHovered ? 1 : 0,
                            transition: 'opacity 0.15s ease-in-out',
                            fontWeight: 700,
                            fontSize: 14,
                            color: '#ffffff',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: 140,
                        }}>
                            {salonName}
                        </span>
                    </div>
                </div>

                {/* ── Navigation icons ── */}
                <nav style={{
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    padding: '8px 0',
                    gap: 4,
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
                                    isExpanded={isSidebarHovered}
                                />
                            ))}
                            <div style={{ width: 32, height: 1, background: DIVIDER, margin: '6px 0', alignSelf: 'center' }} />
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
                                isExpanded={isSidebarHovered}
                            />
                        );
                    })}
                </nav>

                {/* ── Bottom controls ── */}
                <div style={{
                    width: '100%',
                    borderTop: `1px solid ${DIVIDER}`,
                    padding: isSidebarHovered ? '10px 14px' : '10px 0',
                    display: 'flex',
                    flexDirection: isSidebarHovered ? 'row' : 'column',
                    alignItems: 'center',
                    justifyContent: isSidebarHovered ? 'space-between' : 'center',
                    gap: isSidebarHovered ? 8 : 10,
                    flexShrink: 0,
                }}>
                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        onMouseEnter={() => setLogoutHovered(true)}
                        onMouseLeave={() => setLogoutHovered(false)}
                        style={{
                            width: isSidebarHovered ? 'auto' : 40,
                            height: 40,
                            borderRadius: 10,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: isSidebarHovered ? 'flex-start' : 'center',
                            padding: isSidebarHovered ? '0 12px' : '0',
                            background: logoutHovered ? 'rgba(239,68,68,0.15)' : 'transparent',
                            border: 'none',
                            color: logoutHovered ? '#fca5a5' : 'rgba(255,200,200,0.6)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            flexGrow: isSidebarHovered ? 1 : 0,
                            transform: logoutHovered ? 'scale(1.02)' : 'scale(1)',
                        }}
                        title="Log Out"
                    >
                        <LogOut size={18} />
                        {isSidebarHovered && (
                            <span style={{
                                marginLeft: 10,
                                fontWeight: 600,
                                fontSize: 13,
                                color: '#fca5a5',
                                whiteSpace: 'nowrap',
                            }}>
                                Log Out
                            </span>
                        )}
                    </button>

                    {/* Theme toggle */}
                    <button
                        onClick={toggleTheme}
                        onMouseEnter={() => setThemeHovered(true)}
                        onMouseLeave={() => setThemeHovered(false)}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: themeHovered ? HOVER_BG : 'transparent',
                            border: 'none',
                            color: themeHovered ? '#ffffff' : ICON_COLOR,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            transform: themeHovered ? 'scale(1.05)' : 'scale(1)',
                            flexShrink: 0,
                        }}
                        title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
                    >
                        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── IconNavItem with title text ─────────────────────────────────────────
interface IconNavItemProps {
    item: { icon: React.ElementType; label: string; id: string };
    active: boolean;
    onClick: () => void;
    activeBg: string;
    hoverBg: string;
    iconColor: string;
    iconActive: string;
    isLocked?: boolean;
    isExpanded: boolean;
}

const IconNavItem: React.FC<IconNavItemProps> = ({
    item, active, onClick, activeBg, hoverBg, iconColor, iconActive, isLocked, isExpanded
}) => {
    const Icon = item.icon;
    const [hovered, setHovered] = useState(false);

    return (
        <div style={{
            position: 'relative',
            width: '100%',
            height: 40,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexShrink: 0,
        }}>
            {/* Active left glow bar */}
            {active && (
                <div style={{
                    position: 'absolute',
                    left: 0,
                    top: '15%', bottom: '15%',
                    width: 3,
                    borderRadius: 99,
                    background: '#ffffff',
                    zIndex: 10,
                }} />
            )}

            <button
                onClick={onClick}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                style={{
                    width: 'calc(100% - 24px)',
                    height: 40,
                    margin: '0 12px',
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    padding: '0 11px',
                    background: active ? activeBg : (hovered ? hoverBg : 'transparent'),
                    border: 'none',
                    color: active ? iconActive : (isLocked ? 'rgba(255,255,255,0.2)' : (hovered ? '#ffffff' : iconColor)),
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    transition: 'background 0.15s, color 0.15s, transform 0.1s',
                    opacity: isLocked ? 0.45 : 1,
                    flexShrink: 0,
                    position: 'relative',
                    overflow: 'hidden',
                    transform: hovered && !isLocked ? 'scale(1.02)' : 'scale(1)',
                }}
            >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} style={{ flexShrink: 0 }} />
                
                <span style={{
                    marginLeft: 12,
                    opacity: isExpanded ? 1 : 0,
                    transition: 'opacity 0.15s ease-in-out',
                    whiteSpace: 'nowrap',
                    fontWeight: 600,
                    fontSize: 13,
                    color: active ? iconActive : (isLocked ? 'rgba(255,255,255,0.4)' : '#ffffff'),
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                }}>
                    {item.label}
                    {isLocked && (
                        <span style={{ fontSize: 10, color: '#fbbf24', opacity: 0.8 }}>🔒</span>
                    )}
                </span>
            </button>
        </div>
    );
};
