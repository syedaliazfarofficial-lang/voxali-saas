# 🤖 AI HANDOVER — Voxali SaaS Project

> **Date:** March 3, 2026 | **Status:** Removing n8n completely — ALL tools → Edge Functions | **3 Salons tested ✅**

## Project Summary

**Voxali** = Multi-tenant SaaS for salon booking with AI phone receptionist.
Unique selling point: **Voice-first AI + Full Salon Management** at $29-99/mo — no competitor offers both.

| Component | Tech | URL/Details |
|-----------|------|-------------|
| Dashboard | React + Vite + TailwindCSS | localhost:5173 |
| Database | Supabase (PostgreSQL + RLS) | sjzxgjimbcoqsylrglkm.supabase.co |
| Workflows | ~~n8n~~ → Supabase Edge Functions (ALL tools) | Serverless, auto-scale |
| AI Agent | ElevenLabs Conversational AI (Aria) | 3 agents (1 per salon) |
| SMS/Email | Twilio + Resend | Edge Function `send-notification` |
| Payments | Stripe Connect (Express) | Deposit links + salon direct payout |

## Architecture

### Architecture (n8n REMOVED — ALL Edge Functions)

```
Customer calls → ElevenLabs (Aria) → Supabase Edge Functions (serverless)
                                          ↑                     ↓ (< 500ms)
                               tenant_id via URL      Connection Pooler (port 6543)
                                                             ↓
                                                     PostgreSQL DB
                                                             ↓
                                               SQL Trigger → notification_queue
                                                             ↓
                                               send-notification Edge Function
**n8n:** Completely removed. ALL tools on Edge Functions including create_booking + create_payment_link.
```

## Active Tenants

| Salon | tenant_id | Timezone | Status |
|-------|-----------|----------|--------|
| Golden Glam Studio | `527f8f35-72f0-4818-b514-ad7695cd076a` | Central (Chicago) | ✅ Tested |
| Royal Shine Beauty | `67244f82-65ae-44cf-8ca8-63017b60789d` | Eastern (New York) | ✅ Tested |
| Velvet Rose Studio | `8c4b876b-3a51-406c-99a8-d954ba9329ab` | Pacific (Los Angeles) | ✅ Tested |

---

## 🔄 ALL TOOLS — Edge Functions (n8n removed)

| Tool | Status | Complexity |
|------|--------|------------|
| `get-salon-info` | ⏳ Pending | Simple read |
| `list-services` | ⏳ Pending | Simple read |
| `list-staff` | ⏳ Pending | Simple read |
| `check-availability` | ⏳ Pending | RPC call |
| `cancel-booking` | ⏳ Pending | Read + Update |
| `reschedule-booking` | ⏳ Pending | Read + Check + Update |
| `add-to-waitlist` | ⏳ Pending | Simple insert |
| `create-booking` | ⏳ Pending | Complex (client + booking + Stripe) |
| `create-payment-link` | ⏳ Pending | Stripe API call |

**Auth header:** `X-TOOLS-KEY: LUXE-AUREA-SECRET-2026`
**Key:** tenant_id passed via URL query param: `?tenant_id=XXXX`

---

## 🔧 Key SQL Functions & Triggers

| Function/Trigger | Purpose |
|------------------|---------|
| `fn_auto_create_default_services` | Auto-creates 25 services (OFF) for new tenants |
| `fn_auto_create_default_hours` | Auto-creates default business hours for new tenants |
| `fn_queue_booking_notification` | Queues email/SMS on INSERT + any status change (cancelled, completed, etc.) |
| `get_available_slots` | Returns available time slots from `tenant_hours` + existing bookings |
| `get_active_booking` | ⚠️ NEEDS FIX: `s.name` → `st.full_name` (SQL file ready: `FIX_GET_ACTIVE_BOOKING.sql`) |
| `create_booking_safe` | Creates booking with `start_time`/`end_time` columns |
| `rpc_create_tenant_and_owner` | Creates tenant + auth user + profile in one call |

### ⚠️ Critical Column Names

- Bookings table: `start_time` / `end_time` (NOT `start_at` / `end_at`)
- Staff table: `full_name` (NOT `name`)
- Services table: `name` ✅

---

## 📧 Notification System (SQL Trigger → Edge Function)

Notifications go through **SQL trigger**, NOT n8n. The trigger `fn_queue_booking_notification` fires on:

- `INSERT` → event = `booking_created`
- `UPDATE` where status changed → event = `booking_` + new_status (e.g., `booking_cancelled`, `booking_completed`)

**Requirement:** `tenants.notifications_enabled = true` must be set.

| # | Email | Trigger | Template |
|---|-------|---------|----------|
| 1 | **Booking Created** | SQL trigger on INSERT | Pay Now button + booking details |
| 2 | **Deposit Received** | Stripe webhook → notification_queue | Green ✅ banner + payment summary |
| 3 | **Booking Cancelled** | SQL trigger on status → cancelled | Cancellation confirmation |
| 4 | **Booking Rescheduled** | SQL trigger on time change | New date/time details |
| 5 | **Thank You** | SQL trigger on status → completed | ⭐ Google Review button |

---

## 💳 Payment Architecture — Stripe Connect

| Item | Detail |
|------|--------|
| Model | Stripe Connect **Express** |
| Flow | Customer pays → Money goes to **salon's Stripe account** directly |
| Commission | Voxali takes 3% platform fee (auto-deducted by Stripe) |
| Voxali Account | Platform account (owns Connect setup) |
| Salon Account | Express connected account (salon's own bank) |
| Refund Policy | Configurable per tenant: cancellation window, partial/full refund |

### Refund Settings (per tenant)

```
cancellation_window_hours: 24 (default)
late_cancel_refund_percent: 50 (default)
no_show_refund_percent: 0 (default)
payment_link_expiry_minutes: 15 (configurable by owner)
```

---

## 💰 SaaS Pricing Plans

| | Starter | Pro | Business |
|---|---|---|---|
| **Price** | $49/mo | $99/mo | $199/mo |
| **AI Minutes** | 100 min (~33 calls) | 250 min (~83 calls) | 600 min (~200 calls) |
| **Staff Limit** | 2 | 5 | Unlimited |
| **Extra Minutes** | $0.30/min | $0.25/min | $0.20/min |
| **AI Voice** | ✅ | ✅ | ✅ |
| **Online Booking** | ✅ | ✅ | ✅ |
| **Dashboard** | ✅ | ✅ | ✅ |
| **Notifications** | ✅ | ✅ | ✅ |
| **Deposits** | ✅ | ✅ | ✅ |
| **Analytics** | Basic | Advanced | Advanced |
| **Custom Branding** | ❌ | ✅ | ✅ |
| **Marketing Tools** | ❌ | ❌ | ✅ |
| **Priority Support** | ❌ | ❌ | ✅ |
| **30-day Money Back** | ✅ | ✅ | ✅ |

**Revenue Streams:** Monthly subscription + 3% transaction commission + overage charges

### Plan Enforcement (Database)

```
tenants: plan (starter/pro/business), ai_minutes_limit (100/250/600),
         ai_minutes_used (reset monthly), max_staff (2/5/999),
         stripe_account_id, platform_fee_percent (0 for Phase 1)
```

---

## 📊 Dashboard Features

### BookingsCalendar.tsx

- Smart payment badges: Pending Deposit → $15 Paid → $40 Due → Completed
- Status flow: `pending_deposit` → `confirmed` → `checked_in` → `completed`
- **Cancelled bookings visible** with dimmed opacity + line-through + CANCELLED badge
- Walk-in badge, AM/PM format, timezone conversion
- Day/Week/Month navigation

### Settings.tsx

- **Services tab**: Category accordion + search + ALL ON / ALL OFF toggle
- **Availability tab**: Per-day business hours saved to `tenant_hours`
- **Timezone**: Dropdown with live current time display
- **Integrations**: Google Review link, Stripe keys

---

## ⚠️ Known Issues & Pending Fixes

1. **`get_active_booking` RPC broken** — `s.name` column doesn't exist. Fix: Run `FIX_GET_ACTIVE_BOOKING.sql` (DROP old function first)
2. **AI time selection** — Sometimes picks first available instead of requested time. Fix: Prompt refinement needed.
3. **Cancel/Reschedule PATCH columns** — Fixed in JSON: `start_at`→`start_time`, `end_at`→`end_time`. Re-import workflows to n8n.
4. **notifications_enabled** — Must be `true` for email/SMS. Run: `UPDATE tenants SET notifications_enabled = true;`

---

## ⬜ Phase 1 — Launch Ready (Priority Order)

1. [ ] **Edge Functions migration** — 7 tools from n8n to Supabase Edge Functions
2. [ ] **Fix `get_active_booking`** — SQL function column name fix
3. [ ] **AI Human Handoff** — SMS alert to owner when AI can't handle call
4. [ ] **Online Booking Page** — `booking.voxali.com/salon-name`
5. [ ] **Auto Reminders** — 24hr before appointment SMS/email
6. [ ] **Payment Link Expiry** — Configurable timer, auto-cancel option
7. [ ] **Stripe Connect** — Each salon's own Stripe account, direct payouts
8. [ ] **CSV Import** — Clients/services import for migration
9. [ ] **Privacy Policy + Terms** — Legal documents for launch
10. [ ] **SMS Opt-in/Opt-out** — A2P compliance for US
11. [ ] **5 Key Dashboard Metrics** — Utilization, no-shows, revenue, bookings, AI calls
12. [ ] **Pilot with 5 salons** — Test + collect case studies

## ⬜ Phase 2 — Growth (Month 3-4)

- [ ] WhatsApp AI booking
- [ ] Google Calendar sync
- [ ] Client CRM (notes, tags, history)
- [ ] Commission tracking
- [ ] Promo codes / discounts
- [ ] Service-to-staff eligibility rules

## ⬜ Phase 3 — Premium (Month 5-8)

- [ ] POS system
- [ ] Loyalty program + memberships
- [ ] Website builder for salons
- [ ] Gift cards
- [ ] Multi-currency + tax support
- [ ] Mobile app (owner)

## ⬜ Phase 4 — Enterprise (Month 9-12)

- [ ] Multi-location management
- [ ] Client mobile app + marketplace
- [ ] Franchise mode
- [ ] API access
- [ ] Hardware integration (receipt printer)
