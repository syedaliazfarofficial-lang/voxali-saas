# 📋 LUXE AUREA SALON - DATABASE IDs REFERENCE

**Last Updated:** 2026-02-01  
**Project:** AI Salon Receptionist

---

## 🎨 SERVICES (from services table)

**Column Names:** `id`, `name`, `duration_min`, `price`, `deposit_amount`

| Service ID | Name | Duration | Price | Deposit |
|------------|------|----------|-------|---------|
| `1011e7f1-c940-424e-be86-93d7636c2c24` | Signature Haircut | 30 min | $45.00 | $20.00 |
| `611ff117-0ca5-464d-98a5-f146dc64825a` | Hair Color | 90 min | $120.00 | $40.00 |
| `dba96619-5d68-45e2-9eb0-565d18e4d879` | Balayage Highlights | 150 min | $250.00 | $75.00 |
| `57a76826-beb3-4196-a16d-921173af06b8` | Gel Manicure | 45 min | $35.00 | $15.00 |
| `846b73aa-b94c-4428-bf23-1fecd4ac8ead` | Signature Haircut | 30 min | $45.00 | $20.00 |
| `8890b876-185f-4530-8298-9df879bf7d7f` | Hair Color | 90 min | $120.00 | $40.00 |
| `475d967a-6612-4f42-a98c-43aa27da9c8c` | Balayage Highlights | 150 min | $250.00 | $75.00 |
| `5eec6f7c-2a4f-4fe1-96d1-9df32337d691` | Gel Manicure | 45 min | $35.00 | $15.00 |
| `c4833323-0e7f-46f3-9d90-769c93a9bad2` | Signature Haircut | 30 min | $45.00 | $20.00 |
| `06dc65a6-cd76-4d66-b69f-2e55ee5ea430` | Hair Color | 90 min | $120.00 | $40.00 |
| `e172d26b-892c-4990-a361-57ed4a2d9eea` | Balayage Highlights | 150 min | $250.00 | $75.00 |
| `9e118c84-8d4e-487d-bfa8-ca4544e10bd4` | Gel Manicure | 45 min | $35.00 | $15.00 |

---

## 👥 STAFF (from staff table)

| Staff ID | Name |
|----------|------|
| `723fda9a-a099-41cc-a7cc-e1629b454504` | Sarah |
| `3f2d070f-f775-4e0b-94fe-c4a75d5cab84` | Alex |
| `2bca8291-c304-45b8-976b-7cf409418145` | Mike |
| `ce8ba1la-69b3-4ea2-9ea0-a2f2b54662d6d` | Sarah |
| `a25e61cd-0cd9-4932-be82-a8bc5304bcd2` | Alex |
| `9bcdd6a0-57e0-4998-acc8-8e68116d98cc` | Mike |

---

## 🧪 VALID TEST DATA FOR POSTMAN

### Create Booking Test:
```json
{
  "client": {
    "full_name": "Test User",
    "phone": "+1234567890",
    "email": "test@test.com"
  },
  "service_ids": ["1011e7f1-c940-424e-be86-93d7636c2c24"],
  "staff_id": "723fda9a-a099-41cc-a7cc-e1629b454504",
  "start_at": "2026-02-05T14:00:00"
}
```

**Valid Combinations:**
- **Service:** Signature Haircut (`1011e7f1-c940-424e-be86-93d7636c2c24`) ✅ CORRECT UUID
- **Staff:** Sarah (`723fda9a-a099-41cc-a7cc-e1629b454504`)
- **Price:** $45.00, Deposit: $20.00

---

## 🔑 SUPABASE CREDENTIALS

**Project URL:** `https://sjzxgjimbcoqsylrglkm.supabase.co`

**Service Role Key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqenhnamltYmNvcXN5bHJnbGttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQzMDI5MCwiZXhwIjoyMDg1MDA2MjkwfQ.Pdjb-xycYml0fPS9nuYDYdDqkI0Q6DSuq18rE14FpG0
```

---

## 📍 N8N WEBHOOK ENDPOINTS

**Base URL:** `https://ali-n8n.mywire.org/webhook/`

- ✅ `POST /tools/create_booking` - WORKING
- ✅ `POST /tools/cancel_booking` - WORKING
- 🔄 `POST /tools/reschedule_booking` - Pending test
- 🔄 `POST /tools/check_availability` - Pending test
- 🔄 `POST /tools/create_payment_link` - Pending test
- 🔄 `POST /tools/mark_manual_payment` - Pending test
- 🔄 `POST /tools/add_to_waitlist` - Pending test
- 🔄 `GET /tools/list_services` - Pending test
- 🔄 `GET /tools/list_staff` - Pending test

---

## 🌍 TIMEZONE SETTINGS

**Salon Timezone:** `America/Chicago` (CST)  
**Offset:** UTC-6 (Winter), UTC-5 (Summer DST)

---

## 📝 NOTES

- All UUIDs are from production Supabase database
- Service IDs and Staff IDs have foreign key constraints
- Use these exact IDs for testing workflows
- Multiple staff members with same name exist (Sarah x2, Alex x2, Mike x2)
