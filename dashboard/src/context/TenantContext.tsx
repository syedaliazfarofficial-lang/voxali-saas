import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { TENANT_ID } from '../config/constants';

interface TenantBranding {
    salonName: string;
    salonTagline: string;
    logoUrl: string | null;
    ownerName: string;
}

interface TenantContextType extends TenantBranding {
    loading: boolean;
    updateBranding: (updates: Partial<TenantBranding>) => Promise<boolean>;
    refetch: () => Promise<void>;
}

const defaults: TenantBranding = {
    salonName: 'My Salon',
    salonTagline: 'Salon & Spa',
    logoUrl: null,
    ownerName: 'Owner',
};

const TenantContext = createContext<TenantContextType>({
    ...defaults,
    loading: true,
    updateBranding: async () => false,
    refetch: async () => { },
});

export const useTenant = () => useContext(TenantContext);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [branding, setBranding] = useState<TenantBranding>(defaults);
    const [loading, setLoading] = useState(true);

    const fetchBranding = useCallback(async () => {
        if (!TENANT_ID) { setLoading(false); return; }
        const { data, error } = await supabase
            .from('tenants')
            .select('salon_name, salon_tagline, logo_url, owner_name, name')
            .eq('id', TENANT_ID)
            .single();

        if (!error && data) {
            setBranding({
                salonName: data.salon_name || data.name || defaults.salonName,
                salonTagline: data.salon_tagline || defaults.salonTagline,
                logoUrl: data.logo_url || null,
                ownerName: data.owner_name || defaults.ownerName,
            });
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchBranding(); }, [fetchBranding]);

    const updateBranding = useCallback(async (updates: Partial<TenantBranding>): Promise<boolean> => {
        if (!TENANT_ID) return false;
        const { data, error } = await supabase.rpc('rpc_update_branding', {
            p_tenant_id: TENANT_ID,
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
    }, []);

    return (
        <TenantContext.Provider value={{ ...branding, loading, updateBranding, refetch: fetchBranding }}>
            {children}
        </TenantContext.Provider>
    );
};
