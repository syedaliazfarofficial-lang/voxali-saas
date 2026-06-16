/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  LayoutDashboard, 
  Calendar, 
  CreditCard, 
  Users, 
  Package, 
  Settings,
  Plus
} from 'lucide-react';
import { ScreenId } from '../types';

interface SidebarProps {
  activeScreen: ScreenId;
  onScreenChange: (screen: ScreenId) => void;
}

const navItems = [
  { id: 'dashboard' as ScreenId, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'calendar' as ScreenId, label: 'Calendar', icon: Calendar },
  { id: 'pos' as ScreenId, label: 'POS', icon: CreditCard },
  { id: 'team' as ScreenId, label: 'Team', icon: Users },
  { id: 'clients' as ScreenId, label: 'Clients', icon: Users },
  { id: 'inventory' as ScreenId, label: 'Inventory', icon: Package },
  { id: 'settings' as ScreenId, label: 'Settings', icon: Settings },
];

export default function Sidebar({ activeScreen, onScreenChange }: SidebarProps) {
  return (
    <aside className="hidden md:flex flex-col h-screen w-[260px] fixed left-0 top-0 bg-surface-container-low border-r border-outline-variant py-8 z-50">
      <div className="px-6 mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center">
          <span className="text-xl font-bold">L</span>
        </div>
        <div>
          <h1 className="font-semibold text-lg leading-tight">Luxe Salon</h1>
          <p className="text-[11px] text-on-surface-variant uppercase tracking-wider font-medium">Management Suite</p>
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onScreenChange(item.id)}
              className={`flex items-center gap-4 py-3 px-6 transition-all duration-200 text-left w-full
                ${isActive 
                  ? 'text-primary font-bold border-l-4 border-primary bg-surface-container-high' 
                  : 'text-on-surface-variant hover:bg-surface-container-high border-l-4 border-transparent'
                }`}
            >
              <Icon size={20} className={isActive ? 'text-primary' : 'text-on-surface-variant'} />
              <span className="text-body-lg">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="px-5 mt-auto">
        <button className="w-full bg-primary text-on-primary font-medium py-3 rounded-button hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
          <Plus size={18} />
          New Booking
        </button>
      </div>
    </aside>
  );
}
