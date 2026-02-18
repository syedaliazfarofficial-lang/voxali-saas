import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from './components/Sidebar'
import { DashboardHome } from './components/DashboardHome'
import { BookingsCalendar } from './components/BookingsCalendar'
import { ClientCRM } from './components/ClientCRM'
import { StaffBoard } from './components/StaffBoard'
import { CallLogs } from './components/CallLogs'
import { Analytics } from './components/Analytics'
import { Marketing } from './components/Marketing'
import { BellaAI } from './components/BellaAI'
import { Settings } from './components/Settings'
import { LoginPage } from './components/LoginPage'
import { TenantProvider, useTenant } from './context/TenantContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './components/ui/ToastNotification'
import { SuperAdminLayout } from './components/SuperAdmin/SuperAdminLayout'
import { ArrowLeft, AlertTriangle, LogOut, Loader2 } from 'lucide-react'

// ─── Floating "Back to Admin" bar for impersonation ───
function ImpersonationBar() {
  const isImpersonating = localStorage.getItem('admin_viewing_tenant') === 'true'

  if (!isImpersonating) return null

  const handleExit = () => {
    localStorage.removeItem('voxali_impersonate_tenant')
    localStorage.removeItem('admin_viewing_tenant')
    localStorage.removeItem('voxali_impersonate_name')
    window.location.reload()
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
    window.location.reload()
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

function AppContent() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isDarkMode, setIsDarkMode] = useState(true)
  const { salonName, ownerName } = useTenant()
  const { user, role, loading: authLoading, timedOut, forceLogout } = useAuth()

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

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

  // ─── Auth is still loading ───
  if (authLoading) {
    return (
      <div className="flex h-screen bg-luxe-obsidian items-center justify-center flex-col gap-4">
        <Loader2 className="w-8 h-8 text-luxe-gold animate-spin" />
        <p className="text-white/40 text-sm">Loading your profile...</p>
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
      // After login, the auth state change will trigger and set user
      // Force a reload to ensure clean state
      window.location.reload()
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
    bookings: 'Bookings',
    clients: 'Clients',
    stylists: 'Stylists',
    analytics: 'Analytics',
    calls: 'Call Logs',
    marketing: 'Marketing',
    bella: 'Bella AI',
    settings: 'Settings',
  }

  return (
    <>
      {/* Impersonation bar at top */}
      <ImpersonationBar />

      <div className={`flex h-screen bg-luxe-obsidian text-luxe-white overflow-hidden ${isImpersonating ? 'pt-10' : ''}`}>
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isDarkMode={isDarkMode}
          toggleTheme={() => setIsDarkMode(!isDarkMode)}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-y-auto custom-scrollbar relative">
          <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <header className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-bold gold-text">{tabTitles[activeTab] ?? activeTab}</h2>
                <p className="text-white/40 mt-1">Welcome back to {salonName} Dashboard</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-green-500/10 text-green-500 px-4 py-2 rounded-full border border-green-500/20">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider">Bella AI: Online</span>
                </div>
                <div className="flex items-center gap-3 bg-white/5 p-1 pr-4 rounded-full border border-white/10">
                  <div className="w-10 h-10 rounded-full bg-gold-gradient flex items-center justify-center text-luxe-obsidian font-bold">
                    {ownerName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-bold">{ownerName} (Owner)</p>
                    <p className="text-[10px] text-white/40">{salonName}</p>
                  </div>
                </div>
              </div>
            </header>

            {/* Dynamic Content Area */}
            <div className="space-y-6 flex-1 flex flex-col h-full">
              {activeTab === 'dashboard' && <DashboardHome setActiveTab={setActiveTab} />}
              {activeTab === 'bookings' && <BookingsCalendar />}
              {activeTab === 'clients' && <ClientCRM />}
              {activeTab === 'stylists' && <StaffBoard />}
              {activeTab === 'analytics' && <Analytics />}
              {activeTab === 'calls' && <CallLogs />}
              {activeTab === 'marketing' && <Marketing />}
              {activeTab === 'bella' && <BellaAI />}
              {activeTab === 'settings' && <Settings />}
            </div>
          </div>
        </main>
      </div>
    </>
  )
}

function App() {
  return (
    <TenantProvider>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </TenantProvider>
  )
}

export default App
