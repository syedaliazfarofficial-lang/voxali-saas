const fs = require('fs');
const path = require('path');

const targetPage = path.join(__dirname, 'pricing.html');
let html = fs.readFileSync(targetPage, 'utf8');

const regex = /async function startCheckout\([\s\S]*?\}\s*\n\s*\}/;

const newScript = `async function startCheckout(planId) {
            const loader = document.getElementById('checkout-loader');
            loader.classList.add('active');

            try {
                // DEMO API: Simulating a background API request to Stripe
                await new Promise(r => setTimeout(r, 1500));
                
                console.log('Demo API: Generated checkout session for ' + planId);

                // Redirecting directly to the successful payment simulated endpoint
                // In production, your real API will return a data.url (Stripe Checkout Session URL)
                const dummyUrl = '/payment-success.html?session_id=demo_test_123&plan=' + planId;
                
                window.location.href = dummyUrl;

            } catch (err) {
                console.error(err);
                alert('Network error connecting to payment gateway.');
                loader.classList.remove('active');
            }
        }`;

if (!html.match(regex)) {
    console.log("Could not find startCheckout function to replace.");
    process.exit(1);
}

const updatedHtml = html.replace(regex, newScript);
fs.writeFileSync(targetPage, updatedHtml, 'utf8');
console.log("Injected Demo API logic.");
