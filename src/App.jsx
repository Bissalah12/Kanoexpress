// src/App.jsx
// ─── Root — Customer App + Rider App + Admin ──────────────
// Business Dashboard has been removed per requirements.

import { useState } from "react";
import CustomerApp from "./customer/CustomerApp";
import RiderApp from "./rider/RiderApp";
import AdminPanel from "./admin/AdminPanel";
import { NetworkGuard, ToastContainer } from "./components/NetworkGuard";

const C = {
  bg:"#0A0A0F",card:"#1C1C26",border:"#2A2A38",
  accent:"#FF5C1A",green:"#22C55E",blue:"#3B82F6",
  text:"#F0F0F5",textMid:"#9898AA",
};
const tag=(col)=>({ background:col+"22",color:col,borderRadius:8,padding:"4px 10px",fontSize:10,fontWeight:600 });

const PORTALS = [
  { id:"customer", icon:"📱", title:"Customer App",  sub:"Order food, groceries & send packages", color:C.accent },
  { id:"rider",    icon:"🏍", title:"Rider App",     sub:"Accept deliveries & track earnings",    color:C.blue },
];

function Switcher({ onSelect }) {
  return (
    <div style={{ minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Plus Jakarta Sans','Segoe UI',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",background:`radial-gradient(ellipse at 20% 50%, #1a0800 0%, ${C.bg} 60%)` }}>
      <div style={{ maxWidth:480,width:"100%",padding:"40px 24px",textAlign:"center" }}>
        <span style={{ fontSize:52 }}>🛵</span>
        <h1 style={{ fontSize:36,fontWeight:900,margin:"8px 0 4px",letterSpacing:-1.5 }}>KanoExpress</h1>
        <p style={{ color:C.textMid,fontSize:16,marginBottom:48 }}>Delivery Marketplace · Kano, Nigeria</p>
        <p style={{ color:C.textMid,fontSize:13,letterSpacing:2,marginBottom:20,fontWeight:600 }}>SELECT A PORTAL</p>
        <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
          {PORTALS.map(a=>(
            <button key={a.id} onClick={()=>onSelect(a.id)} style={{ background:C.card,border:`1px solid ${a.color}44`,borderRadius:18,padding:"20px 22px",cursor:"pointer",textAlign:"left",display:"flex",gap:16,alignItems:"center" }}>
              <div style={{ background:a.color+"22",borderRadius:14,width:54,height:54,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,flexShrink:0 }}>{a.icon}</div>
              <div style={{ flex:1 }}>
                <p style={{ margin:"0 0 4px",fontWeight:800,fontSize:16 }}>{a.title}</p>
                <p style={{ margin:0,color:C.textMid,fontSize:13 }}>{a.sub}</p>
              </div>
              <span style={{ color:a.color,fontSize:20 }}>›</span>
            </button>
          ))}
        </div>
        <div style={{ marginTop:40,background:C.card,borderRadius:16,border:`1px solid ${C.border}`,padding:"16px 20px",textAlign:"left" }}>
          <p style={{ margin:"0 0 8px",fontWeight:700,fontSize:14 }}>📍 Kano, Nigeria</p>
          <p style={{ margin:0,color:C.textMid,fontSize:13 }}>All features are pre-configured for Kano. Real OTP auth, live map tracking, Paystack payments, and real-time order updates.</p>
        </div>
        {/* Hidden admin link — add ?admin=1 to URL */}
        <p style={{ marginTop:24,color:C.border,fontSize:11,cursor:"pointer" }} onClick={()=>onSelect("admin")}>⚙</p>
      </div>
    </div>
  );
}

export default function App() {
  const [activeApp, setActiveApp] = useState(null);

  const SwitchBtn = () => (
    <div style={{ position:"fixed",top:8,left:"50%",transform:"translateX(-50%)",zIndex:9999 }}>
      <button onClick={()=>setActiveApp(null)} style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:20,padding:"6px 16px",color:C.textMid,fontSize:12,cursor:"pointer" }}>← Switch App</button>
    </div>
  );

  return (
    <NetworkGuard>
      <ToastContainer />
      {activeApp === "customer" && <><SwitchBtn /><CustomerApp /></>}
      {activeApp === "rider"    && <><SwitchBtn /><RiderApp /></>}
      {activeApp === "admin"    && <AdminPanel onBack={()=>setActiveApp(null)} />}
      {!activeApp               && <Switcher onSelect={setActiveApp} />}
    </NetworkGuard>
  );
}
