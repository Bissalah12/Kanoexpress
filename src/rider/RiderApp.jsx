// src/rider/RiderApp.jsx
// ─── Rider App — wired to Supabase real-time dispatch ─────
import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useRider } from "../hooks/useRider";
import { useRiderOrder } from "../hooks/useOrder";
import { subscribeToPendingOrders, getRiderEarnings } from "../lib/supabase";
import { FullScreenLoader, Spinner } from "../components/NetworkGuard";
import MapView from "../components/MapView";

const C = {
  bg:"#0A0A0F",surface:"#13131A",card:"#1C1C26",border:"#2A2A38",
  accent:"#FF5C1A",green:"#22C55E",yellow:"#FBBF24",red:"#EF4444",
  blue:"#3B82F6",text:"#F0F0F5",textMid:"#9898AA",textDim:"#55556A",white:"#FFFFFF",
};
const S = {
  screen:{ minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Plus Jakarta Sans','Segoe UI',sans-serif",overflowX:"hidden" },
  card:{ background:C.card,borderRadius:16,border:`1px solid ${C.border}`,padding:"16px" },
  btn:{ background:C.accent,color:C.white,border:"none",borderRadius:12,padding:"14px 24px",fontWeight:700,fontSize:15,cursor:"pointer",width:"100%",letterSpacing:0.3 },
  btnOutline:{ background:"transparent",color:C.accent,border:`2px solid ${C.accent}`,borderRadius:12,padding:"12px 24px",fontWeight:700,fontSize:14,cursor:"pointer",width:"100%" },
  input:{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"13px 16px",color:C.text,fontSize:15,width:"100%",outline:"none",boxSizing:"border-box" },
  tag:(col)=>({ background:col+"22",color:col,borderRadius:8,padding:"4px 10px",fontSize:12,fontWeight:600 }),
  label:{ color:C.textMid,fontSize:13,marginBottom:6,display:"block" },
};

function RiderLoginScreen({ auth }) {
  const [phoneInput, setPhoneInput] = useState("");
  const [vehicle, setVehicle] = useState("motorcycle");
  return (
    <div style={{ ...S.screen,padding:"60px 24px" }}>
      <span style={{ fontSize:36 }}>🏍</span>
      <h1 style={{ fontSize:28,fontWeight:900,marginBottom:4 }}>Rider Portal</h1>
      <p style={{ color:C.textMid,marginBottom:32 }}>KanoExpress Delivery Network</p>
      {auth.error&&<div style={{ background:C.red+"22",border:`1px solid ${C.red}`,borderRadius:10,padding:"10px 14px",marginBottom:16,color:C.red,fontSize:13 }}>{auth.error}</div>}
      <div style={{ marginBottom:16 }}>
        <label style={S.label}>Phone Number</label>
        <div style={{ position:"relative" }}>
          <span style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:C.textMid,fontSize:14 }}>🇳🇬 +234</span>
          <input style={{ ...S.input,paddingLeft:80 }} placeholder="0812 345 6789" value={phoneInput} onChange={e=>setPhoneInput(e.target.value)} inputMode="tel" />
        </div>
      </div>
      <label style={S.label}>Vehicle Type</label>
      <div style={{ display:"flex",gap:10,marginBottom:24 }}>
        {[["bike","🚲","Bicycle"],["motorcycle","🏍","Motorcycle"],["car","🚗","Car"]].map(([v,ico,lbl])=>(
          <button key={v} onClick={()=>setVehicle(v)} style={{ flex:1,...S.card,border:vehicle===v?`2px solid ${C.accent}`:`1px solid ${C.border}`,cursor:"pointer",textAlign:"center",padding:"12px 6px" }}>
            <span style={{ fontSize:22 }}>{ico}</span>
            <p style={{ margin:"6px 0 0",fontSize:12,fontWeight:vehicle===v?700:400 }}>{lbl}</p>
          </button>
        ))}
      </div>
      <button style={{ ...S.btn,display:"flex",alignItems:"center",justifyContent:"center",gap:8 }} onClick={()=>auth.requestOTP(phoneInput)} disabled={auth.sending||phoneInput.length<8}>
        {auth.sending?<Spinner size={18} color="#fff" />:null} {auth.sending?"Sending OTP...":"Get OTP →"}
      </button>
    </div>
  );
}

function RiderOTPScreen({ auth }) {
  const [digits, setDigits] = useState(["","","","","",""]);
  const otp = digits.join("");
  return (
    <div style={{ ...S.screen,padding:"60px 24px" }}>
      <h2 style={{ fontSize:26,fontWeight:800,marginBottom:8 }}>Enter OTP</h2>
      <p style={{ color:C.textMid,marginBottom:32 }}>Sent to {auth.phone}</p>
      {auth.error&&<div style={{ background:C.red+"22",border:`1px solid ${C.red}`,borderRadius:10,padding:"10px 14px",marginBottom:16,color:C.red,fontSize:13 }}>{auth.error}</div>}
      <div style={{ display:"flex",gap:8,marginBottom:32 }}>
        {digits.map((d,i)=>(
          <input key={i} maxLength={1} inputMode="numeric" style={{ ...S.input,textAlign:"center",fontSize:22,fontWeight:700,width:48,padding:"14px 0",flex:1 }}
            value={d} onChange={e=>{ const n=[...digits]; n[i]=e.target.value; setDigits(n); if(e.target.value&&e.target.nextSibling)e.target.nextSibling.focus(); }} />
        ))}
      </div>
      <button style={{ ...S.btn,display:"flex",alignItems:"center",justifyContent:"center",gap:8 }} onClick={()=>auth.confirmOTP(otp)} disabled={auth.verifying||otp.length<6}>
        {auth.verifying?<Spinner size={18} color="#fff" />:null} {auth.verifying?"Verifying...":"Verify & Continue →"}
      </button>
    </div>
  );
}

export default function RiderApp() {
  const auth = useAuth("rider");
  const { isOnline, location, togglingOnline, toggleOnline } = useRider(auth.user);
  const { pendingOrders, activeDelivery, accepting, accept, advanceStatus, fetchPendingOrders } = useRiderOrder(auth.user);

  const [tab, setTab] = useState("home");
  const [earnings, setEarnings] = useState([]);
  const [showIncoming, setShowIncoming] = useState(null);
  const [requestTimer, setRequestTimer] = useState(15);

  // Subscribe to new pending orders when online
  useEffect(() => {
    if (!isOnline || !auth.user?.id) return;
    const channel = subscribeToPendingOrders((newOrder) => {
      setShowIncoming(newOrder);
      setRequestTimer(15);
    });
    return () => channel.unsubscribe();
  }, [isOnline, auth.user?.id]);

  // Request countdown timer
  useEffect(() => {
    if (!showIncoming || requestTimer <= 0) { if(requestTimer<=0) setShowIncoming(null); return; }
    const t = setTimeout(() => setRequestTimer(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [showIncoming, requestTimer]);

  // Load earnings once
  useEffect(() => {
    if (auth.user?.id && tab === "earnings") {
      getRiderEarnings(auth.user.id).then(setEarnings);
    }
  }, [tab, auth.user?.id]);

  const todayEarnings = earnings
    .filter(e => new Date(e.created_at).toDateString() === new Date().toDateString())
    .reduce((s, e) => s + e.amount, 0);

  const DELIVERY_STEPS = [
    { status:"rider_assigned",  btn:"Arrived at Pickup",  next:"rider_at_pickup" },
    { status:"rider_at_pickup", btn:"Confirm Item Pickup", next:"on_the_way" },
    { status:"on_the_way",      btn:"Mark as Delivered",  next:"delivered" },
  ];
  const currentStep = DELIVERY_STEPS.find(s => s.status === activeDelivery?.status);

  if (auth.loading) return <FullScreenLoader message="Loading Rider Portal..." />;
  if (!auth.user) return auth.otpSent ? <RiderOTPScreen auth={auth} /> : <RiderLoginScreen auth={auth} />;

  const tabScreens = {
    home: (
      <div style={{ padding:"0 20px" }}>
        <div style={{ padding:"20px 0 16px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div>
              <p style={{ margin:0,color:C.textMid,fontSize:13 }}>Welcome back</p>
              <h2 style={{ margin:"2px 0",fontSize:20,fontWeight:800 }}>{auth.user?.name||"Rider"} 🏍</h2>
            </div>
            <div style={{ textAlign:"right" }}>
              <p style={{ margin:0,fontSize:11,color:C.textMid }}>Today</p>
              <p style={{ margin:0,fontSize:16,fontWeight:800,color:C.green }}>₦{todayEarnings.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div style={{ ...S.card,display:"flex",alignItems:"center",gap:16,marginBottom:16,border:isOnline?`1px solid ${C.green}`:`1px solid ${C.border}` }}>
          <div style={{ flex:1 }}>
            <p style={{ margin:0,fontWeight:700,fontSize:16 }}>{isOnline?"🟢 You're Online":"⚫ You're Offline"}</p>
            <p style={{ margin:0,color:C.textMid,fontSize:13 }}>{isOnline?"Receiving delivery requests":"Go online to start earning"}</p>
          </div>
          <button onClick={toggleOnline} disabled={togglingOnline} style={{ background:togglingOnline?"#555":isOnline?C.green:C.border,border:"none",borderRadius:30,width:54,height:30,cursor:"pointer",position:"relative",transition:"background 0.3s",flexShrink:0 }}>
            {togglingOnline?<Spinner size={14} color="#fff" />:<span style={{ position:"absolute",top:3,left:isOnline?26:4,width:24,height:24,background:"#fff",borderRadius:"50%",transition:"left 0.3s",display:"block" }} />}
          </button>
        </div>

        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16 }}>
          {[["Today",earnings.filter(e=>new Date(e.created_at).toDateString()===new Date().toDateString()).length,"trips"],["Rating",auth.user?.rating||"5.0","★"],["Total",auth.user?.total_deliveries||0,"orders"]].map(([l,v,u])=>(
            <div key={l} style={{ ...S.card,textAlign:"center" }}>
              <p style={{ margin:0,color:C.textMid,fontSize:11 }}>{l}</p>
              <p style={{ margin:"4px 0 0",fontSize:20,fontWeight:800,color:C.accent }}>{v}</p>
              <p style={{ margin:0,color:C.textMid,fontSize:11 }}>{u}</p>
            </div>
          ))}
        </div>

        <MapView
          center={location?[location.lat,location.lng]:undefined}
          riderCoord={location?[location.lat,location.lng]:undefined}
          height="200px"
        />

        {isOnline&&!showIncoming&&!activeDelivery&&(
          <div style={{ ...S.card,marginTop:14,border:`1px solid ${C.green}`,display:"flex",gap:12,alignItems:"center" }}>
            <span style={{ fontSize:24 }}>🔍</span>
            <div>
              <p style={{ margin:0,fontWeight:700 }}>Looking for orders...</p>
              <p style={{ margin:0,color:C.textMid,fontSize:13 }}>Stay online to receive requests</p>
            </div>
          </div>
        )}

        {activeDelivery&&(
          <div style={{ ...S.card,marginTop:14,border:`1px solid ${C.accent}`,cursor:"pointer" }} onClick={()=>setTab("delivery")}>
            <p style={{ margin:"0 0 6px",fontWeight:700,color:C.accent }}>🚀 Active Delivery</p>
            <p style={{ margin:"0 0 4px",fontSize:14 }}>{activeDelivery.order_number}</p>
            <p style={{ margin:0,color:C.textMid,fontSize:13 }}>{activeDelivery.dropoff_address}</p>
          </div>
        )}

        {/* Incoming request popup */}
        {showIncoming&&(
          <div style={{ position:"fixed",bottom:70,left:"50%",transform:"translateX(-50%)",width:"calc(100% - 40px)",maxWidth:390,background:C.card,borderRadius:20,border:`2px solid ${C.accent}`,padding:20,zIndex:200,boxShadow:`0 0 40px ${C.accent}44` }}>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:12 }}>
              <span style={{ fontWeight:800,fontSize:16 }}>🔔 New Delivery Request</span>
              <div style={{ background:C.accent,borderRadius:"50%",width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:"#fff",fontSize:13 }}>{requestTimer}</div>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:14 }}>
              <div style={{ display:"flex",gap:8 }}><span style={{ color:C.accent }}>📍</span><span style={{ fontSize:14 }}>{showIncoming.pickup_address}</span></div>
              <div style={{ display:"flex",gap:8 }}><span style={{ color:C.green }}>🏁</span><span style={{ fontSize:14 }}>{showIncoming.dropoff_address}</span></div>
              <div style={{ display:"flex",gap:8 }}><span>📦</span><span style={{ fontSize:14,color:C.textMid }}>{showIncoming.item_description||"Package"}</span></div>
              <div style={{ display:"flex",gap:12 }}>
                <span style={{ ...S.tag(C.green) }}>💰 ₦{showIncoming.delivery_fee}</span>
              </div>
            </div>
            <div style={{ display:"flex",gap:10 }}>
              <button onClick={()=>setShowIncoming(null)} style={{ ...S.btnOutline,flex:1,padding:"10px" }}>Decline</button>
              <button onClick={async()=>{ await accept(showIncoming); setShowIncoming(null); setTab("delivery"); }} disabled={accepting} style={{ ...S.btn,flex:2,padding:"10px",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
                {accepting?<Spinner size={16} color="#fff" />:null} {accepting?"Accepting...":"✓ Accept"}
              </button>
            </div>
          </div>
        )}
        <div style={{ height:20 }} />
      </div>
    ),

    delivery: (
      <div style={{ padding:"0 20px" }}>
        <div style={{ padding:"20px 0 14px" }}>
          <h2 style={{ margin:0,fontSize:18,fontWeight:800 }}>Active Delivery</h2>
        </div>
        {activeDelivery?(
          <>
            <MapView
              pickupCoord={activeDelivery.pickup_lat?[activeDelivery.pickup_lat,activeDelivery.pickup_lng]:undefined}
              dropoffCoord={activeDelivery.dropoff_lat?[activeDelivery.dropoff_lat,activeDelivery.dropoff_lng]:undefined}
              riderCoord={location?[location.lat,location.lng]:undefined}
              height="220px"
            />
            <div style={{ ...S.card,marginTop:14,marginBottom:12 }}>
              <p style={{ margin:"0 0 10px",fontWeight:700,fontSize:15 }}>📋 {activeDelivery.order_number}</p>
              <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                <div style={{ display:"flex",gap:10 }}><span style={{ color:C.accent }}>📍</span><div><p style={{ margin:0,fontSize:13,color:C.textMid }}>Pickup</p><p style={{ margin:0,fontSize:14,fontWeight:600 }}>{activeDelivery.pickup_address}</p></div></div>
                <div style={{ display:"flex",gap:10 }}><span style={{ color:C.green }}>🏁</span><div><p style={{ margin:0,fontSize:13,color:C.textMid }}>Drop-off</p><p style={{ margin:0,fontSize:14,fontWeight:600 }}>{activeDelivery.dropoff_address}</p></div></div>
              </div>
            </div>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:16 }}>
              {DELIVERY_STEPS.map((step,i)=>(
                <div key={i} style={{ textAlign:"center",flex:1 }}>
                  <div style={{ width:32,height:32,borderRadius:"50%",background:activeDelivery.status===step.status?C.accent:DELIVERY_STEPS.findIndex(s=>s.status===activeDelivery.status)>i?C.green:C.border,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 4px",fontSize:14 }}>
                    {DELIVERY_STEPS.findIndex(s=>s.status===activeDelivery.status)>i?"✓":["📍","📦","✅"][i]}
                  </div>
                  <p style={{ margin:0,fontSize:10,color:C.textMid }}>{["At Pickup","Picked Up","Delivered"][i]}</p>
                </div>
              ))}
            </div>
            {currentStep&&(
              <button style={{ ...S.btn,background:currentStep.next==="delivered"?C.green:C.accent,display:"flex",alignItems:"center",justifyContent:"center",gap:8 }} onClick={()=>advanceStatus(activeDelivery)}>
                {currentStep.btn} →
              </button>
            )}
          </>
        ):(
          <div style={{ textAlign:"center",paddingTop:60 }}>
            <span style={{ fontSize:48 }}>🏁</span>
            <p style={{ color:C.textMid,marginTop:16 }}>No active delivery. Go online to receive requests.</p>
          </div>
        )}
        <div style={{ height:80 }} />
      </div>
    ),

    earnings: (
      <div style={{ padding:"0 20px" }}>
        <div style={{ padding:"20px 0 16px" }}><h2 style={{ margin:0,fontSize:18,fontWeight:800 }}>Earnings</h2></div>
        <div style={{ ...S.card,background:`linear-gradient(135deg, ${C.accent} 0%, #ff8c42 100%)`,border:"none",marginBottom:16 }}>
          <p style={{ margin:"0 0 6px",fontSize:13,opacity:0.8 }}>Today's Earnings</p>
          <p style={{ margin:"0 0 4px",fontSize:36,fontWeight:900 }}>₦{todayEarnings.toLocaleString()}</p>
          <p style={{ margin:0,opacity:0.8,fontSize:13 }}>{earnings.filter(e=>new Date(e.created_at).toDateString()===new Date().toDateString()).length} deliveries completed</p>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16 }}>
          {[
            ["This Week",earnings.filter(e=>{ const d=new Date(e.created_at); const now=new Date(); return (now-d)<7*86400000; }).reduce((s,e)=>s+e.amount,0)],
            ["All Time",earnings.reduce((s,e)=>s+e.amount,0)],
          ].map(([l,v])=>(
            <div key={l} style={S.card}>
              <p style={{ margin:"0 0 4px",color:C.textMid,fontSize:13 }}>{l}</p>
              <p style={{ margin:0,fontSize:20,fontWeight:800 }}>₦{v.toLocaleString()}</p>
            </div>
          ))}
        </div>
        <h3 style={{ fontSize:14,fontWeight:700,color:C.textMid,marginBottom:12 }}>RECENT DELIVERIES</h3>
        {earnings.length===0&&<p style={{ color:C.textMid,textAlign:"center",paddingTop:20 }}>No deliveries yet</p>}
        {earnings.slice(0,15).map(e=>(
          <div key={e.id} style={{ ...S.card,marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div>
              <p style={{ margin:0,fontWeight:600,fontSize:14 }}>{e.orders?.order_number||"Delivery"}</p>
              <p style={{ margin:0,color:C.textMid,fontSize:12 }}>{e.orders?.dropoff_address||""} · {new Date(e.created_at).toLocaleDateString("en-NG")}</p>
            </div>
            <span style={{ color:C.green,fontWeight:800 }}>+₦{e.amount}</span>
          </div>
        ))}
        <div style={{ height:80 }} />
      </div>
    ),
  };

  const tabBar=[{id:"home",icon:"🏠",label:"Home"},{id:"delivery",icon:"🗺️",label:"Delivery"},{id:"earnings",icon:"💰",label:"Earnings"}];

  return (
    <div style={S.screen}>
      <div style={{ maxWidth:430,margin:"0 auto",position:"relative",minHeight:"100vh" }}>
        <div style={{ overflowY:"auto",paddingBottom:70 }}>{tabScreens[tab]}</div>
        <div style={{ position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:C.surface,borderTop:`1px solid ${C.border}`,display:"flex",zIndex:100 }}>
          {tabBar.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1,background:"none",border:"none",padding:"10px 0 12px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2 }}>
              <span style={{ fontSize:22 }}>{t.icon}</span>
              <span style={{ fontSize:11,fontWeight:tab===t.id?700:400,color:tab===t.id?C.accent:C.textMid }}>{t.label}</span>
            </button>
          ))}
        </div>
        <button onClick={auth.logout} style={{ position:"fixed",top:10,right:16,background:"none",border:"none",color:C.textDim,fontSize:12,cursor:"pointer",zIndex:200 }}>Sign out</button>
      </div>
    </div>
  );
}
