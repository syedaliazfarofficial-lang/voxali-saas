import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { type Session, type User } from '@supabase/supabase-js';

type UserRole = 'owner' | 'manager' | 'staff' | 'receptionist' | 'super_admin';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: Record<string, unknown> | null;
    role: UserRole | null;
    loading: boolean;
    timedOut: boolean;
    isAdmin: boolean;
    isOwner: boolean;
    isSuperAdmin: boolean;
    forceLogout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    profile: null,
    role: null,
    loading: true,
    timedOut: false,
    isAdmin: false,
    isOwner: false,
    isSuperAdmin: false,
    forceLogout: async () => { },
});

export const useAuth = () => useContext(AuthContext);

const QUERY_TIMEOUT_MS = 5000;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
    const [role, setRole] = useState<UserRole | null>(null);
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

    // Try to query profile from DB, with timeout. Returns profile data or null.
    const queryProfile = async (userId: string): Promise<Record<string, unknown> | null> => {
        // Try by `id` first
        try {
            const { data, error } = await raceTimeout(
                Promise.resolve(supabase.from('profiles').select('*').eq('id', userId).single()),
                QUERY_TIMEOUT_MS,
                'profiles.id'
            );
            if (data && !error) return data;
        } catch (e) {
            console.warn('[AuthContext] Profile by id:', (e as Error).message);
        }

        // Try by `user_id` as fallback
        try {
            const { data, error } = await raceTimeout(
                Promise.resolve(supabase.from('profiles').select('*').eq('user_id', userId).single()),
                QUERY_TIMEOUT_MS,
                'profiles.user_id'
            );
            if (data && !error) return data;
        } catch (e) {
            console.warn('[AuthContext] Profile by user_id:', (e as Error).message);
        }

        return null;
    };

    // Full profile fetch with email fallback
    const fetchProfile = async (userId: string, userEmail?: string) => {
        try {
            const profileData = await queryProfile(userId);

            if (profileData && mountedRef.current) {
                setProfile(profileData);
                setRole(profileData.role as UserRole);
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
                    const currentId = profile?.id || profile?.user_id;
                    if (!profile || currentId !== newSession.user.id) {
                        setLoading(true);
                        await fetchProfile(newSession.user.id, newSession.user.email);
                    }
                } else {
                    setSession(null);
                    setUser(null);
                    setProfile(null);
                    setRole(null);
                    setLoading(false);
                }
            });
            subscription = data.subscription;
        } catch (err) {
            console.warn('[AuthContext] onAuthStateChange setup failed:', err);
        }

        return () => {
            mountedRef.current = false;
            subscription?.unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const value: AuthContextType = {
        user,
        session,
        profile,
        role,
        loading,
        timedOut,
        isAdmin: role === 'owner' || role === 'manager',
        isOwner: role === 'owner',
        isSuperAdmin: role === 'super_admin',
        forceLogout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
