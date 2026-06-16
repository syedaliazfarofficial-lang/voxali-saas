/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import { ScreenId } from './types';
import Dashboard from './screens/Dashboard';
import POS from './screens/POS';
import CalendarScreen from './screens/Calendar';
import Team from './screens/Team';

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>('dashboard');

  const renderScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return <Dashboard />;
      case 'pos':
        return <POS />;
      case 'calendar':
        return <CalendarScreen />;
      case 'team':
      case 'settings':
        return <Team />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeScreen={activeScreen} onScreenChange={setActiveScreen} />
      
      <div className="flex-1 flex flex-col md:ml-[260px]">
        <main className="flex-1 pb-24 md:pb-8">
          {renderScreen()}
        </main>
      </div>

      <BottomNav activeScreen={activeScreen} onScreenChange={setActiveScreen} />
    </div>
  );
}
