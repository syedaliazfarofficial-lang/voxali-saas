# ElevenLabs Agent Setup — Per Salon

## 🔗 Webhook Base URL

```
https://ali-n8n.mywire.org/webhook/
```

---

## ⚙️ System Prompt Template (Copy for ANY Salon)

```
You are Aria, the AI receptionist at {SALON_NAME} — a premium beauty salon and spa.

CRITICAL: At the START of every conversation, call the get_salon_info tool to get:
- Current date, time, and year in salon timezone
- Weekly business hours (per day open/close times)
Use this information for ALL date/time references during the call. DO NOT guess the date or time.

Your job is to help customers:
- Book appointments
- Check available time slots
- Cancel or reschedule existing appointments
- Answer questions about services, prices, and working hours
- Add them to the waitlist if no slots are available

IMPORTANT RULES:
- Always be warm, friendly, and professional.
- When a customer wants to book, ask for: their name, phone number, email, preferred date/time, and the service they want.
- If no time slot is available, offer to add them to the waitlist.
- If the customer asks to speak to a human or the salon owner, transfer the call.
- Always confirm details before creating a booking.
- Use the customer's name throughout the conversation.
- If you don't understand something, politely ask them to repeat.
- When the customer asks about salon timing/hours, use the weekly_schedule from get_salon_info to give accurate per-day hours.
- When the user requests a specific time, you MUST select the slot that matches their requested time from the available slots. Do NOT pick the first available slot — match the user's preferred time exactly.
- Always use the current_year from get_salon_info for date references. Never assume 2024 or 2025.

SALON INFORMATION:
- Name: {SALON_NAME}
- Phone: {TWILIO_PHONE}
- Timezone: {TIMEZONE}
- Business hours are fetched dynamically via get_salon_info tool (DO NOT hardcode hours)
```

---

## 🔧 Tool Configuration (Same 9 Tools for Every Salon)

### Key Change: tenant_id is passed in the URL query parameter

All tools use this URL format:

```
https://ali-n8n.mywire.org/webhook/tools/{TOOL_NAME}?tenant_id={TENANT_ID}
```

### Required Headers for ALL Tools

```json
{
    "Content-Type": "application/json",
    "X-TOOLS-KEY": "LUXE-AUREA-SECRET-2026"
}
```

### Tool List

| # | Tool Name | Method | URL Path |
|---|-----------|--------|----------|
| 1 | **get_salon_info** | POST | `tools/get_salon_info?tenant_id={TID}` |
| 2 | **list_services** | POST | `tools/list_services?tenant_id={TID}` |
| 3 | **list_staff** | POST | `tools/list_staff?tenant_id={TID}` |
| 4 | **check_availability** | POST | `tools/check_availability?tenant_id={TID}` |
| 5 | **create_booking** | POST | `tools/create_booking?tenant_id={TID}` |
| 6 | **cancel_booking** | POST | `tools/cancel_booking?tenant_id={TID}` |
| 7 | **reschedule_booking** | POST | `tools/reschedule_booking?tenant_id={TID}` |
| 8 | **create_payment_link** | POST | `tools/create_payment_link?tenant_id={TID}` |
| 9 | **add_to_waitlist** | POST | `tools/add_to_waitlist?tenant_id={TID}` |

---

## 🏪 SALON 1: Golden Glam Studio

**Tenant ID:** `527f8f35-72f0-4818-b514-ad7695cd076a`
**Twilio Number:** `+16592174925`
**Timezone:** `America/Chicago`

### Tool URLs

| Tool | URL |
|------|-----|
| get_salon_info | `https://ali-n8n.mywire.org/webhook/tools/get_salon_info?tenant_id=527f8f35-72f0-4818-b514-ad7695cd076a` |
| list_services | `https://ali-n8n.mywire.org/webhook/tools/list_services?tenant_id=527f8f35-72f0-4818-b514-ad7695cd076a` |
| list_staff | `https://ali-n8n.mywire.org/webhook/tools/list_staff?tenant_id=527f8f35-72f0-4818-b514-ad7695cd076a` |
| check_availability | `https://ali-n8n.mywire.org/webhook/tools/check_availability?tenant_id=527f8f35-72f0-4818-b514-ad7695cd076a` |
| create_booking | `https://ali-n8n.mywire.org/webhook/tools/create_booking?tenant_id=527f8f35-72f0-4818-b514-ad7695cd076a` |
| cancel_booking | `https://ali-n8n.mywire.org/webhook/tools/cancel_booking?tenant_id=527f8f35-72f0-4818-b514-ad7695cd076a` |
| reschedule_booking | `https://ali-n8n.mywire.org/webhook/tools/reschedule_booking?tenant_id=527f8f35-72f0-4818-b514-ad7695cd076a` |
| create_payment_link | `https://ali-n8n.mywire.org/webhook/tools/create_payment_link?tenant_id=527f8f35-72f0-4818-b514-ad7695cd076a` |
| add_to_waitlist | `https://ali-n8n.mywire.org/webhook/tools/add_to_waitlist?tenant_id=527f8f35-72f0-4818-b514-ad7695cd076a` |

---

## 🏪 SALON 2: Royal Shine Beauty

**Tenant ID:** `67244f82-65ae-44cf-8ca8-63017b60789d`
**Twilio Number:** `+16592174925`
**Timezone:** `America/New_York`

### Tool URLs

*(Same as above, replace tenant_id with `67244f82-65ae-44cf-8ca8-63017b60789d`)*

---

## 🏪 SALON 3: Velvet Rose Studio

**Tenant ID:** *(check Supabase tenants table for slug = `velvet-rose-studio`)*
**Twilio Number:** `+16592174925`
**Timezone:** `America/Los_Angeles`

### Tool URLs

*(Same as above, replace tenant_id with Velvet Rose's UUID)*

---

## 📋 Adding a NEW Salon — Checklist

### Step 1: SuperAdmin → Add Salon

- Go to SuperAdmin → All Salons → Add Salon
- Enter: Name, Owner Name, Email, Password
- This auto-creates: tenant, auth user, profile, 25 default services (OFF), 7-day hours

### Step 2: Configure Salon

- Login as salon owner → Settings → Services → ALL ON (activate needed services)
- Settings → Availability → Set business hours per day
- Settings → Timezone → Set correct timezone

### Step 3: Create ElevenLabs Agent

1. ElevenLabs → Create new agent
2. Copy system prompt template (above) — replace {SALON_NAME}, {TWILIO_PHONE}, {TIMEZONE}
3. Add all 9 tools — use the URL format with new tenant_id
4. Set headers: Content-Type + X-TOOLS-KEY
5. Choose voice (Aria recommended)
6. Set phone number (if purchased)

### Step 4: Test

- Ask "What are your salon hours?" → should return correct per-day hours
- Ask "What services do you offer?" → should list active services
- Book an appointment → should show in dashboard with correct time

---

## 📋 What Changes Per Salon

| Item | What Changes |
|------|-------------|
| System Prompt | Salon name, phone, timezone |
| Tool URLs | `?tenant_id=NEW_UUID` at the end |
| Twilio Number | Different number per salon (if purchased) |
| Call Transfer | Owner's personal phone number |

## ❌ What Stays SAME For All Salons

| Item | Value |
|------|-------|
| n8n base URL | `https://ali-n8n.mywire.org/webhook/` |
| Tool names | Same 9 tools |
| Request headers | `X-TOOLS-KEY: LUXE-AUREA-SECRET-2026` |
| n8n workflows | Shared — one workflow serves all salons |
| System prompt template | Same structure, just swap variables |
