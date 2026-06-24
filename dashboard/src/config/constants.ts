/**
 * Central config constants.
 * TENANT_ID is read from .env so it's easy to swap when adding multi-tenant auth later.
 */
export const TENANT_ID: string = import.meta.env.VITE_TENANT_ID ?? ''

/** Commission rate used in the Staff Board */
export const COMMISSION_RATE = 0.15

/** Salon timezone */
export const SALON_TIMEZONE = 'America/New_York'

/**
 * Tools key for edge function authentication.
 * Read from environment variable — never hardcode secrets in client-side code.
 */
export const TOOLS_KEY: string = import.meta.env.VITE_TOOLS_KEY ?? ''

/**
 * Build the full URL for a Supabase Edge Function.
 * Handles localhost dev, hosted Supabase, and fallback.
 */
export function getEdgeFunctionUrl(functionName: string): string {
    const envUrl = import.meta.env.VITE_SUPABASE_URL || '';

    if (envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
        return envUrl.replace(':54321', `:54321/functions/v1/${functionName}`);
    }

    if (envUrl.includes('supabase.co')) {
        return `${envUrl}/functions/v1/${functionName}`;
    }

    return `${envUrl}/functions/v1/${functionName}`;
}
