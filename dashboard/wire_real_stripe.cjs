const fs = require('fs');
const path = require('path');

const targetPage = path.join(__dirname, 'pricing.html');
let html = fs.readFileSync(targetPage, 'utf8');

// Update button handlers
html = html.replace(/startCheckout\('price_basic'\)/g, "startCheckout('basic')");
html = html.replace(/startCheckout\('price_ai_starter'\)/g, "startCheckout('starter')");
html = html.replace(/startCheckout\('price_ai_growth'\)/g, "startCheckout('growth')");

// Replace the startCheckout function
const scriptRegex = /async function startCheckout\([\s\S]*?\}\s*\n\s*\}/;

const newScript = `async function startCheckout(planCode) {
            const loader = document.getElementById('checkout-loader');
            loader.classList.add('active');

            try {
                // Call Supabase Edge Function to generate Stripe Checkout Session
                const res = await fetch('https://kngqjuzomvttgukrsqys.supabase.co/functions/v1/create-checkout-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ plan: planCode })
                });

                if (!res.ok) {
                    const errorResponse = await res.json().catch(() => ({}));
                    throw new Error(errorResponse.error || 'Failed to initialize payment gateway');
                }

                const data = await res.json();
                
                if (data.checkout_url) {
                    // Take the user straight to Stripe Checkout securely
                    window.location.href = data.checkout_url;
                } else {
                    throw new Error('No checkout URL from gateway');
                }

            } catch (err) {
                console.error(err);
                alert('Stripe error: ' + err.message);
                loader.classList.remove('active');
            }
        }`;

if (!html.match(scriptRegex)) {
    console.log("Could not find startCheckout function to replace.", scriptRegex);
    process.exit(1);
}

const updatedHtml = html.replace(scriptRegex, newScript);
fs.writeFileSync(targetPage, updatedHtml, 'utf8');
console.log("Wired real Supabase Edge Function for Stripe Checkout.");
