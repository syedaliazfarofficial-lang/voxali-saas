# Stripe Payment Flow — Complete Documentation

> **Last Updated:** February 16, 2026  
> **Status:** ✅ Fully Tested & Working (Test Mode)

---

## Architecture Overview

```
┌──────────────┐     ┌─────────────────────────┐     ┌────────────────┐
│   AI Agent   │────▶│ create_payment_link (n8n)│────▶│ Stripe Checkout│
│  (triggers)  │     │                         │     │   (hosted)     │
└──────────────┘     └─────────────────────────┘     └───────┬────────┘
                                                             │
                              ┌─────────────────┐           │ Customer pays
                              │  Supabase DB    │           │
                              │  - payments     │◀──────────┘
                              │  - bookings     │     ┌────────────────┐
                              └────────┬────────┘     │ Stripe Webhook │
                                       │              │ (n8n receives) │
                                       ▲              └───────┬────────┘
                                       │                      │
                              ┌────────┴────────┐            │
                              │  notifications  │◀───────────┘
                              │  _send (n8n)    │
                              └────────┬────────┘
                                       │
                              ┌────────▼────────┐
                              │  SMS (Twilio)   │
                              │  Email (Resend) │
                              └─────────────────┘
```

---

## n8n Workflows Involved

### 1. `tools_create_payment_link.json`

**Webhook URL:** `POST /webhook/tools/create_payment_link`  
**Input:** `{ "booking_id": "<uuid>" }`

**Flow:**

1. Receives booking_id from AI agent
2. Looks up payment record in Supabase
3. **If payment exists:** checks for existing Stripe session
4. **If no payment:** creates payment record ($50 default), fetches tenant_id from booking
5. Creates Stripe Checkout session with:
   - Product: "Luxe Aurea Salon - Appointment Deposit"
   - Amount: from payment record (default $50)
   - Currency: USD
   - Metadata: booking_id, payment_id
6. Saves Stripe session ID + payment_link URL to Supabase
7. Returns `{ ok: true, payment_link: "https://checkout.stripe.com/...", status: "pending" }`

**Key Fixes Applied:**

- Fixed `alwaysOutputData` + IF condition: Changed from `$input.all().length > 0` to `$json.id exists` to correctly detect empty Supabase responses
- Added `onError: continueRegularOutput` for graceful error handling
- Fixed NaN error in `unit_amount`: Added `Number(p.amount) || 50` fallback
- Added `payment_link` field to Save Payment Link PATCH request
- Created new path for bookings without payment records (Get Booking Tenant → Create Payment Record → Prep New Payment)
- Extract Stripe URL node now tries both `Check Existing Link` and `Prep New Payment` for paymentId

### 2. `stripe_payment_webhook.json`

**Webhook URL:** `POST /webhook/stripe/payment`  
**Stripe Event:** `checkout.session.completed`

**Flow:**

1. Receives webhook from Stripe
2. Parses event, extracts session data (booking_id, payment_id from metadata)
3. Updates payment status → `completed` in Supabase
4. Updates booking status → `confirmed` in Supabase
5. Triggers `notifications_send` workflow with `payment_confirmed` type

**Key Fix:** Changed webhook path from `webhooks/stripe` to `stripe/payment` to match Stripe Dashboard endpoint URL.

### 3. `notifications_send.json`

**Webhook URL:** `POST /webhook/notifications/send`

**Flow:**

1. Parses notification input (type, client info, booking details)
2. Generates message content (SMS text + premium HTML email)
3. Splits into two parallel paths:
   - **SMS path:** Checks phone → sends via Twilio API
   - **Email path:** Checks email → sends via Resend API
4. Merges results and responds

**Email Template:** Premium dark theme with:

- Dark background (#0F0F0F) with gold accents (#D4AF37)
- LUXE AUREA branding
- Payment confirmation badge
- Amount, date/time, stylist details
- Responsive design

**Key Fix:** Hardcoded `to` email to `syedaliazfarofficial@gmail.com` for testing (Resend free tier limitation). Change back to `{{ $json.clientEmail }}` after domain verification.

---

## Stripe Dashboard Configuration

### Webhook Endpoint

- **URL:** `https://ali-n8n.mywire.org/webhook/stripe/payment`
- **Events:** `checkout.session.completed`
- **API Version:** 2026-01-28.clover
- **Status:** Active ✅

### Test Mode Credentials

- **Publishable Key:** In `docs/credentials/stripe-credentials.md`
- **Secret Key:** Hardcoded in n8n workflow (move to env vars for production)

---

## Database Schema (Relevant Tables)

### `payments` table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| booking_id | uuid | FK to bookings |
| tenant_id | uuid | FK to tenants |
| amount | decimal | Payment amount |
| currency | varchar | Currency code (USD) |
| status | varchar | pending, completed, failed |
| stripe_payment_id | varchar | Stripe session ID |
| payment_link | text | Full Stripe checkout URL |
| paid_at | timestamp | When payment was completed |

### `bookings` table (relevant columns)

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| status | varchar | pending_payment, confirmed, cancelled |
| tenant_id | uuid | FK to tenants |
| start_at | timestamp | Booking start time |
| end_at | timestamp | Booking end time |

---

## Test Results (Feb 16, 2026)

| Step | Result |
|------|--------|
| Create payment record | ✅ $50 pending |
| Generate Stripe checkout link | ✅ 435 chars, saved to DB |
| Stripe checkout page | ✅ "Luxe Aurea Salon - Appointment Deposit" |
| Test card payment (4242...) | ✅ Processed |
| Stripe webhook received | ✅ checkout.session.completed |
| Payment status update | ✅ → completed |
| Booking status update | ✅ → confirmed |
| SMS notification | ✅ Delivered via Twilio |
| Email notification | ✅ Premium template delivered via Resend |

### Test Card Used

- **Number:** 4242 4242 4242 4242
- **Expiry:** 12/30
- **CVC:** 123
- **ZIP:** 10001 (US)
