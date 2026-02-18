# 🚀 Dashboard Live Deployment Guide

## Step 1: Google Sheet Ko Public Karna

### Option A: Share Link (Easy)
1. Google Sheet open karo
2. Top right → **"Share"** button click karo
3. **"General access"** → **"Anyone with the link"** select karo
4. Role: **"Viewer"** rakhein
5. **"Done"** click karo

### Option B: Publish to Web (Recommended)
1. Google Sheet open karo
2. **File → Share → Publish to web**
3. **"Entire Document"** select karo
4. **"Web page"** format select karo
5. **"Publish"** click karo
6. Green banner dekho: "Published!"

---

## Step 2: Sheet ID Verify Karo

Aapki Google Sheet URL:
```
https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit
```

Sheet ID: `1eSrEN3u9FXPCW2xd701ERjoPqGjkGejZd6Tpl9WgKX0`

Dashboard code mein ye ID already set hai.

---

## Step 3: Vercel Pe Deploy Karna (FREE)

### 3.1 Vercel Account
1. Go to: https://vercel.com
2. **"Sign Up"** click karo
3. **"Continue with GitHub"** ya **"Continue with Email"**

### 3.2 Dashboard Deploy Karo

**Method 1: Drag & Drop (Easy)**
1. Vercel dashboard open karo
2. **"Add New..."** → **"Project"**
3. **"Deploy"** section mein apna **Dashboard folder** drag karo
```
D:\VoxAli_Agency\01_Projacts\VoxAli Salon Spa\Dashboard\
```
4. Vercel automatically deploy karega
5. Live URL milega: `luxe-aurea-xyz.vercel.app`

**Method 2: GitHub (Recommended)**
1. GitHub pe repository create karo
2. Dashboard files upload karo
3. Vercel mein **"Import from GitHub"**
4. Repository select karo
5. Auto-deploy ho jayega

---

## Step 4: Custom Domain (Optional)

1. Vercel project settings → **Domains**
2. Add: `dashboard.luxeaurea.com`
3. DNS settings → CNAME to `cname.vercel-dns.com`

---

## 📋 Quick Commands (Terminal)

### Vercel CLI Install
```bash
npm install -g vercel
```

### Deploy Command
```bash
cd "D:\VoxAli_Agency\01_Projacts\VoxAli Salon Spa\Dashboard"
vercel
```

### Login
```bash
vercel login
```

---

## ✅ Final Checklist

| Step | Task | Status |
|------|------|--------|
| 1 | Google Sheet published | ⬜ |
| 2 | Sheet ID in code verified | ⬜ |
| 3 | Vercel account created | ⬜ |
| 4 | Dashboard folder uploaded | ⬜ |
| 5 | Live URL received | ⬜ |
| 6 | Test login on live | ⬜ |
| 7 | Share with client | ⬜ |

---

## 🔗 Your URLs After Deploy

| URL | Purpose |
|-----|---------|
| `https://luxe-aurea.vercel.app/login.html` | Client Login Page |
| `https://luxe-aurea.vercel.app/` | Dashboard |
