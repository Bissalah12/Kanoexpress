# KanoExpress — Production Setup & Deployment Guide

> Built on top of the existing KanoExpress prototype.
> Stack: React + Vite · Supabase (auth, DB, real-time) · Paystack (payments) · OpenStreetMap/Leaflet (maps)

---

## 1. PREREQUISITES

Install these before starting:

```bash
node --version   # Need v18 or higher
npm --version    # Need v9 or higher
```

Install Supabase CLI:
```bash
npm install -g supabase
```

---

## 2. PROJECT SETUP

### Clone and install
```bash
git clone https://github.com/YOUR_USERNAME/kanoexpress.git
cd kanoexpress
npm install
```

### Create environment file
```bash
cp .env.example .env
# Then edit .env with your real keys (see Step 3 & 4)
```

---

## 3. SUPABASE SETUP (Free tier is fine to start)

### 3a. Create a project
1. Go to https://supabase.com and sign up
2. Click **New Project**
3. Name: `kanoexpress`
4. Region: Choose **Europe West** (closest to Nigeria with good latency)
5. Set a strong database password — save it somewhere safe
6. Wait ~2 minutes for project to spin up

### 3b. Get your API keys
1. Go to **Project Settings → API**
2. Copy:
   - **Project URL** → paste as `VITE_SUPABASE_URL` in `.env`
   - **anon public key** → paste as `VITE_SUPABASE_ANON_KEY` in `.env`

### 3c. Run the database schema
1. Go to **SQL Editor** in your Supabase dashboard
2. Click **New Query**
3. Paste the contents of `supabase/schema.sql` → Click **Run**
4. Paste the contents of `supabase/rls.sql` → Click **Run**
5. Paste the contents of `supabase/wallet_functions.sql` → Click **Run**

You should now see these tables in **Table Editor**:
- users, wallets, transactions, shops, products, riders, orders, order_items, rider_earnings

### 3d. Enable Phone OTP Auth
1. Go to **Authentication → Providers**
2. Enable **Phone** provider
3. For SMS provider, choose **Twilio** (or Termii for Nigerian numbers):

**Using Twilio (recommended):**
```
Account SID: from https://console.twilio.com
Auth Token: from Twilio console
Message Service SID: create one in Twilio Messaging
```

**Using Termii (cheaper for Nigerian SMS):**
```
API Key: from https://termii.com/account/api
Sender ID: KANOEXP (or your brand name — must be approved)
```

> **Important:** Supabase OTP for phone auth requires a paid Twilio account.
> For development/testing, you can disable phone confirm in:
> **Authentication → Settings → Disable email confirmations** (and use magic link or just test with known numbers).

### 3e. Configure Realtime
1. Go to **Database → Replication**
2. Enable replication on these tables:
   - `orders` ✅
   - `riders` ✅

---

## 4. PAYSTACK SETUP

### 4a. Create account
1. Go to https://paystack.com and sign up (Nigerian business or personal account)
2. Complete KYC (takes 1-3 business days for live mode)

### 4b. Get API keys
1. Go to **Settings → API Keys & Webhooks**
2. For development: copy **Test Public Key** → paste as `VITE_PAYSTACK_PUBLIC_KEY` in `.env`
3. For production: use **Live Public Key** (after KYC approval)

> The secret key is only used server-side in the Edge Function — never expose it in client code.

### 4c. Deploy the payment verification Edge Function
```bash
# Login to Supabase CLI
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_ID

# Set the Paystack secret key as a secret
supabase secrets set PAYSTACK_SECRET_KEY=sk_test_YOUR_SECRET_KEY

# Deploy the function
supabase functions deploy verify-payment
```

---

## 5. RUN LOCALLY

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

**To test on a real Android phone on the same WiFi:**
```bash
# Vite exposes on local network automatically
# Check the terminal output for the Network URL, e.g.:
# ➜  Network: http://192.168.1.5:5173/
# Open that URL on your Android phone
```

---

## 6. DATABASE SCHEMA OVERVIEW

```
users           — Customer profiles (linked to Supabase auth)
wallets         — One wallet per user, stores ₦ balance
transactions    — Wallet credit/debit history
shops           — Vendor shops (seeded with 4 Kano shops)
products        — Items per shop
riders          — Rider profiles with GPS coordinates
orders          — All orders (shop + peer-to-peer delivery)
order_items     — Line items per order
rider_earnings  — Earnings log per rider per delivery
```

**Order Status Flow:**
```
pending → accepted → rider_assigned → rider_at_pickup → on_the_way → delivered
                                                                    ↘ cancelled
```

---

## 7. HOW REAL-TIME WORKS

### Customer tracking
When a customer places an order:
1. Order is inserted into `orders` table with status `pending`
2. `subscribeToOrder(orderId, callback)` opens a Supabase Realtime channel
3. Any status UPDATE on that row fires the callback instantly
4. The tracking screen updates with no polling needed

### Rider dispatch
When a rider goes online:
1. `setRiderOnline()` updates `riders.is_online = true` + saves GPS coords
2. `subscribeToPendingOrders()` listens for INSERT events on `orders`
3. New orders trigger the incoming request popup with a 15-second countdown
4. `acceptOrder()` uses a guarded UPDATE (`WHERE status = 'pending'`) to prevent two riders accepting simultaneously

### Location updates
- Rider GPS is tracked via `navigator.geolocation.watchPosition`
- Updates are debounced to every 10 seconds to avoid excessive DB writes
- Kano city center (12.0022, 8.5920) is used as fallback if GPS is unavailable

---

## 8. PAYMENT FLOW

### Cash on Delivery
1. Order created with `payment_method = 'cash'`, `payment_status = 'pending'`
2. Rider collects cash on delivery
3. Admin can manually mark as paid

### Bank Transfer (Paystack inline)
1. Paystack popup opens in-browser
2. Customer pays with card, bank transfer, or USSD
3. On success, `verifyPaystackTransaction(reference)` calls the Edge Function
4. Edge Function verifies with Paystack secret key and marks order as paid

### Wallet
1. `debitWallet()` RPC atomically deducts balance
2. Fails if balance < order total (prevents overdraft)
3. Customer can top up wallet via Paystack → `creditWallet()` RPC

---

## 9. MAPS (OpenStreetMap + Leaflet)

- **No API key needed** — uses free OpenStreetMap tiles
- **Geocoding** uses Nominatim (free, rate-limited to 1 req/second)
- For production with high traffic, consider:
  - Self-hosting a tile server (can run on a ₦5,000/month VPS)
  - Switching to **Stadia Maps** (free tier available, faster)
- Rider location on map updates in real-time as rider moves

---

## 10. BUILD FOR PRODUCTION

```bash
npm run build
```

Output is in the `dist/` folder. You can deploy this anywhere.

---

## 11. DEPLOYMENT OPTIONS

### Option A: Vercel (Easiest — Free tier)
```bash
npm install -g vercel
vercel
# Follow prompts — it detects Vite automatically
# Add env variables in Vercel dashboard → Settings → Environment Variables
```

### Option B: Netlify (Also free)
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

### Option C: Your own VPS (DigitalOcean, Contabo, etc.)
```bash
# Build
npm run build

# Install nginx
sudo apt install nginx

# Copy dist to nginx web root
sudo cp -r dist/* /var/www/html/

# Nginx config for SPA (add this to /etc/nginx/sites-available/default)
# location / {
#   try_files $uri $uri/ /index.html;
# }

sudo systemctl restart nginx
```

### Recommended for Nigeria
**Vercel** is fastest to deploy and has global CDN. The free tier handles thousands of users easily.

---

## 12. ANDROID APP (Optional — Next Step)

To distribute as a real Android APK:

### Option A: PWA (No Play Store needed)
The app already has `manifest.json`. When users open it in Chrome on Android, they'll see **"Add to Home Screen"** — this installs it like a native app.

### Option B: Capacitor (Wraps web app in native APK)
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init KanoExpress com.kanoexpress.app
npx cap add android
npm run build
npx cap copy android
npx cap open android
# Opens Android Studio — click Run to build APK
```

### Option C: React Native (Full rewrite — for future)
The hooks (`useAuth`, `useOrder`, `useRider`) and all Supabase/Paystack logic are framework-agnostic. You can reuse `src/lib/` and `src/hooks/` directly in a React Native project with minimal changes.

---

## 13. ADMIN PANEL ACCESS

The admin panel is hidden by default (click the tiny ⚙ at the bottom of the portal switcher).

**To protect it in production**, add a simple token check:

In `src/admin/AdminPanel.jsx`, add at the top:
```jsx
const ADMIN_TOKEN = "your-secret-token";
const token = new URLSearchParams(window.location.search).get("token");
if (token !== ADMIN_TOKEN) return <div>Access denied</div>;
```

Or better: create a separate Supabase auth role for admins and check `auth.user.role === 'admin'`.

---

## 14. ENVIRONMENT VARIABLES REFERENCE

| Variable | Where to get it | Required? |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase → Settings → API | ✅ Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API | ✅ Yes |
| `VITE_PAYSTACK_PUBLIC_KEY` | Paystack → Settings → API | ✅ Yes |
| `VITE_TERMII_API_KEY` | termii.com account | ❌ Optional (SMS) |
| `VITE_VAPID_PUBLIC_KEY` | Generate with `npx web-push generate-vapid-keys` | ❌ Optional (push) |

---

## 15. COST ESTIMATE (Monthly)

| Service | Free Tier | Paid |
|---|---|---|
| Supabase | 500MB DB, 2GB bandwidth | $25/mo for Pro |
| Vercel | 100GB bandwidth | $20/mo for Pro |
| Paystack | Free, 1.5% + ₦100 per transaction | Per transaction |
| OpenStreetMap tiles | Free (fair use) | Self-host if high traffic |
| Twilio SMS | $15 setup + ~₦15/SMS | Pay as you go |
| **Total to launch** | **~₦0 (free tiers)** | **~$45/mo at scale** |

---

## 16. QUICK CHECKLIST BEFORE LAUNCH

- [ ] Supabase schema.sql, rls.sql, wallet_functions.sql all run successfully
- [ ] Phone OTP auth enabled in Supabase with SMS provider configured
- [ ] `.env` file filled with real keys (not example values)
- [ ] Paystack test payments working (use test card: 4084084084084081)
- [ ] Edge Function `verify-payment` deployed and `PAYSTACK_SECRET_KEY` set
- [ ] Replication enabled for `orders` and `riders` tables in Supabase
- [ ] App tested on real Android device on mobile data (not just WiFi)
- [ ] Admin panel access secured with token or role check

---

## SUPPORT & NEXT STEPS

**Immediate next steps for production:**
1. Add real shop owners (seed more `shops` + `products`)
2. Recruit and onboard 5-10 test riders in Kano
3. Run a soft launch in one neighborhood (e.g. BUK, Nasarawa GRA)
4. Monitor orders in Admin Panel and fix edge cases

**Recommended features for v2:**
- Push notifications via FCM (Firebase Cloud Messaging)
- Rider photo upload to Supabase Storage
- Customer address book (save frequent addresses)
- Promo codes table + discount logic
- WhatsApp order confirmation (via Twilio WhatsApp API)
