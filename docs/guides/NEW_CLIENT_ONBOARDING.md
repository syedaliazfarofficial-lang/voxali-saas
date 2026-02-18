# 🚀 New Client Onboarding Guide

> **Estimated Time:** 5-10 minutes per salon

This guide walks through adding a new salon to the Voxali platform.

---

## Quick Checklist

| Step | Action | Time |
|------|--------|------|
| 1 | Create tenant in Supabase | 30s |
| 2 | Add services | 1-2m |
| 3 | Add staff + weekly schedules | 1-2m |
| 4 | Configure Stripe (if needed) | 1m |
| 5 | Setup voice agent (ElevenLabs) | 2m |
| 6 | Test everything | 1m |

---

## Step 1: Create Tenant

Run this SQL in **Supabase Dashboard → SQL Editor**:

```sql
-- CHANGE THESE VALUES for each new salon
INSERT INTO tenants (
    name,
    slug,
    phone,
    email,
    address,
    timezone,
    business_hours,
    settings
) VALUES (
    'Salon Name Here',           -- Salon name
    'salon-name-here',           -- URL-friendly slug (lowercase, hyphens)
    '+1234567890',               -- Salon phone
    'salon@email.com',           -- Salon email
    '123 Main St, City, State',  -- Address
    'America/New_York',          -- Timezone
    '{
        "monday":    {"open": "09:00", "close": "19:00"},
        "tuesday":   {"open": "09:00", "close": "19:00"},
        "wednesday": {"open": "09:00", "close": "19:00"},
        "thursday":  {"open": "09:00", "close": "20:00"},
        "friday":    {"open": "09:00", "close": "20:00"},
        "saturday":  {"open": "10:00", "close": "18:00"},
        "sunday":    {"open": null,    "close": null}
    }'::jsonb,
    '{
        "currency": "USD",
        "booking_advance_days": 30,
        "cancellation_hours": 24,
        "allow_pay_at_salon": true
    }'::jsonb
)
RETURNING id;
-- ⚠️ COPY THE RETURNED ID! You'll need it for all subsequent steps.
```

**Save the returned `tenant_id` (UUID)** — you'll use it everywhere below.

---

## Step 2: Add Services

```sql
-- Replace YOUR_TENANT_ID with the UUID from Step 1
-- Add as many services as needed

INSERT INTO services (tenant_id, name, description, duration_min, price, category, deposit_required, deposit_amount, processing_duration, gap_start_offset, cleanup_buffer_min) VALUES
('YOUR_TENANT_ID', 'Women''s Haircut',   'Professional cut & style',    60,  45.00, 'Hair',  false, 0,  0,  0, 10),
('YOUR_TENANT_ID', 'Men''s Haircut',     'Classic cut',                 30,  25.00, 'Hair',  false, 0,  0,  0, 10),
('YOUR_TENANT_ID', 'Hair Color',         'Full color service',         180, 120.00, 'Hair',  true, 30, 45, 60, 15),
('YOUR_TENANT_ID', 'Blowout',            'Wash & blowdry',             45,  35.00, 'Hair',  false, 0,  0,  0, 10),
('YOUR_TENANT_ID', 'Manicure',           'Classic manicure',            45,  30.00, 'Nails', false, 0,  0,  0,  5),
('YOUR_TENANT_ID', 'Pedicure',           'Classic pedicure',            60,  40.00, 'Nails', false, 0,  0,  0,  5),
('YOUR_TENANT_ID', 'Facial',             'Deep cleansing facial',       60,  75.00, 'Skin',  false, 0,  0,  0, 10);

-- NOTES:
-- processing_duration = color processing time (in minutes) where client waits
-- gap_start_offset = minutes after booking start when gap begins (for gap filling)
-- cleanup_buffer_min = cleanup time between appointments
-- deposit_required = true means Stripe payment link is sent
-- deposit_amount = deposit in dollars (only if deposit_required = true)
```

---

## Step 3: Add Staff & Weekly Schedules

```sql
-- Add staff members
INSERT INTO staff (tenant_id, name, email, phone, role, status) VALUES
('YOUR_TENANT_ID', 'Jane Doe',    'jane@salon.com',  '+1234567891', 'stylist', 'active'),
('YOUR_TENANT_ID', 'John Smith',  'john@salon.com',  '+1234567892', 'stylist', 'active');

-- Get staff IDs
SELECT id, name FROM staff WHERE tenant_id = 'YOUR_TENANT_ID';
```

**Then add weekly schedules for each staff member:**

```sql
-- Replace STAFF_ID with actual staff UUID
-- Repeat for each staff member

INSERT INTO staff_weekly_schedules (staff_id, tenant_id, day_of_week, start_time, end_time, is_available) VALUES
('STAFF_ID', 'YOUR_TENANT_ID', 0, '09:00', '17:00', true),  -- Monday
('STAFF_ID', 'YOUR_TENANT_ID', 1, '09:00', '17:00', true),  -- Tuesday
('STAFF_ID', 'YOUR_TENANT_ID', 2, '09:00', '17:00', true),  -- Wednesday
('STAFF_ID', 'YOUR_TENANT_ID', 3, '09:00', '19:00', true),  -- Thursday
('STAFF_ID', 'YOUR_TENANT_ID', 4, '09:00', '19:00', true),  -- Friday
('STAFF_ID', 'YOUR_TENANT_ID', 5, '10:00', '16:00', true),  -- Saturday
('STAFF_ID', 'YOUR_TENANT_ID', 6, NULL,    NULL,    false);  -- Sunday (off)
```

---

## Step 4: Stripe Configuration (Optional)

If the salon uses deposits/online payments:

1. Create a **Stripe Connect** account for the salon, OR use your main Stripe account
2. Note the Stripe Secret Key
3. In n8n, the Stripe key is used in `tools_create_payment_link` workflow

> **If salon uses "Pay at Salon" only:** Skip this step. Set `deposit_required = false` for all services.

---

## Step 5: Setup Voice Agent (ElevenLabs)

### 5.1: Create Agent in ElevenLabs

1. Go to [elevenlabs.io/conversational-ai](https://elevenlabs.io/app/conversational-ai)
2. Create new Agent
3. Copy system prompt from `elevenlabs/bella_agent_config.md`
4. Customize salon-specific details (name, greeting, etc.)

### 5.2: Configure Tools in Agent

Add these webhook tools with `?tenant_id=YOUR_TENANT_ID`:

| Tool | Method | URL |
|------|--------|-----|
| `check_availability` | POST | `https://ali-n8n.mywire.org/webhook/tools/check_availability?tenant_id=YOUR_TENANT_ID` |
| `create_booking` | POST | `https://ali-n8n.mywire.org/webhook/tools/create_booking?tenant_id=YOUR_TENANT_ID` |
| `cancel_booking` | POST | `https://ali-n8n.mywire.org/webhook/tools/cancel_booking?tenant_id=YOUR_TENANT_ID` |
| `reschedule_booking` | POST | `https://ali-n8n.mywire.org/webhook/tools/reschedule_booking?tenant_id=YOUR_TENANT_ID` |
| `create_payment_link` | POST | `https://ali-n8n.mywire.org/webhook/tools/create_payment_link?tenant_id=YOUR_TENANT_ID` |
| `add_to_waitlist` | POST | `https://ali-n8n.mywire.org/webhook/tools/add_to_waitlist?tenant_id=YOUR_TENANT_ID` |

### 5.3: Assign Phone Number

- Buy a phone number in ElevenLabs, OR
- Import an existing Twilio number

---

## Step 6: Test Everything

### Quick Test Checklist

```bash
# 1. Test Check Availability
curl -X POST https://ali-n8n.mywire.org/webhook/tools/check_availability \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-03-01","service_id":"SERVICE_ID","tenant_id":"YOUR_TENANT_ID"}'

# 2. Test Create Booking
curl -X POST https://ali-n8n.mywire.org/webhook/tools/create_booking \
  -H "Content-Type: application/json" \
  -d '{
    "client_name":"Test Client",
    "client_phone":"+1234567890",
    "service_id":"SERVICE_ID",
    "stylist_id":"STAFF_ID",
    "date":"2026-03-01",
    "time":"10:00",
    "tenant_id":"YOUR_TENANT_ID"
  }'

# 3. Test voice call → call the phone number
```

### Verify in Supabase

```sql
-- Check bookings were created
SELECT id, status, start_at
FROM bookings
WHERE tenant_id = 'YOUR_TENANT_ID'
ORDER BY created_at DESC
LIMIT 5;
```

---

## 🗑️ Remove Test Data

After testing, clean up:

```sql
-- Delete test bookings
DELETE FROM bookings WHERE tenant_id = 'YOUR_TENANT_ID' AND status = 'confirmed';
-- OR keep them as sample data for the salon owner
```

---

## 📋 Client Info Collection Template

Collect this info from the new salon before starting:

| Info Needed | Example |
|-------------|---------|
| Salon name | "Luxe Aurea" |
| Address | "123 Main St, NYC" |
| Phone | "+1 212 555 0100" |
| Email | "<info@luxeaurea.com>" |
| Timezone | "America/New_York" |
| Business hours | Mon-Fri 9-7, Sat 10-6 |
| Services list | Cuts, Color, Nails, etc. |
| Service prices | $25-$200 |
| Staff names | Jane, John, Sarah |
| Staff schedules | Who works when |
| Accept deposits? | Yes/No, amount |
| Payment method | Stripe / Pay at Salon |
