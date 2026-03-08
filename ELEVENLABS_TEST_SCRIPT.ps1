# 🎯 VOXALI — ElevenLabs Preview Testing Script
# ================================================
# ElevenLabs > Agent > Preview pe click karo
# Neeche diye gaye messages ek ek karke type karo
# Har tool ka response check karo
# ================================================

## STEP 1: GET SALON INFO (Tool: get_salon_info)
## -----------------------------------------------
## TYPE: "Hi, what's your salon name and what are your business hours?"
##
## ✅ Expected: Agent should tell you:
##    - Salon name (Golden Glam Studio)
##    - Business hours (Mon-Sat, open/close times)
##    - Current date & time
##    - Timezone
##
## ❌ If FAIL: Tool URL wrong or tenant_id missing


## STEP 2: LIST SERVICES (Tool: list_services)
## -----------------------------------------------
## TYPE: "What services do you offer and how much do they cost?"
##
## ✅ Expected: Agent should list services like:
##    - Women's Haircut — $55 (60 min)
##    - Men's Haircut — $35 (30 min)
##    - Highlights — $120 (90 min)
##    - etc.
##
## ❌ If FAIL: Check list-services Edge Function URL


## STEP 3: LIST STAFF (Tool: list_staff)
## -----------------------------------------------
## TYPE: "Who are your stylists? Can you tell me their names?"
##
## ✅ Expected: Agent should list staff like:
##    - Sophia Lee (manager)
##    - James Carter (colorist)
##    - etc.
##
## ❌ If FAIL: Check list-staff Edge Function URL


## STEP 4: CHECK AVAILABILITY (Tool: check_availability)
## -----------------------------------------------
## TYPE: "Do you have any openings tomorrow?"
##
## ✅ Expected: Agent should tell you available time slots:
##    - "We have openings at 10:00 AM, 10:30 AM, 11:00 AM..."
##    - Grouped by stylist
##
## ❌ If FAIL: Check check-availability URL, check date format


## STEP 5: CREATE BOOKING (Tool: create_booking)
## -----------------------------------------------
## TYPE: "I'd like to book a haircut tomorrow at 10 AM.
##        My name is Ali and my phone number is 1-555-123-4567"
##
## ✅ Expected: Agent should confirm:
##    - "Your booking is confirmed for [date] at 10:00 AM"
##    - Service: Women's/Men's Haircut
##    - If deposit required: "A $15 deposit is needed"
##    - Payment link (if Stripe configured)
##
## ❌ If FAIL: Check create-booking URL, service name matching


## STEP 6: RESCHEDULE BOOKING (Tool: reschedule_booking)
## -----------------------------------------------
## TYPE: "Actually, can you move my appointment to the day after tomorrow at 2 PM?
##        My name is Ali, phone 1-555-123-4567"
##
## ✅ Expected:
##    - "Your booking has been rescheduled to [new date] at 2:00 PM"
##    - OR if slot not available: "That time is not available, here are alternatives..."
##
## ❌ If FAIL: Check reschedule-booking URL


## STEP 7: CANCEL BOOKING (Tool: cancel_booking)
## -----------------------------------------------
## TYPE: "I need to cancel my appointment.
##        My name is Ali, phone 1-555-123-4567"
##
## ✅ Expected:
##    - "Your booking on [date] at [time] has been cancelled"
##
## ❌ If FAIL: Check cancel-booking URL


## STEP 8: ADD TO WAITLIST (Tool: add_to_waitlist)
## -----------------------------------------------
## TYPE: "There are no slots available for the date I want.
##        Can you add me to the waitlist for March 10th?
##        My name is Sara, phone 1-555-999-8888"
##
## ✅ Expected:
##    - "Sara has been added to the waitlist for March 10th"
##    - "We will notify you when a slot becomes available"
##
## ❌ If FAIL: Check add-to-waitlist URL


## STEP 9: CREATE PAYMENT LINK (Tool: create_payment_link)
## -----------------------------------------------
## NOTE: This tool is usually called automatically by create_booking
##       when deposit is required. But you can test by asking:
##
## TYPE: "I had a booking but lost the payment link. Can you send it again?"
##
## ✅ Expected:
##    - Agent creates new payment link
##    - Shows Stripe checkout URL
##
## ❌ If FAIL: STRIPE_SECRET_KEY not set as Supabase secret


# ================================================
# QUICK REFERENCE — Full Test in One Conversation:
# ================================================
#
# Message 1: "Hi! What salon is this and what are your hours?"
#            → Tests: get_salon_info ✅
#
# Message 2: "What services do you offer?"
#            → Tests: list_services ✅
#
# Message 3: "Who are your stylists?"
#            → Tests: list_staff ✅
#
# Message 4: "Any openings tomorrow?"
#            → Tests: check_availability ✅
#
# Message 5: "Book me a haircut tomorrow at 10 AM.
#             My name is Ali, phone 555-123-4567"
#            → Tests: create_booking ✅
#
# Message 6: "Move my appointment to day after tomorrow at 2 PM"
#            → Tests: reschedule_booking ✅
#
# Message 7: "Cancel my appointment please"
#            → Tests: cancel_booking ✅
#
# Message 8: "No slots on March 15? Add me to waitlist.
#             Name: Sara, phone: 555-999-8888"
#            → Tests: add_to_waitlist ✅
#
# ================================================
# ALL 8 VOICE TOOLS TESTED! ✅
# ================================================
