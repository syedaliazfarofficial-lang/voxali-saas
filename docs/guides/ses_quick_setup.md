# AWS SES Quick Setup - Action Items

## 📋 **Your To-Do List:**

### ✅ **Step 1: Verify Email (5 mins)**
1. AWS Console → SES → Verified identities
2. Create identity → Email address
3. Enter: `owner@luxeaurea.com` (or your email)
4. Check inbox → Click verification link

### ✅ **Step 2: Create SMTP Credentials (3 mins)**
1. SES → SMTP settings
2. Create SMTP credentials
3. **SAVE THESE!** (Can't retrieve later)

### ✅ **Step 3: Configure Supabase (5 mins)**
1. Supabase → Settings → Auth → SMTP Settings
2. Enable Custom SMTP
3. Fill:
   - Host: `email-smtp.us-east-1.amazonaws.com` (or your region)
   - Port: `587`
   - Username: [From Step 2]
   - Password: [From Step 2]
   - Sender: `owner@luxeaurea.com`
   - Name: `Luxe Aurea Salon`

---

## 📝 **What I Need From You:**

After setup, give me:
1. ✅ SMTP Username
2. ✅ SMTP Password  
3. ✅ SMTP Server (e.g., email-smtp.us-east-1.amazonaws.com)
4. ✅ Region (e.g., us-east-1)
5. ✅ Sender Email

---

## ⏱️ **Time**: 15 minutes  
## 💰 **Cost**: ~$0.03/month (basically free!)

---

**When done, reply:**
> "Done! SES configured"

Then I'll start building! 🚀
