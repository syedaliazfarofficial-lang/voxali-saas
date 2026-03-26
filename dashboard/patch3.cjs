const fs = require('fs');
let b = fs.readFileSync('public/booking-page/index.html', 'utf8');

// The first patch succeeded earlier, let's target the exact string missing.
// Target 1: Inject the payment redirect
const findTarget = "if (data.success) {\r\n                    var msg = 'Your appointment for <strong>'";
const findTargetLF = "if (data.success) {\n                    var msg = 'Your appointment for <strong>'";

let idx = b.indexOf(findTarget);
let length = findTarget.length;
if (idx === -1) {
    idx = b.indexOf(findTargetLF);
    length = findTargetLF.length;
}

if (idx !== -1) {
    console.log("Found submit booking block. Injecting redirect.");
    const replacement = `if (data.success) {
                    if (data.payment_url) {
                        btn.innerHTML = '<span class="loading-btn"></span> Redirecting to Secure Payment...';
                        window.location.href = data.payment_url;
                        return;
                    }

                    var msg = 'Your appointment for <strong>'`;
    b = b.substring(0, idx) + replacement + b.substring(idx + length);

    // Now remove the pay-btn-wrapper entirely
    const btnTarget = "document.getElementById('success-msg').innerHTML = msg;\r\n\r\n                    if (data.payment_url) {";
    const btnTargetLF = "document.getElementById('success-msg').innerHTML = msg;\n\n                    if (data.payment_url) {";
    
    let btnIdx = b.indexOf(btnTarget);
    if (btnIdx === -1) btnIdx = b.indexOf(btnTargetLF);
    
    if (btnIdx !== -1) {
        console.log("Found button wrapper code. Removing it.");
        const endGoStep = "                    goStep(4);";
        let endIdx = b.indexOf(endGoStep, btnIdx);
        if (endIdx !== -1) {
             const replacement2 = `document.getElementById('success-msg').innerHTML = msg;\n                    document.getElementById('pay-btn-wrapper').style.display = 'none';\n\n`;
             b = b.substring(0, btnIdx) + replacement2 + b.substring(endIdx);
             fs.writeFileSync('public/booking-page/index.html', b);
             console.log("Write successful!");
        } else {
             console.log("Could not find the end goStep block.");
        }
    } else {
        console.log("Could not find the button wrapper code to remove.");
    }
} else {
    // Maybe it's already patched?
    if (b.includes("Redirecting to Secure Payment")) {
        console.log("It appears to already be patched!");
    } else {
        console.log("Failed to find target block to patch!");
    }
}
