// Edge Function: add-to-waitlist
// Adds a client to the waitlist for a service/date

import { getSupabase, validateRequest, jsonResponse, errorResponse, handleCORS, normalizePhone } from '../_shared/utils.ts';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return handleCORS();

    try {
        const auth = validateRequest(req);
        if (!auth.valid) return errorResponse(auth.error!, 401);

        // Parse body  get tenant_id from body (ElevenLabs) or URL
        let body: any = {};
        try { body = await req.json(); } catch { }
        const tenantId = auth.tenantId || body.tenant_id;
        if (!tenantId) return errorResponse('Missing tenant_id');
        const clientName = body.name || body.client_name || '';
        const clientPhone = body.phone || body.client_phone || '';
        const clientEmail = body.email || body.client_email || '';
        const serviceId = body.service_id || '';
        const preferredDate = body.preferred_date || body.date || '';
        const preferredTime = body.preferred_time || body.time || '';
        const notes = body.notes || '';

        if (!clientName && !clientPhone) {
            return errorResponse('Client name or phone is required');
        }

        const supabase = getSupabase();

        // Normalize phone number for this salon's country
        const { data: tenantData } = await supabase.from('tenants').select('timezone').eq('id', tenantId).single();
        const normalizedPhone = normalizePhone(clientPhone, tenantData?.timezone);

        // Insert into waitlist
        const { data, error } = await supabase
            .from('waitlist')
            .insert({
                tenant_id: tenantId,
                client_name: clientName,
                client_phone: normalizedPhone,
                service_id: serviceId || null,
                preferred_date: preferredDate || null,
                preferred_time: preferredTime || null,
                notes: notes,
                status: 'waiting',
            })
            .select('id')
            .single();

        if (error) {
            return errorResponse(`Failed to add to waitlist: ${error.message}`, 500);
        }

        return jsonResponse({
            success: true,
            message: `${clientName} has been added to the waitlist${preferredDate ? ` for ${preferredDate}` : ''}. We will notify you when a slot becomes available.`,
            waitlist_id: data?.id,
        });
    } catch (e: any) {
        return errorResponse(`Server error: ${e.message}`, 500);
    }
});
