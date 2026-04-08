import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';

const TWILIO_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
const TWILIO_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') || '';

// ===== SMS TEMPLATES =====
const SMS_TEMPLATES: Record<string, (d: any) => string> = {
    booking_created: (d) =>
        `Hi ${d.client_name}! Your appointment at ${d.salon_name} is confirmed.\n` +
        `📅 ${d.date} at ${d.time}\n💇 ${d.service} with ${d.stylist}\n💰 $${d.price}` +
        (d.payment_link ? `\n\n💳 Pay deposit: ${d.payment_link}` : ''),
    booking_confirmed: (d) =>
        `✅ ${d.client_name}, your appointment at ${d.salon_name} on ${d.date} at ${d.time} is confirmed!`,
    deposit_received: (d) =>
        `💰 ${d.client_name}, we received your $${d.deposit_amount} deposit for ${d.salon_name}!\n` +
        `📅 ${d.date} at ${d.time}\n💇 ${d.service} with ${d.stylist}\n` +
        `Remaining: $${d.remaining_balance}. See you soon! ✨`,
    booking_cancelled: (d) =>
        `Hi ${d.client_name}, your appointment at ${d.salon_name} on ${d.date} at ${d.time} has been cancelled. Call us to rebook!`,
    booking_rescheduled: (d) =>
        `Hi ${d.client_name}, your appointment at ${d.salon_name} has been rescheduled to ${d.date} at ${d.time}. See you then!`,
    booking_completed: (d) =>
        `Thank you ${d.client_name}! We hope you loved your ${d.service} at ${d.salon_name}. ` +
        `Rate us: https://voxali.net/app/?feedback=${d.booking_id} ⭐`,
    // booking_checked_in notification has been disabled as per user request
    // booking_checked_in: (d) =>
    //    `Welcome ${d.client_name}! You're checked in at ${d.salon_name} for ${d.service} with ${d.stylist}. 💇`,
    booking_no_show: (d) =>
        `Hi ${d.client_name}, we missed you at ${d.salon_name} today! Would you like to reschedule? Call us anytime.`,
    appointment_reminder: (d) =>
        `⏰ Reminder: ${d.client_name}, your appointment at ${d.salon_name} is TOMORROW!\n` +
        `📅 ${d.date} at ${d.time}\n💇 ${d.service} with ${d.stylist}\n` +
        `See you soon! ✨`,
    waitlist_slot_available: (d) => 
        `🔔 Hi ${d.client_name}! A slot has opened up at ${d.salon_name} for ${d.service} on ${d.date} at ${d.time}. Reply YES to book it before it's gone!`,
    payment_expired: (d) =>
        `⚠️ Hi ${d.client_name}, your hold for ${d.salon_name} on ${d.date} expired because the deposit wasn't paid. Please visit our website to rebook!`,
    gift_card_issued: (d) =>
        `🎁 Hello! You've received a ${d.salon_name} Gift Card worth $${d.gift_card_amount}. Use code: ${d.gift_card_code} at checkout. Enjoy!`,
    low_stock_alert: (d) =>
        `⚠️ Retail Alert: ${d.product_name} is running low (Remaining: ${d.remaining_stock}) at ${d.salon_name}. Please restock soon.`,
};

// ===== EMAIL SUBJECTS =====
const EMAIL_SUBJECTS: Record<string, (d: any) => string> = {
    booking_created: (d) => `✓ Booking Confirmed — ${d.salon_name}`,
    booking_confirmed: (d) => `✓ Booking Confirmed — ${d.salon_name}`,
    deposit_received: (d) => `💰 Deposit Received — ${d.salon_name}`,
    booking_cancelled: (d) => `✗ Booking Cancelled — ${d.salon_name}`,
    booking_rescheduled: (d) => `↻ Booking Rescheduled — ${d.salon_name}`,
    booking_completed: (d) => `⭐ Thank You — ${d.salon_name}`,
    // booking_checked_in: (d) => `Checked In — ${d.salon_name}`,
    booking_no_show: (d) => `We missed you — ${d.salon_name}`,
    appointment_reminder: (d) => `⏰ Reminder: Your appointment tomorrow — ${d.salon_name}`,
    waitlist_slot_available: (d) => `🔔 Slot Available! — ${d.salon_name}`,
    payment_expired: (d) => `⏳ Hold Expired — ${d.salon_name}`,
    gift_card_issued: (d) => `🎁 You received a Gift Card! — ${d.salon_name}`,
    low_stock_alert: (d) => `⚠️ Low Stock Alert: ${d.product_name} — ${d.salon_name}`,
};

// ===== SEND SMS VIA TWILIO =====
async function sendSMS(
    toPhone: string, body: string, fromPhone: string
): Promise<{ success: boolean; error?: string }> {
    if (!TWILIO_SID || !TWILIO_TOKEN) return { success: false, error: 'Twilio not configured' };
    try {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ To: toPhone, From: fromPhone, Body: body }),
        });
        if (!res.ok) {
            const err = await res.json();
            return { success: false, error: err.message || `Twilio HTTP ${res.status}` };
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// ===== SEND EMAIL VIA RESEND =====
async function sendEmail(
    fromEmail: string, toEmail: string, subject: string, htmlBody: string
): Promise<{ success: boolean; error?: string }> {
    if (!RESEND_API_KEY) return { success: false, error: 'RESEND_API_KEY not set' };
    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ from: fromEmail, to: [toEmail], subject, html: htmlBody }),
        });
        if (!res.ok) {
            const err = await res.json();
            return { success: false, error: JSON.stringify(err) };
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

function buildEmailHTML(eventType: string, d: any): string {
    const salonName = d.salon_name || 'Salon';
    const salonTagline = d.salon_tagline || 'Premium Salon & Spa';
    const clientName = eventType === 'low_stock_alert' ? 'Store Manager' : (d.client_name || (eventType === 'gift_card_issued' ? 'Valued Client' : 'Valued Client'));

    const badges: Record<string, { label: string; color: string; bg: string; icon: string }> = {
        booking_created: { label: 'Booking Confirmed', color: '#10B981', bg: '#10B98120', icon: '✓' },
        booking_confirmed: { label: 'Booking Confirmed', color: '#10B981', bg: '#10B98120', icon: '✓' },
        deposit_received: { label: 'Deposit Received', color: '#22C55E', bg: '#22C55E20', icon: '💰' },
        booking_cancelled: { label: 'Booking Cancelled', color: '#EF4444', bg: '#EF444420', icon: '✗' },
        booking_rescheduled: { label: 'Rescheduled', color: '#3B82F6', bg: '#3B82F620', icon: '↻' },
        booking_completed: { label: 'Thank You!', color: '#D4AF37', bg: '#D4AF3720', icon: '⭐' },
        booking_checked_in: { label: 'Checked In', color: '#F59E0B', bg: '#F59E0B20', icon: '●' },
        booking_no_show: { label: 'No Show', color: '#6B7280', bg: '#6B728020', icon: '!' },
        appointment_reminder: { label: 'Appointment Reminder', color: '#F59E0B', bg: '#F59E0B20', icon: '⏰' },
        waitlist_slot_available: { label: 'Slot Now Available!', color: '#8B5CF6', bg: '#8B5CF620', icon: '🔔' },
        payment_expired: { label: 'Hold Expired', color: '#EF4444', bg: '#EF444420', icon: '⏳' },
        gift_card_issued: { label: 'Gift Card Enclosed', color: '#D8B4FE', bg: '#D8B4FE20', icon: '🎁' },
        low_stock_alert: { label: 'Inventory Alert', color: '#F59E0B', bg: '#F59E0B20', icon: '⚠️' },
    };
    const badge = badges[eventType] || badges.booking_created;

    // ===== MESSAGES PER EVENT TYPE =====
    const messages: Record<string, string> = {
        booking_created: `Thank you for choosing ${salonName}! Your appointment has been confirmed.`,
        booking_confirmed: `Thank you for choosing ${salonName}! Your appointment has been confirmed.`,
        deposit_received: `Great news! We've received your deposit of <strong style="color:#22C55E;">$${d.deposit_amount || '15'}</strong>. Your booking is now fully secured!`,
        booking_cancelled: `Your appointment for ${d.date} at ${d.time} has been cancelled.`,
        booking_rescheduled: `Your appointment has been rescheduled to a new date and time.`,
        booking_completed: `Thank you for visiting ${salonName}! We truly hope you had a wonderful experience and loved your ${d.service || 'service'}.`,
        booking_checked_in: `Welcome to ${salonName}! You've been checked in.`,
        booking_no_show: `We missed you today! Would you like to reschedule your appointment?`,
        appointment_reminder: `This is a friendly reminder that your appointment at ${salonName} is <strong style="color:#F59E0B;">tomorrow</strong>! We look forward to seeing you.`,
        waitlist_slot_available: d.waitlist_message || `Great news! A slot has opened up for ${d.service || 'your requested service'} on ${d.date} at ${d.time}. Please call us or book online to secure your spot!`,
        payment_expired: `Your temporary hold for ${d.date} at ${d.time} has expired because the <strong style="color:#D4AF37;">$${d.deposit_amount || '15'}</strong> deposit was not completed within the ${d.payment_hold_minutes || '30'}-minute window.`,
        gift_card_issued: `Surprise! You have been issued a digital Gift Card for ${salonName}. You can use this balance towards any of our premium services or retail products.`,
        low_stock_alert: `This is an automated alert from your Point of Sale system. The retail product <strong style="color:#EF4444;">${d.product_name || 'Product'}</strong> has reached critical low stock levels. Remaining: <strong style="color:#F59E0B;font-size:16px;">${d.remaining_stock || '0'}</strong> units.`,
    };

    // ===== INFO SECTION PER EVENT =====
    const infoItems: Record<string, string[]> = {
        booking_created: [
            'Arrive 10 minutes early for consultation',
            'Free cancellation up to 24 hours before',
            'Complimentary refreshments during your visit',
        ],
        booking_confirmed: [
            'Arrive 10 minutes early for consultation',
            'Free cancellation up to 24 hours before',
        ],
        deposit_received: [
            `Deposit paid: $${d.deposit_amount || '15'}`,
            `Remaining balance: $${d.remaining_balance || '0'} (payable at salon)`,
            'Your spot is now fully secured!',
        ],
        booking_cancelled: [
            'We hope to see you again soon!',
            'To rebook, visit our website or call us.',
        ],
        booking_completed: [
            'We\'d love your feedback!',
            'Book your next appointment anytime.',
        ],
        appointment_reminder: [
            'Arrive 10 minutes early for consultation',
            'If you need to reschedule, please call us as soon as possible',
            'Free parking available at our location',
        ],
        payment_expired: [
            'Appointments are only confirmed after the deposit is paid',
            'You can still rebook if the slot is currently available',
            'If you need assistance, please reply to this email',
        ],
        gift_card_issued: [
            'Present your Gift Card Code at the checkout desk',
            'Balance can be used across multiple visits',
            'Gift Cards are non-refundable and cannot be exchanged for cash',
        ],
        low_stock_alert: [
            'Alerts are triggered once when stock drops to 5 units or below.',
            'Restock your inventory in the Dashboard to pause these alerts.',
            'Verify physical stock matches the system inventory.'
        ],
    };

    const info = infoItems[eventType] || [];
    const infoHTML = info.length > 0 ? `
        <div style="background:#1E1E1E;padding:20px;border-radius:8px;margin:24px 0;border:1px solid #333;">
            <h4 style="color:#D4AF37;font-size:16px;margin:0 0 12px;">📌 Important Information</h4>
            <ul style="list-style:none;padding:0;margin:0;color:#A0A0A0;font-size:14px;line-height:2;">
                ${info.map(i => `<li>✓ ${i}</li>`).join('')}
            </ul>
        </div>` : '';

    // ===== PAY NOW BUTTON (only for booking_created with payment link) =====
    const payNowButton = (d.payment_link && (eventType === 'booking_created' || eventType === 'booking_confirmed')) ? `
        <div style="text-align:center;margin:28px 0;">
            <div style="color:#A0A0A0;font-size:14px;margin-bottom:12px;">A deposit of <strong style="color:#D4AF37;">$${d.deposit_amount || '15'}</strong> is required to confirm your booking.</div>
            <a href="${d.payment_link}" style="display:inline-block;padding:16px 48px;background:linear-gradient(135deg,#D4AF37,#B8860B);color:#000;text-decoration:none;border-radius:12px;font-weight:700;font-size:18px;letter-spacing:0.5px;box-shadow:0 4px 15px rgba(212,175,55,0.3);">💳 Pay Now</a>
            <div style="color:#666;font-size:12px;margin-top:10px;">Secure payment powered by Stripe</div>
        </div>` : '';

    // ===== DEPOSIT RECEIVED SUCCESS BANNER =====
    const depositSuccessBanner = (eventType === 'deposit_received') ? `
        <div style="text-align:center;margin:28px 0;padding:24px;background:linear-gradient(135deg,#064E3B,#065F46);border-radius:12px;border:1px solid #22C55E40;">
            <div style="font-size:40px;margin-bottom:8px;">✅</div>
            <div style="color:#22C55E;font-size:20px;font-weight:700;margin-bottom:4px;">Payment Received!</div>
            <div style="color:#A7F3D0;font-size:14px;">$${d.deposit_amount || '15'} deposit successfully processed</div>
            <div style="color:#6EE7B7;font-size:13px;margin-top:8px;">Remaining: <strong>$${d.remaining_balance || '0'}</strong> payable at salon</div>
        </div>` : '';

    // ===== INTERNAL REVIEW BUTTON (for completed bookings) =====
    const reviewButton = (eventType === 'booking_completed' && d.booking_id) ? `
        <div style="text-align:center;margin:28px 0;">
            <div style="color:#A0A0A0;font-size:14px;margin-bottom:16px;">Your feedback means the world to us!</div>
            <a href="https://voxali.net/app/?feedback=${d.booking_id}" target="_blank" style="display:inline-block;padding:16px 48px;background:linear-gradient(135deg,#D4AF37,#B8860B);color:#000;text-decoration:none;border-radius:12px;font-weight:700;font-size:18px;letter-spacing:0.5px;box-shadow:0 4px 15px rgba(212,175,55,0.3);">⭐ Rate Your Experience</a>
            <div style="color:#666;font-size:12px;margin-top:10px;">Takes less than a minute</div>
        </div>` : '';

    // ===== THANK YOU BANNER (for completed bookings) =====
    const thankYouBanner = (eventType === 'booking_completed') ? `
        <div style="text-align:center;margin:28px 0;padding:24px;background:linear-gradient(135deg,#1a1a0a,#2a2a1a);border-radius:12px;border:1px solid #D4AF3740;">
            <div style="font-size:40px;margin-bottom:8px;">💫</div>
            <div style="color:#D4AF37;font-size:20px;font-weight:700;margin-bottom:4px;">Thank You for Visiting!</div>
            <div style="color:#F4E285;font-size:14px;">We hope you loved your experience at ${salonName}</div>
        </div>` : '';

    // ===== DIGITAL GIFT CARD UI =====
    const giftCardBanner = (eventType === 'gift_card_issued') ? `
        <div style="margin:30px 0;padding:32px;background:linear-gradient(135deg, #111111 0%, #1a1a1a 100%);border-radius:20px;border:1px solid #D4AF37;box-shadow:0 20px 40px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.05);position:relative;overflow:hidden;">
            <!-- Metallic Sheen -->
            <div style="position:absolute;top:0;left:10%;width:40%;height:100%;background:linear-gradient(90deg, transparent, rgba(212,175,55,0.08), transparent);transform:skewX(-20deg);"></div>
            
            <!-- Header -->
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 30px; position: relative;">
                <div>
                    <div style="color:#D4AF37;font-size:12px;letter-spacing:3px;text-transform:uppercase;font-weight:800;font-family:sans-serif;">Exclusive Value</div>
                    <div style="color:#FFF;font-size:10px;letter-spacing:1px;text-transform:uppercase;opacity:0.5;margin-top:4px;">Digital Gift Card</div>
                </div>
                <div style="font-size:24px;">✨</div>
            </div>
            
            <!-- Balance -->
            <div style="color:#D4AF37;font-size:54px;font-weight:900;letter-spacing:-2px;margin-bottom:30px;font-family:'Times New Roman', Times, serif; text-shadow: 0 2px 10px rgba(212,175,55,0.2); position: relative;">
                $${d.gift_card_amount || '0'}
            </div>
            
            <!-- Code Section -->
            <div style="background:rgba(0,0,0,0.6);padding:20px;border-radius:12px;border:1px solid rgba(212,175,55,0.3);position:relative;overflow:hidden;">
                <!-- Faux Barcode -->
                <div style="position:absolute; right: 20px; top: 15px; display:flex; gap: 3px; opacity: 0.15;">
                    <div style="width:2px; height: 35px; background:#fff"></div>
                    <div style="width:4px; height: 35px; background:#fff"></div>
                    <div style="width:1px; height: 35px; background:#fff"></div>
                    <div style="width:3px; height: 35px; background:#fff"></div>
                    <div style="width:2px; height: 35px; background:#fff"></div>
                    <div style="width:5px; height: 35px; background:#fff"></div>
                    <div style="width:1px; height: 35px; background:#fff"></div>
                    <div style="width:3px; height: 35px; background:#fff"></div>
                </div>
                
                <div style="color:#A0A0A0;font-size:10px;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;font-family:sans-serif;">Redemption Code</div>
                <div style="color:#FFF;font-size:22px;font-family:monospace;letter-spacing:6px;font-weight:700;">${d.gift_card_code || 'XXXX-XXXX-XXXX'}</div>
            </div>
            
            <div style="color:#888;font-size:11px;margin-top:20px;line-height:1.6;font-family:sans-serif;text-align:center; position: relative;">
                This premium gift card is securely linked to ${salonName}.<br>Present the code above at reception for redemption.
            </div>
        </div>` : '';

    // ===== PAYMENT SUMMARY (for deposit_received and completed) =====
    const paymentSummary = (eventType === 'deposit_received' || eventType === 'booking_completed') ? `
        <div style="background:#1E1E1E;border-left:3px solid #22C55E;padding:20px;border-radius:8px;margin:20px 0;">
            <h4 style="color:#22C55E;font-size:14px;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;">Payment Summary</h4>
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #333;">
                <span style="color:#A0A0A0;font-size:13px;">Service Total</span>
                <span style="color:#EAEAEA;font-size:13px;font-weight:600;">$${d.price || '0'}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #333;">
                <span style="color:#A0A0A0;font-size:13px;">Deposit Paid</span>
                <span style="color:#22C55E;font-size:13px;font-weight:600;">-$${d.deposit_amount || '0'}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:8px 0;">
                <span style="color:#D4AF37;font-size:14px;font-weight:700;">Remaining Balance</span>
                <span style="color:#D4AF37;font-size:16px;font-weight:700;">$${d.remaining_balance || '0'}</span>
            </div>
        </div>` : '';

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:20px;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:linear-gradient(135deg,#0f0f0f,#1a1a1a);">
<div style="max-width:600px;margin:0 auto;background:#121212;border-radius:16px;overflow:hidden;border:1px solid #333;box-shadow:0 10px 40px rgba(0,0,0,0.5);">
    <div style="background:linear-gradient(135deg,#1E1E1E,#2A2A2A);border-bottom:2px solid #D4AF37;padding:40px 30px;text-align:center;">
        <div style="font-size:32px;font-weight:700;color:#D4AF37;letter-spacing:1px;margin-bottom:8px;">${salonName.toUpperCase()}</div>
        <div style="color:#A0A0A0;font-size:14px;letter-spacing:2px;text-transform:uppercase;">${salonTagline}</div>
        <div style="display:inline-block;background:${badge.bg};border:1px solid ${badge.color};padding:8px 20px;border-radius:20px;font-size:13px;font-weight:600;margin-top:16px;color:${badge.color};">
            ${badge.icon} ${badge.label}
        </div>
    </div>
    <div style="padding:40px 30px;background:#121212;">
        <div style="font-size:18px;color:#EAEAEA;margin-bottom:20px;">Hello <strong style="color:#D4AF37;">${clientName}</strong>,</div>
        <p style="color:#A0A0A0;line-height:1.6;margin-bottom:24px;">${messages[eventType] || ''}</p>
        ${thankYouBanner}
        ${depositSuccessBanner}
        ${giftCardBanner}
        ${eventType !== 'gift_card_issued' ? `
        <div style="background:#1E1E1E;border-left:3px solid #D4AF37;padding:24px;border-radius:8px;margin:24px 0;">
            ${(d.bookings_list && d.bookings_list.length > 0) ? `
                <div style="color:#A0A0A0;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin-bottom:16px;">Appointments</div>
                ${d.bookings_list.map((b: any) => `
                <div style="background:#2A2A2A;padding:12px 16px;border-radius:6px;margin-bottom:8px;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                        <strong style="color:#EAEAEA;font-size:15px;">${b.service}</strong>
                        <span style="color:#F4E285;font-size:14px;font-weight:600;">$${b.price}</span>
                    </div>
                    <div style="color:#A0A0A0;font-size:13px;display:flex;justify-content:space-between;">
                        <span>👤 ${b.stylist}</span>
                        <span>🕐 ${b.time}</span>
                    </div>
                </div>`).join('')}
                <div style="display:flex;justify-content:space-between;padding:12px 0 0;margin-top:12px;border-top:1px solid #333;">
                    <span style="color:#A0A0A0;font-weight:600;font-size:14px;">📅 Date</span>
                    <span style="color:#F4E285;font-size:14px;font-weight:600;">${d.date || 'N/A'}</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:12px 0 0;">
                    <span style="color:#A0A0A0;font-weight:600;font-size:14px;">💰 Total</span>
                    <span style="color:#D4AF37;font-size:18px;font-weight:700;">$${d.price || '0'}</span>
                </div>
            ` : `
                <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #333;">
                    <span style="color:#A0A0A0;font-weight:600;font-size:14px;">📅 Date & Time</span>
                    <span style="color:#F4E285;font-size:14px;font-weight:600;">${d.date || 'N/A'} at ${d.time || 'N/A'}</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #333;">
                    <span style="color:#A0A0A0;font-weight:600;font-size:14px;">💇 Service</span>
                    <span style="color:#EAEAEA;font-size:14px;">${d.service || 'N/A'}</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #333;">
                    <span style="color:#A0A0A0;font-weight:600;font-size:14px;">👤 Stylist</span>
                    <span style="color:#EAEAEA;font-size:14px;">${d.stylist || 'N/A'}</span>
                </div>
                <div style="display:flex;justify-content:space-between;padding:12px 0;">
                    <span style="color:#A0A0A0;font-weight:600;font-size:14px;">💰 Total</span>
                    <span style="color:#D4AF37;font-size:18px;font-weight:700;">$${d.price || '0'}</span>
                </div>
            `}
        </div>
        ` : ''}
        ${paymentSummary}
        ${payNowButton}
        ${reviewButton}
        ${infoHTML}
    </div>
    <div style="background:#0a0a0a;padding:30px;text-align:center;color:#A0A0A0;border-top:1px solid #333;">
        <div style="font-size:22px;font-weight:700;color:#D4AF37;margin-bottom:12px;">${salonName.toUpperCase()}</div>
        <div style="font-size:13px;line-height:1.8;margin:16px 0;">
            ${d.salon_phone ? '📞 ' + d.salon_phone + '<br>' : ''}
            ${d.salon_email ? '📧 ' + d.salon_email + '<br>' : ''}
            ${d.salon_website ? '🌐 ' + d.salon_website + '<br>' : ''}
        </div>
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid #333;font-size:11px;color:#666;">
            © 2026 ${salonName}. All rights reserved.<br>Powered by Voxali
        </div>
    </div>
</div>
</body></html>`;
}

// ===== MAIN HANDLER =====
serve(async (_req) => {
    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        const { data: pending, error: fetchErr } = await supabase
            .from('notification_queue')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: true })
            .limit(10);

        if (fetchErr) throw fetchErr;
        if (!pending || pending.length === 0) {
            return new Response(JSON.stringify({ processed: 0 }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        let sentCount = 0;
        let failCount = 0;

        for (const item of pending) {
            // Ignore duplicate booking_created from the database trigger
            if (item.event_type === 'booking_created' && item.booking_details?.source !== 'edge_function') {
                await supabase.from('notification_queue')
                    .update({ status: 'failed', error_message: 'Ignored DB Trigger duplicated event to prevent double emails', processed_at: new Date().toISOString() })
                    .eq('id', item.id);
                failCount++;
                continue;
            }

            const { data: tenant, error: tErr } = await supabase
                .from('tenants')
                .select(`
                    twilio_phone_number, notification_email_from, salon_name, salon_tagline, 
                    salon_email, salon_website, salon_phone_owner, google_review_url, 
                    notifications_enabled, sms_included, sms_topup_balance, sms_used, sms_sending_paused, subscription_status
                `)
                .eq('id', item.tenant_id)
                .single();

            if (!tenant) {
                console.error(`[SendNotification] Tenant not found for ID: ${item.tenant_id}. Error: ${tErr?.message}`);
                await supabase.from('notification_queue')
                    .update({ 
                        status: 'failed', 
                        error_message: `Tenant not found for ID: ${item.tenant_id} (Error: ${tErr?.message || 'Empty result'})`, 
                        processed_at: new Date().toISOString() 
                    })
                    .eq('id', item.id);
                failCount++;
                continue;
            }

            // ===== FETCH PAYMENT LINK (for booking_created) =====
            let paymentLink = '';
            let depositAmount = '';
            let remainingBalance = '';
            if (item.booking_id) {
                const { data: booking } = await supabase
                    .from('bookings')
                    .select('deposit_amount, deposit_paid_amount, total_price')
                    .eq('id', item.booking_id)
                    .single();

                if (booking) {
                    depositAmount = (booking.deposit_amount || 0).toString();
                    remainingBalance = ((booking.total_price || 0) - (booking.deposit_paid_amount || 0)).toString();
                }

                // Get payment link for booking_created
                if (item.event_type === 'booking_created' || item.event_type === 'booking_confirmed') {
                    const { data: payment } = await supabase
                        .from('payments')
                        .select('payment_link, amount')
                        .eq('booking_id', item.booking_id)
                        .eq('status', 'pending')
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();
                    if (payment?.payment_link) {
                        paymentLink = payment.payment_link;
                        if (payment.amount) depositAmount = payment.amount.toString();
                    }
                }
            }

            const details = {
                ...(item.booking_details || {}),
                client_name: item.client_name,
                salon_name: tenant.salon_name || 'Salon',
                salon_tagline: tenant.salon_tagline || 'Premium Salon & Spa',
                salon_phone: tenant.twilio_phone_number || '',
                salon_email: tenant.salon_email || '',
                salon_website: tenant.salon_website || '',
                google_review_url: tenant.google_review_url || '',
                payment_link: paymentLink || (item.booking_details || {}).payment_link || '',
                booking_id: item.booking_id || (item.booking_details || {}).booking_id || '',
                deposit_amount: depositAmount,
                remaining_balance: remainingBalance,
                bookings_list: (item.booking_details || {}).bookings_list || null,
            };

            const errors: string[] = [];
            let smsSent = 0;
            let emailsSent = 0;

            // Skip sending if notifications are globally disabled by the tenant
            if (tenant.notifications_enabled !== false) {
                // SMS
                if (TWILIO_SID && TWILIO_TOKEN && tenant.twilio_phone_number && item.client_phone) {
                    const tmpl = SMS_TEMPLATES[item.event_type];
                    if (tmpl) {
                        const smsIncluded = tenant.sms_included || 0;
                        const smsTopup = tenant.sms_topup_balance || 0;
                        const smsUsed = tenant.sms_used || 0;
                        const effectiveSms = (smsIncluded + smsTopup) - smsUsed;

                        if (tenant.sms_sending_paused || effectiveSms <= 0) {
                            errors.push(`SMS Skipped: Quota Exhausted (${effectiveSms} available)`);
                        } else {
                            const smsResult = await sendSMS(
                                item.client_phone, tmpl(details), tenant.twilio_phone_number
                            );
                            if (!smsResult.success) {
                                errors.push(`SMS: ${smsResult.error}`);
                            } else {
                                smsSent++;
                            }
                        }
                    }
                }

                // Email
                let targetEmail = item.client_email;
                if (item.event_type === 'low_stock_alert') targetEmail = tenant.salon_email || tenant.notification_email_from;

                if (RESEND_API_KEY && targetEmail) {
                    const subjectFn = EMAIL_SUBJECTS[item.event_type];
                    if (subjectFn) {
                        const fromAddr = `${tenant.salon_name || 'Voxali'} <noreply@voxali.net>`;
                        const emailResult = await sendEmail(
                            fromAddr, targetEmail,
                            subjectFn(details), buildEmailHTML(item.event_type, details)
                        );
                        if (!emailResult.success) errors.push(`Email: ${emailResult.error}`);
                        else emailsSent++;
                    }
                }
            } else {
                errors.push('Skipped: Notifications are globally disabled by the Salon Owner');
            }

            // Usage Tracking Increment
            if (smsSent > 0 || emailsSent > 0) {
                const { data: usageData } = await supabase
                    .from('tenants')
                    .select('sms_used, emails_used, sms_included, sms_topup_balance')
                    .eq('id', item.tenant_id)
                    .single();

                if (usageData) {
                    const newSmsUsed = (usageData.sms_used || 0) + smsSent;
                    const effectiveSms = (usageData.sms_included + usageData.sms_topup_balance) - newSmsUsed;

                    await supabase.from('tenants').update({
                        sms_used: newSmsUsed,
                        emails_used: (usageData.emails_used || 0) + emailsSent,
                        sms_sending_paused: effectiveSms <= 0
                    }).eq('id', item.tenant_id);

                    if (smsSent > 0) {
                        await supabase.from('sms_usage_logs').insert({
                            tenant_id: item.tenant_id,
                            message_id: item.id,
                            sms_count: smsSent,
                            event_type: item.event_type,
                            idempotency_key: `sms_send_${item.id}`
                        });
                    }
                }
            }

            const finalStatus = errors.length === 0 ? 'sent' : 'failed';
            await supabase.from('notification_queue')
                .update({
                    status: finalStatus,
                    error_message: errors.length > 0 ? errors.join('; ') : null,
                    processed_at: new Date().toISOString(),
                })
                .eq('id', item.id);

            if (finalStatus === 'sent') sentCount++;
            else failCount++;
        }

        return new Response(
            JSON.stringify({ processed: pending.length, sent: sentCount, failed: failCount }),
            { headers: { 'Content-Type': 'application/json' } }
        );
    } catch (e: any) {
        return new Response(
            JSON.stringify({ error: e.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
});
