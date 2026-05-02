// src/customer/CustomerApp.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useOrder } from "../hooks/useOrder";
import { useWallet } from "../hooks/useRider";
import { getShops } from "../lib/supabase";
import { calculateDeliveryFee, distanceBetween } from "../lib/paystack";
import { toast } from "../lib/notifications";
import { FullScreenLoader, Spinner, RetryButton } from "../components/NetworkGuard";
import MapView, { geocodeAddress } from "../components/MapView";

const C = {
  bg:"#0A0A0F",surface:"#13131A",card:"#1C1C26",border:"#2A2A38",
  accent:"#FF5C1A",green:"#22C55E",yellow:"#FBBF24",red:"#EF4444",
  blue:"#3B82F6",text:"#F0F0F5",textMid:"#9898AA",textDim:"#55556A",white:"#FFFFFF",
};
const S = {
  screen:{ minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Plus Jakarta Sans','Segoe UI',sans-serif" },
  card:{ background:C.card,borderRadius:16,border:`1px solid ${C.border}`,padding:"16px" },
  btn:{ background:C.accent,color:C.white,border:"none",borderRadius:12,padding:"14px 24px",fontWeight:700,fontSize:15,cursor:"pointer",width:"100%" },
  btnOutline:{ background:"transparent",color:C.accent,border:`2px solid ${C.accent}`,borderRadius:12,padding:"12px 24px",fontWeight:700,fontSize:14,cursor:"pointer",width:"100%" },
  input:{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"13px 16px",color:C.text,fontSize:15,width:"100%",outline:"none",boxSizing:"border-box" },
  tag:(col)=>({ background:col+"22",color:col,borderRadius:8,padding:"4px 10px",fontSize:12,fontWeight:600 }),
  label:{ color:C.textMid,fontSize:13,marginBottom:6,display:"block" },
};

const ORDER_STATUS_LABELS = ["Order Placed","Accepted","Rider Assigned","Rider at Pickup","On the Way","Delivered"];
const STATUS_MAP = { pending:0,accepted:1,rider_assigned:2,rider_at_pickup:3,on_the_way:4,delivered:5 };

function StarRating({ val, onRate }) {
  return (
    <div style={{ display:"flex",gap:4 }}>
      {[1,2,3,4,5].map(s=>(
        <span key={s} onClick={()=>onRate&&onRate(s)} style={{ fontSize:22,cursor:onRate?"pointer":"default",color:s<=val?C.yellow:C.textDim }}>★</span>
      ))}
    </div>
  );
}

// ─── LOGIN SCREEN ─────────────────────────────────────────

function LoginScreen({ auth }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  function handleSubmit() {
    if (auth.isSignUp) {
      if (!name.trim()) return auth.setError?.("Please enter your full name.");
      if (!email.trim()) return auth.setError?.("Please enter your email.");
      if (password.length < 6) return auth.setError?.("Password must be at least 6 characters.");
      auth.signUp(email, password, name);
    } else {
      if (!email.trim()) return auth.setError?.("Please enter your email.");
      if (!password) return auth.setError?.("Please enter your password.");
      auth.signIn(email, password);
    }
  }

  return (
    <div style={{ ...S.screen, padding: "0", background: `linear-gradient(160deg, #0A0A0F 60%, #1a0a00)` }}>
      <div style={{ padding: "60px 24px 0" }}>
        <span style={{ fontSize: 36 }}>🛵</span>
        <h1 style={{ fontSize: 32, fontWeight: 900, margin: "8px 0 6px", letterSpacing: -1 }}>KanoExpress</h1>
        <p style={{ color: C.textMid, fontSize: 15, marginBottom: 32 }}>Fast delivery across Kano City</p>

        {auth.error && (
          <div style={{ background: C.red + "22", border: `1px solid ${C.red}`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: C.red, fontSize: 13 }}>
            {auth.error}
          </div>
        )}

        {/* Toggle Sign In / Sign Up */}
        <div style={{ display: "flex", background: C.card, borderRadius: 12, padding: 4, marginBottom: 24, border: `1px solid ${C.border}` }}>
          <button onClick={() => auth.setIsSignUp(false)} style={{ flex: 1, padding: "10px", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer", background: !auth.isSignUp ? C.accent : "transparent", color: !auth.isSignUp ? "#fff" : C.textMid }}>
            Sign In
          </button>
          <button onClick={() => auth.setIsSignUp(true)} style={{ flex: 1, padding: "10px", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer", background: auth.isSignUp ? C.accent : "transparent", color: auth.isSignUp ? "#fff" : C.textMid }}>
            Sign Up
          </button>
        </div>

        {/* Google Sign In Button */}
        <button
          onClick={() => auth.signInWithGoogle()}
          disabled={auth.submitting}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: C.white, color: "#111", border: "none", borderRadius: 12, padding: "13px 24px", fontWeight: 700, fontSize: 15, cursor: "pointer", width: "100%", marginBottom: 16, opacity: auth.submitting ? 0.6 : 1 }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.7 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 10-1.9 13.6-5.1l-6.3-5.2C29.5 35.5 26.9 36 24 36c-5.2 0-9.6-2.9-11.3-7H6.1C9.5 39.6 16.3 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.4-2.5 4.4-4.7 5.8l6.3 5.2C40.9 35.4 44 30.1 44 24c0-1.3-.1-2.7-.4-4z"/>
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ color: C.textDim, fontSize: 13 }}>or</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>

        {/* Name field (Sign Up only) */}
        {auth.isSignUp && (
          <div style={{ marginBottom: 14 }}>
            <label style={S.label}>Full Name</label>
            <input
              style={S.input}
              placeholder="Your full name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
        )}

        {/* Email */}
        <div style={{ marginBottom: 14 }}>
          <label style={S.label}>Email Address</label>
          <input
            style={S.input}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom: 24 }}>
          <label style={S.label}>Password</label>
          <input
            style={S.input}
            type="password"
            placeholder={auth.isSignUp ? "Min. 6 characters" : "Your password"}
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={auth.submitting}
          style={{ ...S.btn, opacity: auth.submitting ? 0.6 : 1, marginBottom: 32 }}
        >
          {auth.submitting ? "Please wait..." : auth.isSignUp ? "Create Account" : "Sign In"}
        </button>
      </div>
    </div>
  );
}
