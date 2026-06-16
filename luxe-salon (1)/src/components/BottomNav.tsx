/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  LayoutDashboard, 
  Calendar, 
  CreditCard, 
  Users, 
  Settings
} from 'lucide-react';
import { ScreenId } from '../types';

interface BottomNavProps {
  activeScreen: ScreenId;
  onScreenChange: (screen: ScreenId) => void;
}

const navItems = [
  { id: 'dashboard' as ScreenId, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'calendar' as ScreenId, label: 'Calendar', icon: Calendar },
  { id: 'pos' as ScreenId, label: 'POS', icon: CreditCard },
  { id: 'team' as ScreenId, label: 'Team', icon: Users },
  { id: 'settings' as ScreenId, label: 'Settings', icon: Settings },
];

export default function BottomNav({ activeScreen, onScreenChange }: BottomNavProps) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface-container-lowest border-t border-outline-variant flex justify-around items-center px-4 z-50">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeScreen === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onScreenChange(item.id)}
            className={`flex flex-col items-center justify-center gap-1 transition-all
              ${isActive ? 'bg-surface-container-high rounded-xl p-1' : 'text-on-surface-variant'}
            `}
          >
            <Icon size={20} className={isActive ? 'text-primary' : 'text-on-surface-variant'} />
            <span className={`text-[10px] font-medium ${isActive ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
