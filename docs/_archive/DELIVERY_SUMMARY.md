# Luxe Aurea AI Salon - Final Delivery Package

## 📦 Complete File Structure

```
Voxali New/
├── n8n-workflows/ (10 files)
│   ├── tools_check_availability.json
│   ├── tools_create_booking.json
│   ├── tools_cancel_booking.json
│   ├── tools_reschedule_booking.json
│   ├── tools_create_payment_link.json
│   ├── tools_mark_manual_payment.json
│   ├── tools_add_to_waitlist.json
│   ├── stripe_payment_webhook.json
│   ├── notifications_send.json
│   └── cron_release_expired_holds.json
│
├── dashboard/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── .env.example
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── index.css
│       ├── lib/supabase.js
│       ├── components/Layout.jsx
│       └── pages/
│           ├── Login.jsx
│           ├── Dashboard.jsx
│           ├── Bookings.jsx
│           ├── Services.jsx
│           ├── Staff.jsx
│           ├── Payments.jsx
│           └── Settings.jsx
│
├── elevenlabs/
│   └── bella_agent_config.md
│
└── docs/
    ├── config.md
    ├── api-contracts.md
    ├── n8n-credentials-setup.md
    └── sql-migration-production.sql
```

---

## ✅ Security Confirmations

### 1. Stripe Webhook Signature Verification
**Status: ✅ IMPLEMENTED**

Location: `stripe_payment_webhook.json` → "Parse Stripe Event" node

```javascript
// Verifies signature using HMAC-SHA256
const crypto = require('crypto');
const webhookSecret = $env.STRIPE_WEBHOOK_SECRET;
// Computes and compares signature
```

### 2. Tool Webhook Protection (X-TOOLS-KEY)
**Status: ✅ DOCUMENTED**

All tool webhooks should validate header `X-TOOLS-KEY` from ElevenLabs.

Configure in ElevenLabs:
- Add custom header to each tool: `X-TOOLS-KEY: your-secret`

Generate secret:
```bash
openssl rand -hex 32
```

---

## ✅ Timezone Confirmations

| Component | Timezone Handling |
|-----------|-------------------|
| `check_availability` | Uses `tenant_hours` day-wise times, converts via tenant timezone |
| `create_booking` | Stores `start_at/end_at` in ISO UTC format |
| Slot generation | Uses `America/Chicago` (configurable) for local time display |
| Dashboard | Displays in browser's local timezone |

---

## 🧪 Testing Procedures

### Test 1: check_availability
```bash
curl -X POST "https://ali-n8n.mywire.org/webhook/tools/check_availability" \
  -H "Content-Type: application/json" \
  -H "X-TOOLS-KEY: your-secret" \
  -d '{"date":"2026-01-28","service_ids":["1011e7f1-c940-424e-be86-93d7636c2c24"]}'
```

**Expected:** 2-3 valid slots respecting:
- tenant_hours (day-wise)
- staff_working_hours
- staff_timeoff
- existing booking conflicts

### Test 2: create_booking
```bash
curl -X POST "https://ali-n8n.mywire.org/webhook/tools/create_booking" \
  -H "Content-Type: application/json" \
  -H "X-TOOLS-KEY: your-secret" \
  -d '{
    "client": {"full_name":"Test Client","phone":"+1234567890"},
    "service_ids": ["1011e7f1-c940-424e-be86-93d7636c2c24"],
    "staff_id": "staff-uuid-here",
    "start_at": "2026-01-28T10:00:00-06:00"
  }'
```

**Expected inserts:**
- `clients` table (new or existing)
- `bookings` table (with hold_expires_at if deposit)
- `booking_items` table (price snapshots)
- `payments` table (if deposit required)

### Test 3: cron_release_expired_holds

1. Create a booking with deposit (status=pending_payment)
2. Wait 15+ minutes without paying
3. Verify booking status changes to `cancelled`
4. Verify waitlist clients get notified

### Test 4: stripe_payment_webhook

1. Complete Stripe test payment
2. Verify booking status → `confirmed`
3. Verify payment status → `paid`
4. Verify SMS/email notification sent

### Test 5: Dashboard Role Access

**Owner login:**
- Sees all menu items (Services, Staff, Payments, Settings)
- Sees all bookings from all staff

**Staff login:**
- Sees only Dashboard + Bookings
- Sees only their own bookings (via RLS)

---

## 📋 Deployment Checklist

1. [ ] Run `sql-migration-production.sql` in Supabase
2. [ ] Import all 10 n8n workflows
3. [ ] Configure n8n credentials (Supabase, Stripe, Twilio, Resend)
4. [ ] Set environment variables (TOOLS_SECRET_KEY, STRIPE_WEBHOOK_SECRET)
5. [ ] Activate all workflows (especially cron_release_expired_holds)
6. [ ] Configure Stripe webhook endpoint
7. [ ] Update ElevenLabs agent with new tools + X-TOOLS-KEY header
8. [ ] Copy Bella system prompt to ElevenLabs
9. [ ] Install dashboard: `cd dashboard && npm install`
10. [ ] Create `.env` from `.env.example`
11. [ ] Test locally: `npm run dev`
12. [ ] Deploy to Vercel

---

## 🔗 Ready for Twilio + ElevenLabs Integration

Once all tests pass, proceed with:
1. Configure Twilio Incoming Number → ElevenLabs
2. Set ElevenLabs webhook URLs to n8n endpoints
3. Add X-TOOLS-KEY header to all ElevenLabs tools
4. Go live!
