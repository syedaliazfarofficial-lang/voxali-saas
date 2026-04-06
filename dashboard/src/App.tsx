import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from './components/Sidebar'
import { DashboardHome } from './components/DashboardHome'
import { BookingsCalendar } from './components/BookingsCalendar'
import { ClientCRM } from './components/ClientCRM'
import { StaffBoard } from './components/StaffBoard'
import { CallLogs } from './components/CallLogs'
import { Analytics } from './components/Analytics'
import { Marketing } from './components/Marketing'
import { Reviews } from './components/Reviews'
import { BellaAI } from './components/BellaAI'
import { Settings } from './components/Settings'
import { MyProfile } from './components/MyProfile'
import { LoginPage } from './components/LoginPage'
import { ClientFeedback } from './components/ClientFeedback'
import { PublicFeedback } from './components/PublicFeedback'
import { POSSystem } from './components/POSSystem'
import { PackagesModule } from './components/PackagesModule'
import { TenantProvider, useTenant } from './context/TenantContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider, showToast } from './components/ui/ToastNotification'
import { SuperAdminLayout } from './components/SuperAdmin/SuperAdminLayout'
import { SessionTimeout } from './components/SessionTimeout'
import { ArrowLeft, AlertTriangle, LogOut, Loader2, Plus, Clock } from 'lucide-react'

// ─── Floating "Back to Admin" bar for impersonation ───
function ImpersonationBar() {
  const isImpersonating = localStorage.getItem('admin_viewing_tenant') === 'true'

  if (!isImpersonating) return null

  const handleExit = () => {
    localStorage.removeItem('voxali_impersonate_tenant')
    localStorage.removeItem('admin_viewing_tenant')
    localStorage.removeItem('voxali_impersonate_name')
    // Trigger re-render instead of full page reload
    window.dispatchEvent(new CustomEvent('voxali:impersonation-changed'))
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-sa-accent text-white px-4 py-2 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <AlertTriangle className="w-4 h-4" />
        You are viewing a tenant's dashboard as Super Admin
      </div>
      <button
        onClick={handleExit}
        className="flex items-center gap-2 px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold transition-all"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Admin Panel
      </button>
    </div>
  )
}

// ─── Error/Timeout screen ───
function AuthErrorScreen() {
  const { forceLogout } = useAuth()

  const handleClear = async () => {
    // Nuclear clear: remove ALL supabase keys from localStorage
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('voxali'))) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k))
    await forceLogout()
    // forceLogout already resets all state — no reload needed
  }

  return (
    <div className="flex h-screen bg-sa-midnight items-center justify-center">
      <div className="text-center space-y-6 max-w-md px-8">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-sa-platinum mb-2">Connection Failed</h2>
          <p className="text-sa-muted text-sm">
            Could not load your profile. This usually happens due to stale session data or a network issue.
          </p>
        </div>
        <button
          onClick={handleClear}
          className="inline-flex items-center gap-2 px-6 py-3 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl font-semibold hover:bg-red-500/30 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Clear Session & Retry
        </button>
      </div>
    </div>
  )
}

function DigitalClock() {
  const { timezone } = useTenant()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="h-9 px-3 flex items-center gap-2 bg-zinc-800/50 border border-zinc-700/50 rounded-md">
      <Clock className="w-3.5 h-3.5 text-zinc-400" />
      <span className="text-xs font-medium text-zinc-300 font-mono">
        {time.toLocaleTimeString('en-US', { timeZone: timezone || 'America/New_York', hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  )
}

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [, setImpVersion] = useState(0)

  // Listen for impersonation changes — re-render without page reload
  useEffect(() => {
    const handler = () => setImpVersion(v => v + 1)
    window.addEventListener('voxali:impersonation-changed', handler)
    return () => window.removeEventListener('voxali:impersonation-changed', handler)
  }, [])
  const [isDarkMode, setIsDarkMode] = useState(true)
  const { salonName, ownerName, loading: tenantLoading } = useTenant()
  const { user, role, profile, isStaff, staffRecord, loading: authLoading, timedOut, forceLogout } = useAuth()

  // ─── RBAC: Allowed tabs per role ───
  const ALLOWED_TABS: Record<string, string[]> = {
    super_admin: ['dashboard', 'pos', 'bookings', 'packages', 'clients', 'stylists', 'analytics', 'calls', 'marketing', 'reviews', 'bella', 'settings'],
    owner: ['dashboard', 'pos', 'bookings', 'packages', 'clients', 'stylists', 'analytics', 'calls', 'marketing', 'reviews', 'bella', 'settings'],
    manager: ['dashboard', 'pos', 'bookings', 'packages', 'clients', 'stylists', 'calls', 'reviews', 'my_profile'],
    staff: ['bookings', 'my_profile'],
    receptionist: ['pos', 'bookings', 'packages', 'clients', 'calls', 'my_profile'],
  }

  const DEFAULT_TAB: Record<string, string> = {
    super_admin: 'dashboard',
    owner: 'dashboard',
    manager: 'dashboard',
    staff: 'bookings',
    receptionist: 'bookings',
  }

  // ─── Enforce tab restrictions when role resolves ───
  useEffect(() => {
    if (!role) return
    const allowed = ALLOWED_TABS[role] || ['bookings']
    if (!allowed.includes(activeTab)) {
      setActiveTab(DEFAULT_TAB[role] || 'bookings')
    }
  }, [role]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Role-aware tab setter (prevents navigating to restricted tabs) ───
  const safeSetActiveTab = (tab: string) => {
    if (!role) return
    const allowed = ALLOWED_TABS[role] || ['bookings']
    if (allowed.includes(tab)) {
      setActiveTab(tab)
    }
  }

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  // ─── Handle Payment Redirects (Stripe) ───
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('payment_success') === 'true') {
      showToast('Payment successful! Your booking is confirmed.', 'success')
      setActiveTab('bookings')
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (params.get('payment_cancelled') === 'true') {
      showToast('Payment was cancelled.', 'info')
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  // ─── Handle Feature Lock Upgrade Requests ───
  useEffect(() => {
    const handleUpgradeRequest = () => {
      safeSetActiveTab('settings')
    }
    window.addEventListener('voxali:request-upgrade', handleUpgradeRequest)
    return () => window.removeEventListener('voxali:request-upgrade', handleUpgradeRequest)
  }, [role]) // safeSetActiveTab dependency since it uses role

  const handleLogout = useCallback(async () => {
    // Nuclear clear all supabase localStorage
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('voxali'))) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k))
    await forceLogout()
  }, [forceLogout])

  // ─── Auth or Tenant still loading ───
  // Wait for BOTH to complete before rendering dashboard.
  // This prevents the "My Salon" / "kinza" blink on page refresh.
  if (authLoading || tenantLoading) {
    return (
      <div className="flex h-screen bg-luxe-obsidian items-center justify-center flex-col gap-4">
        <Loader2 className="w-8 h-8 text-luxe-gold animate-spin" />
        <p className="text-white/40 text-sm">{authLoading ? 'Loading your profile...' : 'Loading salon...'}</p>
      </div>
    )
  }

  // ─── Timed out or errored ───
  if (timedOut) {
    return <AuthErrorScreen />
  }

  // ─── Not logged in — show login ───
  if (!user) {
    return <LoginPage onLogin={() => {
      // Auth state change will automatically detect the new session
      // and update user/profile/role — no reload needed!
    }} />
  }

  // ─── No role found (profile error) → show error ───
  if (!role) {
    return <AuthErrorScreen />
  }

  // ─── Super Admin gets separate layout ───
  // But NOT if they're impersonating a tenant
  const isImpersonating = localStorage.getItem('admin_viewing_tenant') === 'true'

  if (role === 'super_admin' && !isImpersonating) {
    return <SuperAdminLayout />
  }

  // ─── Salon Dashboard (normal users OR impersonating super admin) ───
  const tabTitles: Record<string, string> = {
    dashboard: 'Dashboard',
    pos: 'Point of Sale',
    bookings: 'Bookings',
    packages: 'Packages',
    clients: 'Clients',
    stylists: 'Stylists',
    analytics: 'Analytics',
    calls: 'Call Logs',
    marketing: 'Marketing',
    reviews: 'Review Management',
    bella: 'AI Assistant',
    settings: 'Settings',
    my_profile: 'My Profile',
  }

  return (
    <>
      {/* Impersonation bar at top */}
      <ImpersonationBar />

      <div className={`flex h-screen bg-luxe-obsidian text-luxe-white overflow-hidden ${isImpersonating ? 'pt-10' : ''}`}>
        <Sidebar
          activeTab={activeTab}
          setActiveTab={safeSetActiveTab}
          isDarkMode={isDarkMode}
          toggleTheme={() => setIsDarkMode(!isDarkMode)}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-y-auto custom-scrollbar relative">
          <div className="px-6 py-5 max-w-7xl mx-auto">
            {/* Compact Header */}
            <header className="flex justify-between items-center mb-5">
              <div>
                <h2 className="text-2xl font-bold gold-text">{tabTitles[activeTab] ?? activeTab}</h2>
                <p className="text-white/40 text-xs mt-0.5">Welcome back to {salonName}</p>
              </div>

              <div className="flex items-center gap-3 h-full">
                {/* + New Booking */}
                {!isStaff && (
                  <button
                    onClick={() => safeSetActiveTab('bookings')}
                    className="h-9 px-4 flex items-center gap-1.5 bg-yellow-500 text-black text-sm font-bold rounded-md hover:bg-yellow-400 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    New Booking
                  </button>
                )}

                {/* Clock */}
                <DigitalClock />

                {/* AI status pill - generic */}
                {!isStaff && (
                  <div className="h-9 px-3 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-emerald-400 tracking-wide">AI Receptionist: Active</span>
                  </div>
                )}

                {/* User avatar + name */}
                <div className="h-9 pl-1 pr-3 flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-full hover:bg-zinc-700 cursor-pointer transition-colors">
                  <div className="w-7 h-7 rounded-full bg-yellow-500 text-black flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {(isStaff ? (staffRecord?.full_name as string || 'S') : ownerName).charAt(0)}
                  </div>
                  <span className="text-xs font-medium text-white truncate max-w-[100px]">
                    {isStaff
                      ? (staffRecord?.full_name as string || 'Stylist').split(' ')[0]
                      : ownerName.split(' ')[0] || 'Admin'}
                  </span>
                </div>
              </div>
            </header>

            {/* Dynamic Content Area */}
            <div className="space-y-6 flex-1 flex flex-col h-full">
              {activeTab === 'dashboard' && <DashboardHome setActiveTab={safeSetActiveTab} />}
              {activeTab === 'pos' && <POSSystem />}
              {activeTab === 'bookings' && <BookingsCalendar />}
              {activeTab === 'packages' && <PackagesModule />}
              {activeTab === 'clients' && <ClientCRM />}
              {activeTab === 'stylists' && <StaffBoard />}
              {activeTab === 'analytics' && <Analytics />}
              {activeTab === 'calls' && <CallLogs />}
              {activeTab === 'marketing' && <Marketing />}
              {activeTab === 'reviews' && <Reviews />}
              {activeTab === 'bella' && <BellaAI />}
              {activeTab === 'settings' && <Settings />}
              {activeTab === 'my_profile' && <MyProfile />}
            </div>
          </div>
        </main>
      </div>
    </>
  )
}

function App() {
  const params = new URLSearchParams(window.location.search);
  const feedbackId = params.get('feedback');
  const reviewTenantId = params.get('salon_review');

  if (feedbackId) {
    return <ClientFeedback bookingId={feedbackId} />;
  }

  if (reviewTenantId) {
    return <PublicFeedback tenantId={reviewTenantId} />;
  }

  return (
    <AuthProvider>
      <TenantProvider>
        <ToastProvider>
          <SessionTimeout />
          <AppContent />
        </ToastProvider>
      </TenantProvider>
    </AuthProvider>
  )
}

export default App
