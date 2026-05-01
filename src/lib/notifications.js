// src/lib/notifications.js
// ─── Push Notifications + In-App Toast System ─────────────

const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

// ─── PUSH NOTIFICATIONS ───────────────────────────────────

export async function requestPushPermission() {
  if (!("Notification" in window)) return false;
  const permission = await Notification.requestPermission();
  return permission === "granted";
}

export async function subscribeToPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;

  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) return existing;

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
    });
    return sub;
  } catch {
    return null;
  }
}

// Show an in-app browser notification (works without push service)
export function showLocalNotification(title, body, icon = "🛵") {
  if (Notification.permission === "granted") {
    new Notification(`${icon} ${title}`, { body, icon: "/icon-192.png" });
  }
}

// ─── IN-APP TOAST ─────────────────────────────────────────
// Simple event-based toast system — subscribe in Toast.jsx

const listeners = [];

export function toast(message, type = "info", duration = 3500) {
  const event = { message, type, id: Date.now() };
  listeners.forEach((fn) => fn(event));

  // Auto-clear
  setTimeout(() => {
    listeners.forEach((fn) => fn({ ...event, remove: true }));
  }, duration);
}

export function onToast(callback) {
  listeners.push(callback);
  return () => {
    const i = listeners.indexOf(callback);
    if (i > -1) listeners.splice(i, 1);
  };
}

// ─── ORDER STATUS NOTIFICATIONS ───────────────────────────

const STATUS_MESSAGES = {
  accepted:        { title: "Order Accepted! 🎉", body: "The shop is preparing your order." },
  rider_assigned:  { title: "Rider on the way! 🏍", body: "A rider has been assigned to your order." },
  rider_at_pickup: { title: "Rider at shop 📍", body: "Your rider is collecting your order." },
  on_the_way:      { title: "Order on the way! 🚀", body: "Your order is heading to you." },
  delivered:       { title: "Delivered! ✅", body: "Enjoy your order. Please rate your experience." },
  cancelled:       { title: "Order Cancelled ❌", body: "Your order was cancelled." },
};

export function notifyOrderStatus(status) {
  const msg = STATUS_MESSAGES[status];
  if (!msg) return;
  toast(msg.title + " " + msg.body, status === "delivered" ? "success" : "info");
  showLocalNotification(msg.title, msg.body);
}

// ─── HELPER ───────────────────────────────────────────────
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
}
