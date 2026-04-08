# 📞 ElevenLabs AI Call Test Script

## Golden Glam Studio — All 9 Tools Testing

> **Instructions:** Call your ElevenLabs AI agent and follow this script step by step.  
> Each section tests a specific Edge Function/tool.  
> ✅ = Expected Result | ⚠️ = What to Check  

---

## 🔹 Part 1: Salon Info (get_salon_info)

**You say:**
> "Hi! Can you tell me about your salon? What are your hours?"

✅ **Expected:** Agent tells you salon name (Golden Glam Studio), address, working hours, contact info  
⚠️ **Check:** Hours match what's configured in Supabase `tenants` table

---

## 🔹 Part 2: List Services (list_services)

**You say:**
> "What services do you offer?"

✅ **Expected:** Agent lists services like Women's Haircut, Men's Haircut & Fade, Balayage, Keratin, etc.  
⚠️ **Check:** Prices and durations are mentioned

**Follow up:**
> "How much is a Women's Haircut?"

✅ **Expected:** Agent gives price ($45) and duration (45 min)

---

## 🔹 Part 3: List Staff (list_staff)

**You say:**
> "Who are your stylists? Who can I book with?"

✅ **Expected:** Agent lists available staff — Ava Williams, James Carter, Ryan Brooks  
⚠️ **Check:** If Sophia Lee (manager) has `can_take_bookings = false`, she should NOT be listed as bookable

---

## 🔹 Part 4: Check Availability (check_availability)

**You say:**
> "Is Ryan Brooks available on March 10th?"

✅ **Expected:** Agent shows available time slots for Ryan on March 10  
⚠️ **Check:** Slots should start from salon opening time and be in 30-min increments

**Follow up:**
> "What about March 11th at 2 PM?"

✅ **Expected:** Agent confirms if 2 PM is available or suggests alternatives

---

## 🔹 Part 5: Create Booking (create_booking) ⭐

**You say:**
> "I want to book a Women's Haircut with Ava Williams on March 10th at 11 AM. My name is Ali, phone +923001234567, email <test@test.com>"

✅ **Expected:**  

- Agent confirms: "Booking confirmed for Ali on Monday, March 10, 2026 at **11:00 AM**"  
- Deposit of $15 required, payment link sent  
⚠️ **CRITICAL CHECK:** Time must be **11:00 AM** (not 12 PM or 5 PM — that means timezone bug)  
⚠️ **Check email** for payment link from Stripe

---

## 🔹 Part 6: Reschedule Booking (reschedule_booking)

**You say:**
> "I need to reschedule my appointment. Can you move it to March 12th, same time 11 AM?"

✅ **Expected:** Agent reschedules and confirms new date  
⚠️ **Check:** If it fails, note the error message  

---

## 🔹 Part 7: Cancel Booking (cancel_booking)

**You say:**
> "Actually, I need to cancel my appointment"

✅ **Expected:** Agent confirms cancellation  
⚠️ **Check:** Booking status changes to "cancelled" in dashboard

---

## 🔹 Part 8: Waitlist (add_to_waitlist)

**You say:**
> "All the slots are full but I really want to get a Balayage this Saturday. Can you put me on the waitlist?"

✅ **Expected:** Agent adds you to waitlist for Balayage on Saturday  
⚠️ **Check:** Waitlist entry appears in Supabase

---

## 🔹 Part 9: Payment Link (create_payment_link)

> *(This is usually triggered automatically during booking if deposit is required)*  
> If not triggered during Part 5, say:

**You say:**
> "Can you send me the payment link for my booking?"

✅ **Expected:** Agent generates Stripe payment link and sends to email  
⚠️ **Check:** Link is valid and goes to Stripe checkout

---

## 📋 Quick Checklist After Call

| # | Tool | Tested | Result |
|---|------|--------|--------|
| 1 | get_salon_info | ☐ | |
| 2 | list_services | ☐ | |
| 3 | list_staff | ☐ | |
| 4 | check_availability | ☐ | |
| 5 | create_booking | ☐ | |
| 6 | reschedule_booking | ☐ | |
| 7 | cancel_booking | ☐ | |
| 8 | add_to_waitlist | ☐ | |
| 9 | create_payment_link | ☐ | |

---

## ⚠️ Known Issues to Watch

1. **Time Mismatch:** If agent says 11 AM but email/DB shows different time → timezone bug  
2. **Service Not Found:** Agent must use exact service name including apostrophe (Women's not Womens)  
3. **Reschedule/Cancel Fail:** These need the booking_id — agent should find it by phone number  
4. **Sophia Lee:** Should NOT appear as bookable if `can_take_bookings` is set to FALSE  

---

## 🔄 Test Order (Recommended)

1. ➡️ Salon Info → Services → Staff (easy, no side effects)
2. ➡️ Availability → Book → Check email/DB
3. ➡️ Reschedule → Verify new time
4. ➡️ Cancel → Verify cancelled
5. ➡️ Waitlist (separate call or same call)

**Total estimated call time: 5-8 minutes**
