const fs = require('fs');
let b = fs.readFileSync('public/booking-page/index.html', 'utf8');

// Patch 1: init() success bypass
const search1 = "                // Fetch all data from Edge Function (uses service role key, bypasses RLS)\r\n                var res = await fetch";
const replace1 = `                // Check if returning from Stripe
                if (new URLSearchParams(window.location.search).get('success') === 'true') {
                    document.getElementById('salon-name').textContent = SLUG || 'Salon';
                    document.getElementById('loading-state').style.display = 'none';
                    document.getElementById('booking-flow').style.display = 'block';
                    document.getElementById('success-msg').innerHTML = '✅ Your secure payment was successful. Your appointment is fully confirmed!<br><br>Thank you for your booking.';
                    goStep(4);
                    return;
                }

                // Fetch all data from Edge Function (uses service role key, bypasses RLS)
                var res = await fetch`;
b = b.replace(search1, replace1);

// Patch 2: submitBooking() immediate redirect
const search2 = "                if (data.success) {\r\n                    var msg = 'Your appointment for <strong>'";
const replace2 = `                if (data.success) {
                    if (data.payment_url) {
                        btn.innerHTML = '<span class="loading-btn"></span> Redirecting to Secure Payment...';
                        window.location.href = data.payment_url;
                        return;
                    }

                    var msg = 'Your appointment for <strong>'`;
b = b.replace(search2, replace2);

fs.writeFileSync('public/booking-page/index.html', b);
console.log('Successfully patched index.html');
