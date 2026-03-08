// Edge Function: payment-success
// Server-side renders a beautiful payment success page with booking data baked in
// NO client-side fetch needed — data is embedded directly in HTML

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

Deno.serve(async (req) => {
    const url = new URL(req.url);
    const bookingId = url.searchParams.get('booking_id');
    const cancelled = url.searchParams.get('cancelled');

    // If cancelled
    if (cancelled === 'true') {
        return new Response(errorPage('Payment Cancelled', 'Your payment was not processed. You can try again using the link in your email.'), {
            status: 200,
            headers: { 'content-type': 'text/html; charset=utf-8' },
        });
    }

    // If no booking ID
    if (!bookingId) {
        return new Response(errorPage('Invalid Link', 'This payment link is invalid or has expired.'), {
            status: 200,
            headers: { 'content-type': 'text/html; charset=utf-8' },
        });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        );

        const { data: booking, error } = await supabase.from('bookings')
            .select('id, status, start_time, total_price, deposit_paid_amount, clients(name, email), services(name), staff(full_name), tenants(salon_name, salon_tagline)')
            .eq('id', bookingId).single();

        if (error || !booking) {
            return new Response(errorPage('Booking Not Found', 'We could not find this booking.'), {
                status: 200,
                headers: { 'content-type': 'text/html; charset=utf-8' },
            });
        }

        const client = (booking as any).clients || {};
        const service = (booking as any).services || {};
        const staff = (booking as any).staff || {};
        const tenant = (booking as any).tenants || {};

        const depositPaid = booking.deposit_paid_amount || 0;
        const totalPrice = booking.total_price || 0;
        const remaining = totalPrice - depositPaid;
        const startTime = new Date(booking.start_time);

        const dateStr = startTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Chicago' });
        const timeStr = startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Chicago' });

        const html = successPage({
            salonName: tenant.salon_name || 'Salon',
            salonTagline: tenant.salon_tagline || '',
            clientName: client.name || 'Customer',
            serviceName: service.name || 'Service',
            stylist: staff.full_name || 'Any Available',
            date: dateStr,
            time: timeStr,
            depositPaid: depositPaid.toFixed(2),
            remaining: remaining.toFixed(2),
            totalPrice: totalPrice.toFixed(2),
        });

        return new Response(html, {
            status: 200,
            headers: { 'content-type': 'text/html; charset=utf-8' },
        });
    } catch (e: any) {
        return new Response(errorPage('Something Went Wrong', 'Please contact the salon for assistance.'), {
            status: 200,
            headers: { 'content-type': 'text/html; charset=utf-8' },
        });
    }
});

function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

interface PageData {
    salonName: string; salonTagline: string; clientName: string;
    serviceName: string; stylist: string; date: string; time: string;
    depositPaid: string; remaining: string; totalPrice: string;
}

function successPage(d: PageData): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Payment Successful - ${esc(d.salonName)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;background:#0A0A0B;color:#E0E0E0;min-height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative}
body::before{content:'';position:fixed;top:-50%;left:-50%;width:200%;height:200%;background:radial-gradient(circle at 30% 40%,rgba(212,175,55,.06) 0%,transparent 60%),radial-gradient(circle at 70% 60%,rgba(16,185,129,.04) 0%,transparent 50%);animation:bp 8s ease-in-out infinite alternate;z-index:0}
@keyframes bp{0%{transform:translate(0,0) scale(1)}100%{transform:translate(-3%,-3%) scale(1.05)}}
.c{position:relative;z-index:1;max-width:520px;width:90%;animation:su .8s cubic-bezier(.16,1,.3,1) both}
@keyframes su{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
.card{background:linear-gradient(145deg,#1A1A1F,#141417);border:1px solid rgba(212,175,55,.15);border-radius:24px;padding:48px 36px;text-align:center;box-shadow:0 25px 80px rgba(0,0,0,.5),0 0 60px rgba(212,175,55,.05)}
.ic{width:88px;height:88px;margin:0 auto 28px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#10B981,#059669);box-shadow:0 8px 30px rgba(16,185,129,.3);animation:si .6s cubic-bezier(.34,1.56,.64,1) .3s both;font-size:42px}
@keyframes si{from{transform:scale(0)}to{transform:scale(1)}}
.sn{font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#D4AF37;font-weight:600;margin-bottom:4px}
.st{font-size:11px;color:#555;letter-spacing:1px;text-transform:uppercase;margin-bottom:24px}
h1{font-size:28px;font-weight:700;color:#FFF;margin-bottom:8px}
.sub{font-size:15px;color:#999;margin-bottom:28px}
.badge{display:inline-flex;align-items:center;gap:6px;padding:8px 20px;border-radius:100px;font-size:13px;font-weight:600;background:rgba(16,185,129,.1);color:#10B981;border:1px solid rgba(16,185,129,.2);margin-bottom:24px}
.det{background:rgba(212,175,55,.06);border:1px solid rgba(212,175,55,.12);border-radius:16px;padding:20px 24px;margin-bottom:20px;text-align:left}
.row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:14px}
.row:last-child{border-bottom:none}
.lbl{color:#777}
.val{font-weight:600;color:#E0E0E0}
.pay{background:linear-gradient(135deg,rgba(16,185,129,.08),rgba(16,185,129,.02));border:1px solid rgba(16,185,129,.2);border-radius:16px;padding:20px 24px;margin-bottom:24px}
.ph{font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#10B981;font-weight:600;margin-bottom:12px;text-align:center}
.pr{display:flex;justify-content:space-between;padding:7px 0;font-size:14px}
.pr.t{border-top:1px solid rgba(16,185,129,.15);margin-top:6px;padding-top:12px;font-weight:700;color:#D4AF37;font-size:16px}
.gr{color:#10B981;font-weight:700}
.info{font-size:13px;color:#777;line-height:1.6}
.info b{color:#D4AF37}
.pw{font-size:11px;color:#444;margin-top:20px}
.pw a{color:#D4AF37;text-decoration:none}
@media(max-width:480px){.card{padding:36px 20px}h1{font-size:24px}}
</style>
</head>
<body>
<div class="c"><div class="card">
<div class="ic">&#10003;</div>
<div class="sn">${esc(d.salonName)}</div>
<div class="st">${esc(d.salonTagline)}</div>
<h1>Payment Successful!</h1>
<p class="sub">Thank you, ${esc(d.clientName)}! Your deposit has been received.</p>
<div class="badge">&#9679; Booking Confirmed</div>
<div class="det">
<div class="row"><span class="lbl">&#128135; Service</span><span class="val">${esc(d.serviceName)}</span></div>
<div class="row"><span class="lbl">&#128197; Date</span><span class="val">${esc(d.date)}</span></div>
<div class="row"><span class="lbl">&#128336; Time</span><span class="val">${esc(d.time)}</span></div>
<div class="row"><span class="lbl">&#128136; Stylist</span><span class="val">${esc(d.stylist)}</span></div>
</div>
<div class="pay">
<div class="ph">&#128179; Payment Summary</div>
<div class="pr"><span>Total Service</span><span>$${esc(d.totalPrice)}</span></div>
<div class="pr"><span>Deposit Paid</span><span class="gr">-$${esc(d.depositPaid)}</span></div>
<div class="pr t"><span>Remaining</span><span>$${esc(d.remaining)}</span></div>
</div>
<p class="info">A confirmation email has been sent. Remaining balance of <b>$${esc(d.remaining)}</b> is due at the salon.</p>
<p class="pw">Powered by <a href="https://voxali.com">Voxali</a></p>
</div></div>
</body>
</html>`;
}

function errorPage(title: string, message: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;background:#0A0A0B;color:#E0E0E0;min-height:100vh;display:flex;align-items:center;justify-content:center}
.c{max-width:520px;width:90%;animation:su .8s cubic-bezier(.16,1,.3,1) both}
@keyframes su{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
.card{background:linear-gradient(145deg,#1A1A1F,#141417);border:1px solid rgba(239,68,68,.15);border-radius:24px;padding:48px 36px;text-align:center;box-shadow:0 25px 80px rgba(0,0,0,.5)}
.ic{width:88px;height:88px;margin:0 auto 28px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#EF4444,#DC2626);box-shadow:0 8px 30px rgba(239,68,68,.3);font-size:42px;animation:si .6s cubic-bezier(.34,1.56,.64,1) .3s both}
@keyframes si{from{transform:scale(0)}to{transform:scale(1)}}
h1{font-size:28px;font-weight:700;color:#FFF;margin-bottom:12px}
p{font-size:15px;color:#999;line-height:1.6}
.pw{font-size:11px;color:#444;margin-top:24px}
.pw a{color:#D4AF37;text-decoration:none}
</style>
</head>
<body>
<div class="c"><div class="card">
<div class="ic">&#10007;</div>
<h1>${esc(title)}</h1>
<p>${esc(message)}</p>
<p class="pw">Powered by <a href="https://voxali.com">Voxali</a></p>
</div></div>
</body>
</html>`;
}
