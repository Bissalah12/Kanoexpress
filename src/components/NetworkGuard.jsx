// src/components/NetworkGuard.jsx
// ─── Offline banner, loading states, toast system ─────────
import { useState, useEffect } from "react";
import { onToast } from "../lib/notifications";

const C = {
  bg: "#0A0A0F", card: "#1C1C26", border: "#2A2A38",
  accent: "#FF5C1A", green: "#22C55E", red: "#EF4444",
  yellow: "#FBBF24", text: "#F0F0F5", textMid: "#9898AA",
};

// ─── OFFLINE BANNER ───────────────────────────────────────
export function NetworkGuard({ children }) {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  return (
    <>
      {offline && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
          background: C.red, color: "#fff", textAlign: "center",
          padding: "10px 16px", fontSize: 13, fontWeight: 600,
          fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif",
        }}>
          📵 No internet connection. Some features may not work.
        </div>
      )}
      <div style={{ paddingTop: offline ? 40 : 0 }}>
        {children}
      </div>
    </>
  );
}

// ─── TOAST CONTAINER ──────────────────────────────────────
export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsub = onToast((event) => {
      if (event.remove) {
        setToasts((t) => t.filter((x) => x.id !== event.id));
      } else {
        setToasts((t) => [...t.slice(-2), event]); // max 3 toasts
      }
    });
    return unsub;
  }, []);

  const colors = { success: C.green, error: C.red, info: C.accent, warning: C.yellow };

  return (
    <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", zIndex: 9998, width: "calc(100% - 40px)", maxWidth: 390, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
      {toasts.map((t) => (
        <div key={t.id} style={{
          background: C.card,
          border: `1px solid ${colors[t.type] || C.accent}`,
          borderLeft: `4px solid ${colors[t.type] || C.accent}`,
          borderRadius: 12,
          padding: "12px 16px",
          color: C.text,
          fontSize: 14,
          fontWeight: 600,
          fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif",
          boxShadow: "0 8px 24px #00000088",
          animation: "slideUp 0.25s ease",
        }}>
          {t.message}
        </div>
      ))}
      <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}

// ─── SPINNER ─────────────────────────────────────────────
export function Spinner({ size = 24, color = C.accent }) {
  return (
    <div style={{ display: "inline-block", width: size, height: size, border: `3px solid ${color}33`, borderTop: `3px solid ${color}`, borderRadius: "50%", animation: "spin 0.7s linear infinite" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── FULL SCREEN LOADING ─────────────────────────────────
export function FullScreenLoader({ message = "Loading..." }) {
  return (
    <div style={{
      minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 16,
      fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif",
    }}>
      <span style={{ fontSize: 36 }}>🛵</span>
      <Spinner size={36} />
      <p style={{ color: C.textMid, fontSize: 14, margin: 0 }}>{message}</p>
    </div>
  );
}

// ─── RETRY BUTTON ─────────────────────────────────────────
export function RetryButton({ onRetry, loading }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px" }}>
      <p style={{ color: C.textMid, fontSize: 14, marginBottom: 16 }}>
        Something went wrong. Check your connection.
      </p>
      <button
        onClick={onRetry}
        disabled={loading}
        style={{
          background: C.accent, border: "none", borderRadius: 12,
          padding: "12px 28px", color: "#fff", fontWeight: 700,
          fontSize: 14, cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.6 : 1, display: "inline-flex", gap: 8, alignItems: "center",
        }}
      >
        {loading ? <Spinner size={16} color="#fff" /> : "🔄"} Retry
      </button>
    </div>
  );
}
