import { useState } from 'react';
import { Utensils, MessageSquare, LayoutDashboard, Settings, LogOut, ShoppingBag, TrendingUp } from 'lucide-react';
import { MenuManager } from './components/MenuManager';
import { OrdersManager } from './components/OrdersManager';
import { ChatLogsManager } from './components/ChatLogsManager';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'menu', label: 'Menu Items', icon: Utensils },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'chats', label: 'Chat Logs', icon: MessageSquare },
  { id: 'settings', label: 'Bot Settings', icon: Settings },
];

const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
  dashboard: { title: 'Dashboard', sub: 'Welcome back! Here is your restaurant overview.' },
  menu: { title: 'Menu Items', sub: 'Add and manage your food items and categories.' },
  orders: { title: 'Orders', sub: 'All orders captured by your AI bot.' },
  chats: { title: 'Chat Logs', sub: 'View all customer conversations.' },
  settings: { title: 'Bot Settings', sub: 'Configure your WhatsApp AI receptionist.' },
};

function DashboardHome() {
  return (
    <div className="space-y-6">
      <div className="grid-3">
        {[
          { label: 'Total Orders', value: '124', trend: '+12% this week', icon: '🛒' },
          { label: 'Active Chats', value: '48', trend: 'Live right now', icon: '💬' },
          { label: 'Menu Items', value: '32', trend: 'Across 5 categories', icon: '🍽️' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
            <p className="stat-label">{s.label}</p>
            <p className="stat-value">{s.value}</p>
            <p className="stat-trend">{s.trend}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="section-header">
          <div>
            <p className="section-title">WhatsApp Bot Status</p>
            <p className="section-sub">Your AI is online and ready to receive messages</p>
          </div>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: '#10B981', background: '#D1FAE5', padding: '6px 14px', borderRadius: 100 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            Bot is Active
          </span>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Connect your WhatsApp number from <strong>Bot Settings</strong> to start receiving customer messages automatically.
        </p>
      </div>
    </div>
  );
}

function Placeholder({ tab }: { tab: string }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><TrendingUp size={24} /></div>
      <h3 className="empty-title">Coming Soon</h3>
      <p className="empty-desc">The <strong>{tab}</strong> section is under development. Check back soon!</p>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const page = PAGE_TITLES[activeTab];

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">W</div>
          <span className="logo-text">WhatsApp AI</span>
          <span className="logo-badge">BETA</span>
        </div>

        <nav className="sidebar-nav">
          <p className="sidebar-label">Main Menu</p>
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)} className={`nav-item ${activeTab === id ? 'active' : ''}`}>
              <Icon size={17} />
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item" style={{ color: 'rgba(239,68,68,0.7)' }}>
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="main-area">
        <div className="topbar">
          <div>
            <p className="topbar-title">{page.title}</p>
            <p className="topbar-sub">{page.sub}</p>
          </div>
        </div>

        <div className="page-content">
          {activeTab === 'dashboard' && <DashboardHome />}
          {activeTab === 'menu' && <MenuManager />}
          {activeTab === 'orders' && <OrdersManager />}
          {activeTab === 'chats' && <ChatLogsManager />}
          {activeTab !== 'dashboard' && activeTab !== 'menu' && activeTab !== 'orders' && activeTab !== 'chats' && <Placeholder tab={page.title} />}
        </div>
      </main>
    </div>
  );
}
