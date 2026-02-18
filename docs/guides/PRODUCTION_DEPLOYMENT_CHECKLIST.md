# Production Deployment Checklist

> **Purpose:** Step-by-step guide to take Voxali/Luxe Aurea from test mode to live production.

---

## 🔴 CRITICAL — Must Do Before Going Live

### 1. Stripe: Switch to Live Mode

- [ ] Go to [Stripe Dashboard](https://dashboard.stripe.com) → Click **"Switch to live account"**
- [ ] Get **Live API keys** (Publishable + Secret key)
- [ ] Update `tools_create_payment_link.json` → Replace test secret key with live secret key in:
  - "Create Stripe Checkout" node → Header Authorization
  - "Check Existing Link" node (if applicable)
- [ ] Update `stripe_payment_webhook.json` → Replace test secret key with live secret key
- [ ] **Create live webhook endpoint** in Stripe Dashboard:
  - URL: `https://ali-n8n.mywire.org/webhook/stripe/payment` (or your production domain)
  - Event: `checkout.session.completed`
  - Copy the new **Webhook Signing Secret** (`whsec_live_...`)

### 2. Resend: Verify Your Domain

- [ ] Go to [resend.com/domains](https://resend.com/domains)
- [ ] Add your domain (e.g., `luxe-aurea.com`)
- [ ] Add the DNS records (MX, DKIM, SPF) to your domain registrar
- [ ] Wait for verification (usually 5-30 minutes)
- [ ] Update `notifications_send.json` → Change `from` address:

  ```diff
  - "from": "Luxe Aurea <onboarding@resend.dev>"
  + "from": "Luxe Aurea <noreply@luxe-aurea.com>"
  ```

- [ ] Update `notifications_send.json` → Change `to` address back to dynamic:

  ```diff
  - "to": ["syedaliazfarofficial@gmail.com"]
  + "to": ["{{ $json.clientEmail }}"]
  ```

### 3. Security: Move API Keys to Environment Variables

Currently hardcoded keys in workflows:

| Key | Current Location | Move To |
|-----|-----------------|---------|
| Stripe Secret Key | `tools_create_payment_link.json` node headers | n8n Credentials or ENV |
| Stripe Secret Key | `stripe_payment_webhook.json` node headers | n8n Credentials or ENV |
| Resend API Key | `notifications_send.json` node headers | n8n Credentials or ENV |
| Twilio Auth Token | `notifications_send.json` node headers | n8n Credentials or ENV |
| Supabase Service Key | All workflow node headers | n8n Credentials or ENV |

**How to use n8n Credentials:**

1. In n8n → Settings → Credentials → Add New
2. Choose "Header Auth" or "HTTP Basic Auth"
3. Enter your API key
4. Reference in workflow nodes instead of hardcoding

**OR use n8n Environment Variables:**

1. Add to your n8n `.env` file or Docker environment:

   ```env
   STRIPE_SECRET_KEY=sk_live_xxxxx
   RESEND_API_KEY=re_xxxxx
   TWILIO_AUTH_TOKEN=xxxxx
   SUPABASE_SERVICE_KEY=xxxxx
   ```

2. Reference in workflows: `{{ $env.STRIPE_SECRET_KEY }}`

---

## 🟡 IMPORTANT — Should Do Before Going Live

### 4. Update Success/Cancel URLs

- [ ] Update `tools_create_payment_link.json` → "Create Stripe Checkout" node:

  ```diff
  - "success_url": "https://luxe-aurea.com/payment-success"
  - "cancel_url": "https://luxe-aurea.com/payment-cancel"
  + "success_url": "https://your-actual-domain.com/payment-success"
  + "cancel_url": "https://your-actual-domain.com/payment-cancel"
  ```

### 5. Webhook Signature Verification

- [ ] Add Stripe webhook signature verification to `stripe_payment_webhook.json`
- This prevents fake/spoofed webhook calls
- Use Stripe's `whsec_` signing secret to verify each incoming request
- Add a Code node at the start of webhook processing:

  ```javascript
  const crypto = require('crypto');
  const payload = $input.first().json.rawBody;
  const sig = $input.first().json.headers['stripe-signature'];
  const secret = 'whsec_your_signing_secret';
  // Verify signature before processing
  ```

### 6. n8n Production Hosting

- [ ] Ensure n8n is on a stable, always-on server (not local/mywire.org)
- [ ] Use HTTPS with valid SSL certificate
- [ ] Set up monitoring/alerting for workflow failures
- [ ] Consider n8n Cloud or a VPS with Docker

### 7. Set Up Payment Amounts Dynamically

- [ ] Currently defaults to $50 for new payments
- [ ] Update to fetch amount from service/appointment type
- [ ] Consider different prices for different services

---

## 🟢 NICE TO HAVE — Post-Launch

### 8. Payment Receipts

- [ ] Send Stripe receipt automatically (Stripe Dashboard → Settings → Emails)
- [ ] Or create custom receipt email template

### 9. Refund Handling

- [ ] Create workflow for `charge.refunded` webhook event
- [ ] Update payment status to `refunded`
- [ ] Send refund notification email/SMS

### 10. Payment Analytics

- [ ] Track payment success/failure rates
- [ ] Dashboard for daily/weekly revenue
- [ ] Failed payment retry logic

### 11. Multiple Payment Methods

- [ ] Enable Apple Pay / Google Pay in Stripe Dashboard
- [ ] Enable bank transfers if needed
- [ ] Consider installment payments

---

## Quick Reference: File Locations

| File | Purpose |
|------|---------|
| `n8n-workflows/tools_create_payment_link.json` | Creates Stripe checkout links |
| `n8n-workflows/stripe_payment_webhook.json` | Handles Stripe payment confirmations |
| `n8n-workflows/notifications_send.json` | Sends SMS + Email notifications |
| `docs/credentials/stripe-credentials.md` | Stripe API keys reference |
| `docs/guides/STRIPE_PAYMENT_FLOW.md` | Payment flow documentation |

---

## Testing Checklist (Run Before Each Deployment)

- [ ] Create a test booking with `pending_payment` status
- [ ] Call `create_payment_link` endpoint
- [ ] Verify payment record created in DB
- [ ] Open Stripe checkout link
- [ ] Complete payment with test card `4242 4242 4242 4242`
- [ ] Verify webhook fires (check n8n executions)
- [ ] Verify payment status → `completed`
- [ ] Verify booking status → `confirmed`
- [ ] Verify SMS received
- [ ] Verify email received with premium template
