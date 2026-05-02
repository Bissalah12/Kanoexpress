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

  return (
    <div style={{ ...S.screen,padding:"0",background:`linear-gradient(160deg, #0A0A0F 60%, #1a0a00)` }}>
      <div style={{ padding:"60px 24px 0" }}>
        <span style={{ fontSize:36 }}>🛵</span>
        <h1 style={{ fontSize:32,fontWeight:900,margin:"8px 0 6px",letterSpacing:-1 }}>KanoExpress</h1>
        <p style={{ color:C.textMid,fontSize:15,marginBottom:32 }}>Fast delivery across Kano City</p>

        {auth.error && (
          <div style={{ background:C.red+"22",border:`1px solid ${C.red}`,borderRadius:10,padding:"10px 14px",marginBottom:16,color:C.red,fontSize:13 }}>
            {auth.error}
          </div>
        )}

        {/* Toggle Sign In / Sign Up */}
        <div style={{ display:"flex",background:C.card,borderRadius:12,padding:4,marginBottom:24,border:`1px solid ${C.border}` }}>
          <button onClick={()=>auth.setIsSignUp(false)} style={{ flex:1,padding:"10px",border:"none",borderRadius:10,fontWeight:700,fontSize:14,cursor:"pointer",background:!auth.isSignUp?C.accent:"transparent",color:!auth.isSignUp?"#fff":C.textMid }}>
            Sign In
          </button>
          <button onClick={()=>auth.setIsSignUp(true)} style={{ flex:1,padding:"10px",border:"none",borderRadius:10,fontWeight:700,fontSize:14,cursor:"pointer",background:auth.isSignUp?C.accent:"transparent",color:auth.isSignUp?"#fff":C.textMid }}>
            Sign Up
          </button>
        </div>

        {auth.isSignUp && (
          <div style={{ marginBottom:14 }}>
            <label style={S.label}>Full Name</label>
            <
