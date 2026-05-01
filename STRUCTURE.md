kanoexpress/
├── public/
│   ├── index.html
│   └── manifest.json          # PWA manifest
├── src/
│   ├── main.jsx               # Entry point
│   ├── App.jsx                # Root switcher (UPDATED — no Business)
│   ├── tokens.js              # Design tokens (unchanged)
│   │
│   ├── lib/
│   │   ├── supabase.js        # Supabase client + table helpers
│   │   ├── paystack.js        # Paystack payment helpers
│   │   ├── notifications.js   # Push + SMS notification helpers
│   │   └── geo.js             # Distance/proximity helpers
│   │
│   ├── hooks/
│   │   ├── useAuth.js         # OTP auth state
│   │   ├── useOrder.js        # Real-time order subscription
│   │   ├── useRider.js        # Rider state + dispatch logic
│   │   └── useWallet.js       # Wallet balance + transactions
│   │
│   ├── components/
│   │   ├── MapView.jsx        # Leaflet map (replaces MapPlaceholder)
│   │   ├── TopBar.jsx
│   │   ├── StarRating.jsx
│   │   ├── Spinner.jsx        # Loading state
│   │   ├── Toast.jsx          # Error/success toast
│   │   └── NetworkGuard.jsx   # Offline banner + retry
│   │
│   ├── customer/
│   │   ├── CustomerApp.jsx    # UPDATED — real auth + orders
│   │   ├── screens/
│   │   │   ├── Login.jsx
│   │   │   ├── OTP.jsx
│   │   │   ├── Home.jsx
│   │   │   ├── Shop.jsx
│   │   │   ├── Checkout.jsx
│   │   │   ├── Tracking.jsx
│   │   │   ├── DeliveryRequest.jsx
│   │   │   └── Orders.jsx
│   │   └── cart.js            # Cart state (Zustand)
│   │
│   ├── rider/
│   │   ├── RiderApp.jsx       # UPDATED — real dispatch
│   │   └── screens/
│   │       ├── RiderLogin.jsx
│   │       ├── RiderHome.jsx
│   │       ├── ActiveDelivery.jsx
│   │       └── Earnings.jsx
│   │
│   └── admin/
│       └── AdminPanel.jsx     # Lightweight admin (new)
│
├── supabase/
│   ├── schema.sql             # Full DB schema
│   └── rls.sql                # Row Level Security policies
│
├── .env.example
├── package.json
└── vite.config.js
