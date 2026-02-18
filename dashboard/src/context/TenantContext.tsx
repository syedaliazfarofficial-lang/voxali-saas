import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

// ============================================================
// DYNAMIC TENANT RESOLUTION — Priority Order:
// 1. localStorage 'voxali_impersonate_tenant' (Super Admin viewing)
// 2. Logged-in user's profile.tenant_id (normal salon login)
// 3. import.meta.env.VITE_TENANT_ID (local dev fallback)
// ============================================================

interface TenantBranding {
    salonName: string;
    salonTagline: string;
    logoUrl: string | null;
    ownerName: string;
}

interface TenantContextType extends TenantBranding {
    tenantId: string | null;
    isImpersonating: boolean;
    loading: boolean;
    updateBranding: (updates: Partial<TenantBranding>) => Promise<boolean>;
    refetch: () => Promise<void>;
    setImpersonateTenant: (tenantId: string, salonName?: string) => void;
    clearImpersonation: () => void;
}

const defaults: TenantBranding = {
    salonName: 'My Salon',
    salonTagline: 'Salon & Spa',
    logoUrl: null,
    ownerName: 'Owner',
};

const TenantContext = createContext<TenantContextType>({
    ...defaults,
    tenantId: null,
    isImpersonating: false,
    loading: true,
    updateBranding: async () => false,
    refetch: async () => { },
    setImpersonateTenant: () => { },
    clearImpersonation: () => { },
});

export const useTenant = () => useContext(TenantContext);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { profile } = useAuth();
    const [branding, setBranding] = useState<TenantBranding>(defaults);
    const [loading, setLoading] = useState(true);
    const [impersonateId, setImpersonateId] = useState<string | null>(() => {
        return localStorage.getItem('voxali_impersonate_tenant');
    });

    // ===== DYNAMIC TENANT ID RESOLUTION =====
    const tenantId = useMemo(() => {
        // Priority 1: Super Admin impersonation
        if (impersonateId) {
            console.log('[TenantContext] Using impersonation tenant:', impersonateId);
            return impersonateId;
        }
        // Priority 2: User's profile tenant_id
        const profileTid = (profile as Record<string, unknown>)?.tenant_id as string | undefined;
        if (profileTid) {
            console.log('[TenantContext] Using profile tenant:', profileTid);
            return profileTid;
        }
        // Priority 3: .env fallback (local dev only)
        const envTid = import.meta.env.VITE_TENANT_ID as string | undefined;
        if (envTid) {
            console.log('[TenantContext] Using .env fallback tenant:', envTid);
            return envTid;
        }
        console.warn('[TenantContext] No tenant ID resolved!');
        return null;
    }, [impersonateId, profile]);

    const isImpersonating = !!impersonateId;

    // ===== FETCH BRANDING FROM DB =====
    const fetchBranding = useCallback(async () => {
        if (!tenantId) { setLoading(false); return; }
        try {
            const { data, error } = await supabase
                .from('tenants')
                .select('salon_name, salon_tagline, logo_url, owner_name, name')
                .eq('id', tenantId)
                .single();

            if (!error && data) {
                setBranding({
                    salonName: data.salon_name || data.name || defaults.salonName,
                    salonTagline: data.salon_tagline || defaults.salonTagline,
                    logoUrl: data.logo_url || null,
                    ownerName: data.owner_name || defaults.ownerName,
                });
            }
        } catch (err) {
            console.error('[TenantContext] Failed to fetch branding:', err);
        }
        setLoading(false);
    }, [tenantId]);

    useEffect(() => {
        fetchBranding();
    }, [fetchBranding]);

    // ===== SUPER ADMIN: SET IMPERSONATION =====
    const setImpersonateTenant = useCallback((tid: string, salonName?: string) => {
        localStorage.setItem('voxali_impersonate_tenant', tid);
        if (salonName) localStorage.setItem('voxali_impersonate_name', salonName);
        localStorage.setItem('admin_viewing_tenant', 'true');
        setImpersonateId(tid);
    }, []);

    // ===== SUPER ADMIN: CLEAR IMPERSONATION =====
    const clearImpersonation = useCallback(() => {
        localStorage.removeItem('voxali_impersonate_tenant');
        localStorage.removeItem('voxali_impersonate_name');
        localStorage.removeItem('admin_viewing_tenant');
        setImpersonateId(null);
    }, []);

    // ===== UPDATE BRANDING =====
    const updateBranding = useCallback(async (updates: Partial<TenantBranding>): Promise<boolean> => {
        if (!tenantId) return false;
        const { data, error } = await supabase.rpc('rpc_update_branding', {
            p_tenant_id: tenantId,
            p_salon_name: updates.salonName ?? null,
            p_salon_tagline: updates.salonTagline ?? null,
            p_logo_url: updates.logoUrl ?? null,
            p_owner_name: updates.ownerName ?? null,
        });
        if (!error && data?.success) {
            setBranding(prev => ({ ...prev, ...updates }));
            return true;
        }
        return false;
    }, [tenantId]);

    return (
        <TenantContext.Provider value={{
            ...branding,
            tenantId,
            isImpersonating,
            loading,
            updateBranding,
            refetch: fetchBranding,
            setImpersonateTenant,
            clearImpersonation,
        }}>
            {children}
        </TenantContext.Provider>
    );
};
