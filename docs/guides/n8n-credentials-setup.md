# n8n Credentials Setup Guide

## Required Credentials

### 1. Supabase API Key (HTTP Header Auth)
**Name:** `Supabase API Key`  
**Type:** HTTP Header Auth

| Field | Value |
|-------|-------|
| Header Name | `apikey` |
| Header Value | Your Supabase anon key (starts with `eyJ...`) |

Also add second credential OR use environment variable for:
- Header Name: `Authorization`
- Header Value: `Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY`

> Find keys in: Supabase Dashboard → Settings → API → Project API keys

---

### 2. Stripe API Key (HTTP Header Auth)
**Name:** `Stripe API Key`  
**Type:** HTTP Header Auth

| Field | Value |
|-------|-------|
| Header Name | `Authorization` |
| Header Value | `Bearer sk_test_XXXXX` |

> Get from: Stripe Dashboard → Developers → API keys

---

### 3. Twilio Basic Auth (HTTP Basic Auth)
**Name:** `Twilio Basic Auth`  
**Type:** HTTP Basic Auth

| Field | Value |
|-------|-------|
| Username | Your Twilio Account SID (starts with `AC...`) |
| Password | Your Twilio Auth Token |

> Find in: Twilio Console → Account Dashboard

---

### 4. Resend API Key (HTTP Header Auth)
**Name:** `Resend API Key`  
**Type:** HTTP Header Auth

| Field | Value |
|-------|-------|
| Header Name | `Authorization` |
| Header Value | `Bearer re_XXXXX` |

> Get from: Resend Dashboard → API Keys

---

## Webhook Security (X-TOOLS-KEY)

All tool webhooks are protected with a shared secret header to prevent unauthorized access.

### Generate Secret Key
```bash
openssl rand -hex 32
```

### Configure in n8n
Add to n8n Settings → Variables:
```
TOOLS_SECRET_KEY=your-generated-key-here
```

### ElevenLabs Configuration
When adding tools in ElevenLabs, add custom header to each:
- Header: `X-TOOLS-KEY`
- Value: `your-generated-key-here`

---

## Environment Variables

Set these in n8n Settings → Variables:

```
SUPABASE_URL=https://sjzxgjimbcoqsylrglkm.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

STRIPE_SECRET_KEY=sk_test_XXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXX

TWILIO_ACCOUNT_SID=ACXXXXX
TWILIO_AUTH_TOKEN=XXXXX
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX

RESEND_API_KEY=re_XXXXX

TOOLS_SECRET_KEY=your-secret-here
TENANT_TIMEZONE=America/Chicago
```

---

## Workflow Import Steps

1. Open n8n at `https://ali-n8n.mywire.org/`
2. Go to **Workflows** → **Import from File**
3. Import each JSON file from `n8n-workflows/` folder:
   - `tools_list_services.json`
   - `tools_list_staff.json`
   - `tools_check_availability.json`
   - `tools_create_booking.json`
   - `tools_cancel_booking.json`
   - `tools_reschedule_booking.json`
   - `tools_create_payment_link.json`
   - `tools_mark_manual_payment.json`
   - `tools_add_to_waitlist.json`
   - `stripe_payment_webhook.json`
   - `notifications_send.json`
   - `cron_release_expired_holds.json` ⚠️ **Schedule - Always Active**
4. For each workflow:
   - Open workflow settings
   - Update credential references to match your credential names
   - Activate the workflow

---

## Stripe Webhook Setup

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://ali-n8n.mywire.org/webhook/stripe/payment`
3. Select events:
   - `checkout.session.completed`
4. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

**Signature Verification:** The `stripe_payment_webhook` workflow validates signatures using the signing secret.

---

## Timezone Handling

- All times stored in **UTC** in Supabase
- `check_availability` converts to tenant timezone for slot generation
- `create_booking` stores `start_at` and `end_at` in ISO UTC format
- Dashboard displays in browser's local timezone

---

## Testing Checklist

```bash
# Test with security header
curl -X GET "https://ali-n8n.mywire.org/webhook/tools/list_services" \
  -H "X-TOOLS-KEY: your-secret-key"
```

- [ ] `GET /webhook/tools/list_services` returns services
- [ ] `GET /webhook/tools/list_staff` returns active staff
- [ ] `POST /webhook/tools/check_availability` returns 2-3 slots respecting hours
- [ ] `POST /webhook/tools/create_booking` creates booking + items + payment
- [ ] `cron_release_expired_holds` cancels expired pending bookings
- [ ] Stripe webhook confirms booking after payment
- [ ] SMS/Email notifications received
- [ ] Dashboard: owner sees all, staff sees own bookings only
