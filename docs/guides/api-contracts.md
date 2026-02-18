# API Contracts - ElevenLabs → n8n Tools

## Tool: list_services
```
GET /webhook/tools/list_services
```
**Response:**
```json
[
  {
    "id": "uuid",
    "name": "string",
    "category": "string",
    "price": 45,
    "duration_min": 30,
    "cleanup_buffer_min": 10,
    "deposit_required": true,
    "deposit_amount": 20,
    "status": "active"
  }
]
```

---

## Tool: list_staff
```
GET /webhook/tools/list_staff
```
**Response:**
```json
[
  { "id": "uuid", "name": "Sarah", "role_title": "Hair Colorist", "status": "active" }
]
```

---

## Tool: check_availability
```
POST /webhook/tools/check_availability
Content-Type: application/json
```
**Request:**
```json
{
  "date": "YYYY-MM-DD",
  "service_ids": ["uuid", "uuid"],
  "preferred_staff_id": "uuid (optional)"
}
```
**Response:**
```json
{
  "ok": true,
  "date": "YYYY-MM-DD",
  "total_minutes": 135,
  "slots": [
    {
      "staff_id": "uuid",
      "staff_name": "Sarah",
      "start_at": "2026-01-27T15:00:00-06:00",
      "end_at": "2026-01-27T17:15:00-06:00",
      "total_minutes": 135
    }
  ]
}
```

---

## Tool: create_booking
```
POST /webhook/tools/create_booking
Content-Type: application/json
```
**Request:**
```json
{
  "client": {"full_name":"Jane Doe", "phone":"+1234567890", "email":"jane@example.com"},
  "service_ids": ["uuid","uuid"],
  "staff_id": "uuid",
  "start_at": "2026-01-27T15:00:00-06:00",
  "notes": "optional"
}
```
**Response:**
```json
{
  "ok": true,
  "booking_id": "uuid",
  "status": "pending_payment",
  "start_at": "2026-01-27T15:00:00-06:00",
  "end_at": "2026-01-27T17:15:00-06:00",
  "deposit_required": true,
  "deposit_amount": 40,
  "payment_link": "https://checkout.stripe.com/..."
}
```

---

## Tool: cancel_booking
```
POST /webhook/tools/cancel_booking
Content-Type: application/json
```
**Request:**
```json
{ "booking_id": "uuid" }
```
**Response:**
```json
{ "ok": true, "message": "Booking cancelled successfully" }
```

---

## Tool: reschedule_booking
```
POST /webhook/tools/reschedule_booking
Content-Type: application/json
```
**Request:**
```json
{ "booking_id": "uuid", "new_start_at": "2026-01-28T10:00:00-06:00" }
```
**Response:**
```json
{
  "ok": true,
  "booking_id": "uuid",
  "new_start_at": "2026-01-28T10:00:00-06:00",
  "new_end_at": "2026-01-28T12:15:00-06:00"
}
```

---

## Tool: create_payment_link
```
POST /webhook/tools/create_payment_link
Content-Type: application/json
```
**Request:**
```json
{ "booking_id": "uuid" }
```
**Response:**
```json
{
  "ok": true,
  "payment_link": "https://checkout.stripe.com/...",
  "status": "pending"
}
```

---

## Tool: mark_manual_payment
```
POST /webhook/tools/mark_manual_payment
Content-Type: application/json
```
**Request:**
```json
{
  "booking_id": "uuid",
  "amount": 20,
  "method": "cash",
  "note": "walk-in paid"
}
```
**Response:**
```json
{ "ok": true, "message": "Payment marked as paid" }
```
