import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { type Session, type User } from '@supabase/supabase-js';

type UserRole = 'owner' | 'manager' | 'staff' | 'receptionist' | 'super_admin';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: Record<string, unknown> | null;
    role: UserRole | null;
    staffId: string | null;
    staffRecord: Record<string, unknown> | null;
    loading: boolean;
    timedOut: boolean;
    isAdmin: boolean;
    isOwner: boolean;
    isStaff: boolean;
    isSuperAdmin: boolean;
    forceLogout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    profile: null,
    role: null,
    staffId: null,
    staffRecord: null,
    loading: true,
    timedOut: false,
    isAdmin: false,
    isOwner: false,
    isStaff: false,
    isSuperAdmin: false,
    forceLogout: async () => { },
});

export const useAuth = () => useContext(AuthContext);

const QUERY_TIMEOUT_MS = 3000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
    const [role, setRole] = useState<UserRole | null>(null);
    const [staffId, setStaffId] = useState<string | null>(null);
    const [staffRecord, setStaffRecord] = useState<Record<string, unknown> | null>(null);
    const [loading, setLoading] = useState(true);
    const [timedOut, setTimedOut] = useState(false);
    const mountedRef = useRef(true);

    const forceLogout = async () => {
        localStorage.removeItem('voxali_impersonate_tenant');
        localStorage.removeItem('admin_viewing_tenant');
        localStorage.removeItem('voxali_impersonate_name');
        try { await supabase.auth.signOut(); } catch { /* ignore */ }
        setUser(null);
        setSession(null);
        setProfile(null);
        setRole(null);
        setStaffId(null);
        setStaffRecord(null);
        setLoading(false);
        setTimedOut(false);
    };

    // Wrap any promise with a timeout
    function raceTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
        let timer: ReturnType<typeof setTimeout>;
        const timeout = new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
        });
        return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
    }

    // PARALLEL profile query — fires both at once, returns whichever succeeds first
    const queryProfile = async (userId: string): Promise<Record<string, unknown> | null> => {
        console.log('[AuthContext] queryProfile called for userId:', userId);
        const queryById = raceTimeout(
            Promise.resolve(supabaseAdmin.from('profiles').select('*').eq('id', userId).single()),
            QUERY_TIMEOUT_MS, 'profiles.id'
        );
        const queryByUserId = raceTimeout(
            Promise.resolve(supabaseAdmin.from('profiles').select('*').eq('user_id', userId).single()),
            QUERY_TIMEOUT_MS, 'profiles.user_id'
        );

        const results = await Promise.allSettled([queryById, queryByUserId]);

        for (const result of results) {
            if (result.status === 'fulfilled') {
                const { data, error } = result.value;
                console.log('[AuthContext] Query result — data:', data ? 'found' : 'null', 'error:', error?.message || 'none', 'tenant_id:', (data as Record<string, unknown>)?.tenant_id || 'N/A');
                if (data && !error) return data;
            } else {
                console.warn('[AuthContext] Query rejected:', result.reason?.message || result.reason);
            }
        }

        console.warn('[AuthContext] Both profile queries failed for userId:', userId);
        return null;
    };

    // ===== STAFF CROSS-CHECK: Fetch linked staff record & verify tenant =====
    const fetchStaffRecord = async (profileData: Record<string, unknown>) => {
        const pStaffId = profileData.staff_id as string | undefined;
        const pTenantId = profileData.tenant_id as string | undefined;
        if (!pStaffId || !pTenantId) {
            console.warn('[AuthContext] Staff profile missing staff_id or tenant_id');
            return;
        }
        try {
            const { data: staffData, error } = await supabaseAdmin
                .from('staff')
                .select('*')
                .eq('id', pStaffId)
                .single();

            if (error || !staffData) {
                console.error('[AuthContext] Staff record not found for staff_id:', pStaffId);
                return;
            }

            // CROSS-CHECK: staff.tenant_id must match profile.tenant_id
            if (staffData.tenant_id !== pTenantId) {
                console.error('[AuthContext] TENANT MISMATCH! Staff tenant:', staffData.tenant_id, 'Profile tenant:', pTenantId);
                if (mountedRef.current) {
                    setTimedOut(true); // Block access — shows error screen
                }
                return;
            }

            // DEACTIVATION CHECK: Block inactive staff from accessing dashboard
            if (staffData.is_active === false) {
                console.warn('[AuthContext] Staff is deactivated:', staffData.full_name);
                if (mountedRef.current) {
                    setTimedOut(true); // Block access — shows error screen
                }
                return;
            }

            if (mountedRef.current) {
                setStaffId(pStaffId);
                setStaffRecord(staffData);

                // Dynamically upgrade auth role based on explicit staff job title
                const jobTitle = (staffData.role || '').toUpperCase();
                if (jobTitle === 'MANAGER') {
                    setRole('manager');
                } else if (jobTitle === 'RECEPTIONIST' || jobTitle === 'FRONT_DESK') {
                    setRole('receptionist');
                }

                console.log('[AuthContext] Staff record loaded:', staffData.full_name, '| tenant verified ✓');
            }
        } catch (err) {
            console.error('[AuthContext] fetchStaffRecord exception:', err);
        }
    };

    // Full profile fetch with email fallback
    const fetchProfile = async (userId: string, userEmail?: string) => {
        try {
            const profileData = await queryProfile(userId);

            if (profileData && mountedRef.current) {
                setProfile(profileData);
                setRole(profileData.role as UserRole);

                // If staff role, fetch & cross-check staff record
                if (profileData.role === 'staff' && profileData.staff_id) {
                    await fetchStaffRecord(profileData);
                }
                return;
            }

            // Database queries failed or timed out — fallback to email
            if (userEmail && mountedRef.current) {
                console.warn('[AuthContext] Using email-based role fallback for:', userEmail);
                const fallbackRole: UserRole = userEmail === 'super@voxali.com' ? 'super_admin' : 'owner';
                setProfile({ id: userId, email: userEmail, role: fallbackRole });
                setRole(fallbackRole);
            } else if (mountedRef.current) {
                setTimedOut(true);
            }
        } catch (err) {
            console.error('[AuthContext] fetchProfile exception:', err);
            if (userEmail && mountedRef.current) {
                const fallbackRole: UserRole = userEmail === 'super@voxali.com' ? 'super_admin' : 'owner';
                setProfile({ id: userId, email: userEmail, role: fallbackRole });
                setRole(fallbackRole);
            } else if (mountedRef.current) {
                setTimedOut(true);
            }
        } finally {
            if (mountedRef.current) {
                setLoading(false);
            }
        }
    };

    // Try to extract user info from Supabase localStorage token (fallback if getSession hangs/errors)
    const recoverFromLocalStorage = (): { id: string; email: string } | null => {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                try {
                    const raw = localStorage.getItem(key);
                    if (raw) {
                        const parsed = JSON.parse(raw);
                        const u = parsed?.user || parsed?.currentSession?.user;
                        if (u?.id && u?.email) return { id: u.id, email: u.email };
                    }
                } catch { /* skip bad JSON */ }
            }
        }
        return null;
    };

    useEffect(() => {
        mountedRef.current = true;
        let profileFetchedForUser: string | null = null; // Track which user's profile was already fetched

        const initAuth = async () => {
            try {
                const { data: { session: currentSession } } = await raceTimeout(
                    supabase.auth.getSession(),
                    QUERY_TIMEOUT_MS,
                    'getSession'
                );

                if (!mountedRef.current) return;

                if (currentSession?.user) {
                    setSession(currentSession);
                    setUser(currentSession.user);
                    profileFetchedForUser = currentSession.user.id;
                    await fetchProfile(currentSession.user.id, currentSession.user.email);
                } else {
                    setLoading(false);
                }
            } catch (err) {
                console.warn('[AuthContext] getSession failed:', (err as Error).message);
                if (!mountedRef.current) return;

                // Fallback: try recovering from localStorage
                const recovered = recoverFromLocalStorage();
                if (recovered) {
                    console.log('[AuthContext] Recovered user from localStorage:', recovered.email);
                    profileFetchedForUser = recovered.id;
                    await fetchProfile(recovered.id, recovered.email);
                } else {
                    setLoading(false);
                }
            }
        };

        initAuth();

        // Listen for auth changes (this may also fail with AbortError — handle gracefully)
        let subscription: { unsubscribe: () => void } | null = null;
        try {
            const { data } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
                if (!mountedRef.current) return;

                if (newSession?.user) {
                    setSession(newSession);
                    setUser(newSession.user);

                    // CRITICAL: Skip duplicate fetch if initAuth already fetched for this user.
                    // The INITIAL_SESSION event fires almost simultaneously with initAuth(),
                    // causing duplicate fetchProfile calls that race each other.
                    if (profileFetchedForUser === newSession.user.id) {
                        console.log('[AuthContext] onAuthStateChange: profile already fetched by initAuth, skipping');
                        return;
                    }

                    // Different user or first time — fetch profile
                    profileFetchedForUser = newSession.user.id;
                    setLoading(true);
                    await fetchProfile(newSession.user.id, newSession.user.email);
                } else {
                    profileFetchedForUser = null;
                    setSession(null);
                    setUser(null);
                    setProfile(null);
                    setRole(null);
                    setStaffId(null);
                    setStaffRecord(null);
                    setLoading(false);
                }
            });
            subscription = data.subscription;
        } catch (err) {
            console.warn('[AuthContext] onAuthStateChange setup failed:', err);
        }

        // ===== HEARTBEAT: Check every 30s if user is still valid =====
        // Detects: staff deactivated, staff deleted, owner banned by super admin
        const heartbeat = setInterval(async () => {
            if (!mountedRef.current) return;

            // Get current session
            const { data: { session: sess } } = await supabase.auth.getSession();
            if (!sess?.user) return;

            // Check 1: Does profile still exist?
            const { data: prof, error: profErr } = await supabaseAdmin
                .from('profiles')
                .select('role, staff_id, tenant_id, can_login')
                .eq('id', sess.user.id)
                .single();

            // Only log out if specifically not found (PGRST116). Network errors should be ignored.
            if (profErr && profErr.code === 'PGRST116') {
                console.warn('[Heartbeat] Profile deleted — forcing logout');
                alert('Your account has been removed. You will be logged out.');
                await forceLogout();
                return;
            } else if (profErr) {
                return; // Ignore temporary network errors
            }
            if (!prof) return;

            // Check 2: If can_login is explicitly false (banned by admin)
            if (prof.can_login === false) {
                console.warn('[Heartbeat] User banned (can_login=false) — forcing logout');
                alert('Your account has been deactivated. Please contact your salon owner.');
                await forceLogout();
                return;
            }

            // Check 3: If staff, check is_active on staff record
            if (prof.role === 'staff' && prof.staff_id) {
                const { data: staffRec, error: staffErr } = await supabaseAdmin
                    .from('staff')
                    .select('is_active, full_name')
                    .eq('id', prof.staff_id)
                    .single();

                if (staffErr && staffErr.code === 'PGRST116') {
                    console.warn('[Heartbeat] Staff record deleted — forcing logout');
                    alert('Your staff account has been removed. You will be logged out.');
                    await forceLogout();
                    return;
                } else if (staffErr) {
                    return; // Ignore network errors
                }
                if (!staffRec) return;

                if (staffRec.is_active === false) {
                    console.warn('[Heartbeat] Staff deactivated:', staffRec.full_name, '— forcing logout');
                    alert('Your account has been deactivated by the salon owner. You will be logged out.');
                    await forceLogout();
                    return;
                }
            }

            // Check 4: If owner, check tenant is still active
            if (prof.role === 'owner' && prof.tenant_id) {
                const { data: tenantRec, error: tenantErr } = await supabaseAdmin
                    .from('tenants')
                    .select('is_active')
                    .eq('id', prof.tenant_id)
                    .single();

                if (tenantErr) return; // Ignore network errors

                if (tenantRec && tenantRec.is_active === false) {
                    console.warn('[Heartbeat] Tenant deactivated — forcing owner logout');
                    alert('Your salon account has been deactivated. Please contact support.');
                    await forceLogout();
                    return;
                }
            }
        }, 30000); // Every 30 seconds

        return () => {
            mountedRef.current = false;
            subscription?.unsubscribe();
            clearInterval(heartbeat);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const value: AuthContextType = {
        user,
        session,
        profile,
        role,
        staffId,
        staffRecord,
        loading,
        timedOut,
        isAdmin: role === 'owner' || role === 'manager',
        isOwner: role === 'owner',
        isStaff: role === 'staff',
        isSuperAdmin: role === 'super_admin',
        forceLogout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
