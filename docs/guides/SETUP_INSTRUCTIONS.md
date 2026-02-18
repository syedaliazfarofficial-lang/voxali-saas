# 🎯 LUXE AUREA - Clean Setup Instructions

## ⚠️ BACKUP WARNING
This will **DELETE ALL existing data** and create fresh database!

---

## 📋 STEP-BY-STEP GUIDE

### **STEP 1: Run Database Setup** (5 min)

1. Open Supabase: https://supabase.com/dashboard
2. Go to your project → SQL Editor
3. Open file: `CLEAN_SETUP_SINGLE_SALON.sql` (in VS Code)
4. Copy **ALL** content (`Ctrl+A`, `Ctrl+C`)
5. Paste in Supabase SQL Editor
6. Click green **"Run"** button
7. Wait for "Success!" ✅

---

### **STEP 2: Create Owner Login** (3 min)

**In Supabase Dashboard**:

1. Go to: **Authentication** → **Users**
2. Click: **"Add User"** (green button)
3. Fill in:
   - **Email**: `your_email@example.com` (your real email)
   - **Password**: Choose strong password
   - **Auto Confirm User**: ✅ **CHECK THIS!**
   - **User Metadata** (click "Edit as JSON"):
     ```json
     {
       "full_name": "Your Full Name",
       "role": "owner"
     }
     ```
4. Click **"Create User"**

**Profile auto-creates!** ✅

---

### **STEP 3: Test Login** (2 min)

1. Open dashboard: http://localhost:3000/login
2. Enter your email + password
3. Should login successfully! ✅

**You're now Owner** with full access!

---

### **STEP 4: Add Staff Logins** (Optional - 3 min each)

**For each staff member (manager/stylist)**:

**A) Create Staff Record First** (if not exists):
- Login to dashboard as owner
- Go to "Staff" page
- Add staff member
- Save their `id`

**B) Create Auth Login**:

1. Supabase → Authentication → Users → Add User
2. Email: `staff@email.com`
3. Password: `TempPass123!`
4. Auto Confirm: ✅
5. User Metadata:
   ```json
   {
     "full_name": "Staff Name",
     "role": "manager"
   }
   ```
   or
   ```json
   {
     "full_name": "Stylist Name",
     "role": "stylist"
     }
   ```

**C) Link to Staff Record**:

Run this SQL (replace IDs):
```sql
UPDATE profiles 
SET staff_id = 'STAFF_ID_FROM_DASHBOARD'::uuid
WHERE email = 'staff@email.com';
```

---

## 🎯 WHAT YOU NOW HAVE

### **✅ Complete System**:
- Fresh database
- Owner login (full access)
- Sample staff (3 members)
- Sample services (7 services)
- Ready for bookings!

### **✅ Role Permissions**:

**Owner**:
- ✅ Everything
- ✅ All pages
- ✅ Settings
- ✅ Staff management
- ✅ All bookings
- ✅ Payments

**Manager**:
- ✅ View all bookings
- ✅ View all payments
- ✅ View all clients
- ✅ View staff
- ❌ Can't edit settings
- ❌ Can't manage staff

**Stylist**:
- ✅ View own bookings only
- ✅ Create bookings for own schedule
- ❌ Can't see other stylists' bookings
- ❌ Can't see payments
- ❌ Can't see settings

---

## 🚀 NEXT STEPS

### **1. Customize Business Info**:
- Login as owner
- Go to Settings
- Update salon details

### **2. Update Services**:
- Edit prices
- Add/remove services
- Set durations

### **3. Update Staff**:
- Edit sample staff
- Remove if not needed
- Add your real staff

### **4. Start Using!**:
- Dashboard ready: http://localhost:3000
- Voice agent ready (if configured)
- n8n workflows ready

---

## 📞 VOICE AGENT CONNECTION

If you have voice agent (Bella) setup:

**Update Business Settings**:
```sql
UPDATE business_settings 
SET 
    agent_enabled = true,
    agent_phone_number = '+1-555-YOUR-NUMBER',
    elevenlabs_agent_id = 'YOUR_AGENT_ID'
WHERE id IN (SELECT id FROM business_settings LIMIT 1);
```

---

## ✅ VERIFICATION CHECKLIST

- [ ] Database created (no errors)
- [ ] Owner login created
- [ ] Can login to dashboard
- [ ] See sample services
- [ ] See sample staff
- [ ] Can create test booking
- [ ] Staff logins created (if needed)
- [ ] Settings updated

---

## 🎉 YOU'RE READY!

**Simple, Clean, Working System!**

No tenant IDs, no complexity - just one salon with multiple logins! 💪

---

**Need help? Check existing files or ask me!** 😊
