/**
 * Central config constants.
 * TENANT_ID is read from .env so it's easy to swap when adding multi-tenant auth later.
 */
export const TENANT_ID: string = import.meta.env.VITE_TENANT_ID ?? ''

/** Commission rate used in the Staff Board */
export const COMMISSION_RATE = 0.15

/** Salon timezone */
export const SALON_TIMEZONE = 'America/Chicago'
