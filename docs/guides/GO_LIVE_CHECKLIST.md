# ✅ Voxali Go-Live Checklist

> Last updated: 2026-02-16

---

## 1. Workflows (15 total)

| # | Workflow | Active | Error Handler | Status |
|---|----------|--------|---------------|--------|
| 1 | `tools_check_availability` | ✅ | ✅ | Tested |
| 2 | `tools_create_booking` | ✅ | ✅ | Tested (+ Gap Fill + Pay at Salon) |
| 3 | `tools_cancel_booking` | ✅ | ✅ | Tested |
| 4 | `tools_reschedule_booking` | ✅ | ✅ | Tested |
| 5 | `tools_add_to_waitlist` | ✅ | ✅ | Tested |
| 6 | `tools_mark_manual_payment` | ✅ | ✅ | Tested |
| 7 | `tools_create_payment_link` | ✅ | ✅ | Tested |
| 8 | `tools_confirm_booking` | ✅ | ✅ | Tested |
| 9 | `tools_ai_parse_date` | ✅ | ✅ | Tested |
| 10 | `tools_ai_summarize_notes` | ✅ | ✅ | Tested |
| 11 | `tools_ai_polish_sms` | ✅ | ✅ | Tested |
| 12 | `stripe_payment_webhook` | ✅ | ✅ | Setup |
| 13 | `notifications_send` | ✅ | ✅ | Setup |
| 14 | `cron_release_expired_holds` | ✅ | ✅ | Setup |
| 15 | `error_handler` | ✅ | N/A | Tested |

---

## 2. Database Tables

| Table | Has RLS | Status |
|-------|---------|--------|
| `tenants` | ✅ | ✅ |
| `services` | ✅ | ✅ |
| `staff` | ✅ | ✅ |
| `staff_weekly_schedules` | ✅ | ✅ |
| `clients` | ✅ | ✅ |
| `bookings` | ✅ | ✅ |
| `booking_items` | ✅ | ✅ |
| `waitlist` | ✅ | ✅ |
| `error_logs` | ✅ | ✅ |

---

## 3. API Keys & Services

| Service | Status | Notes |
|---------|--------|-------|
| **Supabase** | ✅ Active | Database + Auth |
| **Stripe** | ✅ Configured | Payment links + webhooks |
| **Twilio** | ✅ Active | SMS notifications + alerts |
| **Groq AI** | ✅ Active | Date parsing, notes, SMS polish |
| **AWS SES** | ✅ Configured | Email (SMTP credentials saved) |
| **ElevenLabs** | ⏳ Pending | Voice agent config ready, needs setup |

---

## 4. Features Verified

| Feature | Test Status |
|---------|-------------|
| Multi-tenant isolation (tenant_id) | ✅ All workflows |
| Check availability (SQL function) | ✅ Tested |
| Create booking (standard) | ✅ Tested |
| Create booking (gap filling) | ✅ Tested |
| Create booking (pay at salon) | ✅ Tested |
| Cancel booking | ✅ Tested |
| Reschedule booking | ✅ Tested |
| Stripe payment link | ✅ Tested |
| Manual payment marking | ✅ Tested |
| Waitlist | ✅ Tested |
| AI date parsing | ✅ Tested |
| AI note summarization | ✅ Tested |
| AI SMS polishing | ✅ Tested |
| Owner confirm booking | ✅ Tested |
| Error logging to DB | ✅ Tested |
| Error SMS alert | ✅ Tested (received) |

---

## 5. Pre-Launch Steps

### Must Do ✅

- [x] All workflows have dynamic `tenant_id`
- [x] SQL availability function deployed
- [x] Groq API key configured
- [x] Stripe webhook configured
- [x] Error notifications active (SMS)
- [x] Timezone set on all workflows (America/New_York)
- [x] Client onboarding guide created

### Should Do ⚡

- [ ] Setup ElevenLabs voice agent (Bella)
- [ ] Configure a real Stripe Connect account per salon
- [ ] 24-hour test run (monitor error_logs table)
- [ ] Setup email alerts (AWS SES in error_handler)

### Nice to Have 🌟

- [ ] Email/SMS booking confirmation templates (Phase 5)
- [ ] Dashboard RBAC — owner/staff logins (Phase 6)
- [ ] Custom branded SMS from per-tenant phone numbers

---

## 6. Monitoring Commands

### Check Recent Errors

```sql
SELECT * FROM error_logs
ORDER BY created_at DESC
LIMIT 10;
```

### Check Recent Bookings

```sql
SELECT b.id, b.status, b.start_at, c.name as client
FROM bookings b
LEFT JOIN clients c ON b.client_id = c.id
WHERE b.tenant_id = 'TENANT_ID'
ORDER BY b.created_at DESC
LIMIT 10;
```

### Check Waitlist

```sql
SELECT * FROM waitlist
WHERE tenant_id = 'TENANT_ID' AND status = 'waiting'
ORDER BY created_at;
```

---

## 🎯 Launch Readiness: READY ✅

The system is production-ready for launching with the first salon client.
Remaining items (ElevenLabs, email templates, dashboard) are enhancements
that can be added post-launch.
