import React from 'react';
import {
    LayoutDashboard,
    Calendar,
    Calculator,
    Users,
    Menu,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface BottomNavProps {
    activeTab: string;
    setActiveTab: (id: string) => void;
    isDarkMode: boolean;
    setShowMobileMenu?: (show: boolean) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
    activeTab,
    setActiveTab,
    isDarkMode,
    setShowMobileMenu,
}) => {
    const { role } = useAuth();

    const mobileTabs = [
        { icon: LayoutDashboard, label: 'Home',     id: 'dashboard', roles: ['super_admin', 'owner', 'manager'] },
        { icon: Calendar,        label: 'Bookings', id: 'bookings',  roles: ['super_admin', 'owner', 'manager', 'staff', 'receptionist'] },
        { icon: Calculator,      label: 'POS',      id: 'pos',       roles: ['super_admin', 'owner', 'manager', 'receptionist'] },
        { icon: Users,           label: 'Clients',  id: 'clients',   roles: ['super_admin', 'owner', 'manager', 'receptionist'] },
    ];

    const filteredTabs = mobileTabs.filter(tab => !tab.roles || (role && tab.roles.includes(role)));

    // Always dark bottom nav — Fresha style
    const bg = '#1a1a2e';
    const navBorder = 'rgba(255,255,255,0.07)';

    return (
        <div
            className="md:hidden flex items-center justify-around"
            style={{
                position: 'fixed',
                bottom: 0, left: 0, right: 0,
                height: '50px',
                background: bg,
                borderTop: `1px solid ${navBorder}`,
                paddingBottom: 'env(safe-area-inset-bottom)',
                zIndex: 100,
            }}
        >
            {filteredTabs.map(tab => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;

                return (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            background: 'transparent',
                            border: 'none',
                            color: isActive ? '#6c63ff' : 'rgba(255,255,255,0.4)',
                            flex: 1,
                            height: '100%',
                            position: 'relative',
                            cursor: 'pointer',
                        }}
                    >
                        {isActive && (
                            <div style={{
                                position: 'absolute',
                                top: 6,
                                width: 4, height: 4,
                                borderRadius: '50%',
                                background: '#6c63ff',
                                boxShadow: '0 0 6px rgba(108,99,255,0.6)',
                            }} />
                        )}
                        <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                        <span style={{ fontSize: '9px', fontWeight: isActive ? 700 : 400 }}>
                            {tab.label}
                        </span>
                    </button>
                );
            })}

            {setShowMobileMenu && (
                <button
                    onClick={() => setShowMobileMenu(true)}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255,255,255,0.4)',
                        flex: 1,
                        height: '100%',
                        cursor: 'pointer',
                    }}
                >
                    <Menu size={16} strokeWidth={2} />
                    <span style={{ fontSize: '9px', fontWeight: 400 }}>More</span>
                </button>
            )}
        </div>
    );
};
