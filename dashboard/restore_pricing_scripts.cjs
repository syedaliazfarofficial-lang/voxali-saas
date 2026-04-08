const fs = require('fs');
const path = require('path');

let pricingHtml = fs.readFileSync(path.join(__dirname, 'pricing.html'), 'utf8');

const missingCss = `
    <style>
        #checkout-loader {
            display: none;
        }
        #checkout-loader.active {
            display: flex;
        }
    </style>
`;

const missingScript = `
    <!-- CHECKOUT SCRIPT -->
    <script>
        async function startCheckout(planId) {
            const loader = document.getElementById('checkout-loader');
            loader.classList.add('active');

            try {
                // Determine origin dynamically based on current host
                // If running locally, it might be localhost:3000, if deployed it's voxali.net
                // Let's use the full relative path
                const res = await fetch('https://voxali.net/api/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ priceId: planId })
                });

                if (!res.ok) {
                    throw new Error('Failed to create checkout session');
                }

                const data = await res.json();
                if (data.url) {
                    window.location.href = data.url;
                } else {
                    alert('Checkout unavailable. Please try again.');
                    loader.classList.remove('active');
                }
            } catch (err) {
                console.error(err);
                alert('Network error connecting to payment gateway. Please try again.');
                loader.classList.remove('active');
            }
        }
    </script>
`;

// Insert missing CSS right before </head> if it's not already there
if (!pricingHtml.includes('#checkout-loader.active')) {
    pricingHtml = pricingHtml.replace('</head>', missingCss + '</head>');
}

// Insert missing script right before </body> if it's not already there
if (!pricingHtml.includes('async function startCheckout(planId)')) {
    pricingHtml = pricingHtml.replace('</body>\n</html>', missingScript + '</body>\n</html>');
}

// Just in case I ended up with duplicate body/html tags at the end of the file from multiple layouts...
// Actually I generated a clean string during apply_pricing_fixes.cjs so that's fine.

fs.writeFileSync(path.join(__dirname, 'pricing.html'), pricingHtml, 'utf8');
console.log('Restored the checkout loader CSS and Javascript logic.');
