// src/lib/paystack.js
// ─── Paystack Nigerian Payment Integration ────────────────

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

/**
 * Load Paystack inline script dynamically (avoids bundle bloat).
 * Paystack popup is the simplest integration — no redirect needed.
 */
function loadPaystackScript() {
  return new Promise((resolve) => {
    if (window.PaystackPop) return resolve();
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.onload = resolve;
    document.head.appendChild(script);
  });
}

/**
 * Open the Paystack payment popup.
 * @param {object} options
 * @param {string} options.email     - Customer email (can be generated from phone)
 * @param {number} options.amount    - Amount in KOBO (multiply Naira × 100)
 * @param {string} options.phone     - Customer phone
 * @param {string} options.orderId   - Your order ID (used as metadata)
 * @param {function} options.onSuccess - Called with { reference } on success
 * @param {function} options.onClose   - Called when user closes popup
 */
export async function openPaystackPayment({ email, amount, phone, orderId, onSuccess, onClose }) {
  await loadPaystackScript();

  const handler = window.PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email: email || `${phone.replace("+", "")}@kanoexpress.ng`,
    amount: amount * 100,           // Paystack uses kobo
    currency: "NGN",
    ref: `KE-${orderId}-${Date.now()}`,
    metadata: {
      custom_fields: [
        { display_name: "Order ID", variable_name: "order_id", value: orderId },
        { display_name: "Phone", variable_name: "phone", value: phone },
      ],
    },
    callback: (response) => {
      onSuccess && onSuccess(response);
    },
    onClose: () => {
      onClose && onClose();
    },
  });

  handler.openIframe();
}

/**
 * Verify a Paystack transaction via your backend / Supabase Edge Function.
 * You should verify server-side before crediting wallet or marking order paid.
 * 
 * @param {string} reference - The Paystack reference returned in callback
 * @returns {boolean}
 */
export async function verifyPaystackTransaction(reference) {
  // This should call a Supabase Edge Function or your server
  // to verify with Paystack secret key (never expose secret key in frontend)
  try {
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-payment`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ reference }),
      }
    );
    const data = await res.json();
    return data.verified === true;
  } catch {
    return false;
  }
}

/**
 * Calculate delivery price for peer-to-peer delivery.
 * Simple formula: base + per-km rate
 */
export function calculateDeliveryFee(distanceKm) {
  const BASE = 400;
  const PER_KM = 80;
  return Math.round(BASE + distanceKm * PER_KM);
}

/**
 * Calculate distance between two coordinates (Haversine formula).
 */
export function distanceBetween(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
