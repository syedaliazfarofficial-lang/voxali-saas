const fs = require('fs');

let html = fs.readFileSync('book.html', 'utf8');

// Replace standard variables
html = html.replace("const TENANT_ID = params.get('tenant_id');", `// Extract slug from path like /book/pak-salon
        const pathParts = window.location.pathname.split('/');
        const SLUG = pathParts[pathParts.length - 1] || tempSlug;`);
        
html = html.replace("const params = new URLSearchParams(window.location.search);", "const tempSlug = new URLSearchParams(window.location.search).get('salon');");

// Let's replace 'TENANT_ID' with 'SLUG' in the script wherever it's used to fetch data
html = html.replace(/TENANT_ID/g, 'SLUG');
html = html.replace(/\?tenant_id=/g, '?slug=');
html = html.replace(/&tenant_id=/g, '&slug=');
html = html.replace(/tenant_id:/g, 'slug:'); // for body payload JSON

// Also update the Edge Function call
html = html.replace("const API_URL = SUPABASE_URL + '/functions/v1/online-booking';", "const API_URL = SUPABASE_URL + '/functions/v1/online-booking';\n        let realTenantId = null;");

// Update the Init to capture the real tenant_id returned from API so further calls to create_booking succeed
html = html.replace("SERVICES = data.services || [];", "SERVICES = data.services || [];\n                realTenantId = data.tenant.id;");

// Fix the fetch request in submitBooking
html = html.replace("slug: SLUG,", "tenant_id: realTenantId,");

fs.writeFileSync('public/booking.html', html);
console.log("Updated public/booking.html with SLUG logic!");
