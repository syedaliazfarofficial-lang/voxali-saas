const fs = require('fs');
const filePath = 'c:/Users/syeda/OneDrive/Desktop/Voxali New/supabase/functions/setup-account/index.ts';
let code = fs.readFileSync(filePath, 'utf8');

const targetStr = `    console.log(\`Auto-provisioning completed for tenant \${tenantId}.\`);`;

if (code.includes(targetStr)) {
    const welcomeEmailInjection = `
    // Step C: Send Welcome Email via Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (RESEND_API_KEY) {
      try {
        const welcomeHtml = \`
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #D4AF37;">Welcome to Voxali, \${fullName}! 🌟</h2>
            <p>Your AI Receptionist for <strong>\${salonName}</strong> is currently being provisioned.</p>
            <p>You can access your dashboard right away to customize your AI agent's voice, knowledge base, and booking rules.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://voxali.net/app/" style="background: #111; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Login to Dashboard</a>
            </div>
            <p>If you have any questions or need help setting up, just reply to this email!</p>
            <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;" />
            <p style="font-size: 12px; color: #888;">&copy; 2026 Voxali AI. All rights reserved.</p>
          </div>
        \`;
        
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': \`Bearer \${RESEND_API_KEY}\`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: "Voxali CEO <noreply@voxali.net>",
            to: [email],
            subject: "Welcome to Voxali! Your AI Agent is Ready 🚀",
            html: welcomeHtml
          })
        });
        console.log(\`Welcome email sent to \${email}\`);
      } catch (emailErr) {
        console.error("Failed to send welcome email:", emailErr);
      }
    }
    
    console.log(\`Auto-provisioning completed for tenant \${tenantId}.\`);`;

    code = code.replace(targetStr, welcomeEmailInjection);
    fs.writeFileSync(filePath, code, 'utf8');
    console.log('setup-account welcome email added.');
} else {
    console.log('Could not find target string for welcome email injection.');
}
