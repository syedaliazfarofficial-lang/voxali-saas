const fs = require('fs');
let b = fs.readFileSync('public/booking-page/index.html', 'utf8');

// The first patch succeeded earlier, let's verify if submitBooking patch is missing
if (b.includes("btn.innerHTML = '<span class=\"loading-btn\"></span> Redirecting to Secure Payment';")) {
    console.log("Already patched submitBooking");
} else {
    // We need to inject the payment_url redirect
    // Find: if (data.success) { \n var msg = 'Your appointment
    const target = /if\s*\(data\.success\)\s*\{\s*var\s*msg\s*=\s*'Your appointment/m;
    const replacement = `if (data.success) {
                    if (data.payment_url) {
                        btn.innerHTML = '<span class="loading-btn"></span> Redirecting to Secure Payment...';
                        window.location.href = data.payment_url;
                        return;
                    }

                    var msg = 'Your appointment`;
    
    b = b.replace(target, replacement);

    // Now remove the pay-btn-wrapper code
    const target2 = /document\.getElementById\('success-msg'\)\.innerHTML\s*=\s*msg;.*?goStep\(4\);/s;
    const replacement2 = `document.getElementById('success-msg').innerHTML = msg;
                    document.getElementById('pay-btn-wrapper').style.display = 'none';

                    goStep(4);`;
    
    b = b.replace(target2, replacement2);
    
    fs.writeFileSync('public/booking-page/index.html', b);
    console.log("Patched successfully!");
}
