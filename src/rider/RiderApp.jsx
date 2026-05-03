// src/rider/RiderApp.jsx
// ─── Rider App — Email/Password Auth ──────────────────────
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
  screen:{ minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Plus Jakarta Sans','Segoe UI',sans-serif" },
  card:{ background:C.card,borderRadius:16,border:`1px solid ${C.border}`,padding:"16px" },
  btn:{ background:C.accent,color:C.white,border:"none",borderRadius:12,padding:"14px 24px",fontWeight:700,fontSize:15,cursor:"pointer",width:"100%" },
  btnOutline:{ background:"transparent",color:C.accent,border:`2px solid ${C.accent}`,borderRadius:12,padding:"12px 24px",fontWeight:700,fontSize:14,cursor:"pointer",width:"100%" },
  input:{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"13px 16px",color:C.text,fontSize:15,width:"100%",outline:"none",boxSizing:"border-box" },
  tag:(col)=>({ background:col+"22",color:col,borderRadius:8,padding:"4px 10px",fontSize:12,fontWeight:600 }),
  label:{ color:C.textMid,fontSize:13,marginBottom:6,display:"block" },
  divider:{ display:"flex",alignItems:"center",gap:12,margin:"16px 0" },
  btnGoogle:{ background:"#fff",color:"#333",border:"1px solid #ddd",borderRadius:12,padding:"13px 24px",fontWeight:700,fontSize:14,cursor:"pointer",width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:10 },
};

function RiderAuthScreen({ auth }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [vehicle, setVehicle]   = useState("motorcycle");
  const [showPass, setShowPass] = useState(false);

  const isLogin = auth.mode === "login";

  function handleSubmit() {
    if (isLogin) return auth.login(email, password);
    return auth.signUp(email, password, name);
  }

  return (
    <div style={{ ...S.screen, padding:"0" }}>
      <div style={{ background:`linear-gradient(160deg, #0A0A0F 60%, #001a0a)`, padding:"50px 24px 32px", textAlign:"center" }}>
        <span style={{ fontSize:48 }}>🏍</span>
        <h1 style={{ fontSize:28,fontWeight:900,margin:"8px 0 4px" }}>Rider Portal</h1>
        <p style={{ color:C.textMid,fontSize:14,margin:0 }}>KanoExpress Delivery Network</p>
      </div>

      <div style={{ flex:1,padding:"24px",background:C.bg }}>
        <div style={S.card}>
          {/* Tab switcher */}
          <div style={{ display:"flex",background:C.surface,borderRadius:10,padding:4,marginBottom:20 }}>
            {[["login","Sign In"],["signup","Sign Up"]].map(([m,lbl])=>(
              <button key={m} onClick={()=>auth.setMode(m)} style={{ flex:1,background:auth.mode===m?C.card:"transparent",border:"none",borderRadius:8,padding:"10px",color:auth.mode===m?C.text:C.textMid,fontWeight:auth.mode===m?700:400,cursor:"pointer",fontSize:14 }}>{lbl}</button>
            ))}
          </div>

          {auth.error&&(
            <div style={{ background:C.red+"22",border:`1px solid ${C.red}`,borderRadius:10,padding:"10px 14px",marginBottom:16,color:C.red,fontSize:13 }}>{auth.error}</div>
          )}

          {!isLogin&&(
            <div style={{ marginBottom:14 }}>
              <label style={S.label}>Full Name</label>
              <input style={S.input} placeholder="e.g. Ibrahim Usman" value={name} onChange={e=>setName(e.target.value)} />
            </div>
          )}

          <div style={{ marginBottom:14 }}>
            <label style={S.label}>Email Address</label>
            <input style={S.input} type="email" placeholder="rider@example.com" value={email} onChange={e=>setEmail(e.target.value)} inputMode="email" />
          </div>

          <div style={{ marginBottom:!isLogin?14:20 }}>
            <label style={S.label}>Password</label>
            <div style={{ position:"relative" }}>
              <input style={{ ...S.input,paddingRight:50 }} type={showPass?"text":"password"} placeholder={!isLogin?"Min. 6 characters":"Your password"} value={password} onChange={e=>setPassword(e.target.value)} />
              <button onClick={()=>setShowPass(s=>!s)} style={{ position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:C.textMid,cursor:"pointer",fontSize:16 }}>
                {showPass?"🙈":"👁️"}
              </button>
            </div>
          </div>

          {!isLogin&&(
            <div style={{ marginBottom:20 }}>
              <label style={S.label}>Vehicle Type</label>
              <div style={{ display:"flex",gap:10 }}>
                {[["bike","🚲","Bicycle"],["motorcycle","🏍","Motorcycle"],["car","🚗","Car"]].map(([v,ico,lbl])=>(
                  <button key={v} onClick={()=>setVehicle(v)} style={{ flex:1,...S.card,border:vehicle===v?`2px solid ${C.accent}`:`1px solid ${C.border}`,cursor:"pointer",textAlign:"center",padding:"12px 6px" }}>
                    <span style={{ fontSize:22 }}>{ico}</span>
                    <p style={{ margin:"6px 0 0",fontSize:12,fontWeight:vehicle===v?700:400 }}>{lbl}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button style={{ ...S.btn,display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:auth.submitting?0.7:1 }} onClick={handleSubmit} disabled={auth.submitting}>
            {auth.submitting&&<Spinner size={18} color="#fff" />}
            {isLogin?"Sign In →":"Create Rider Account →"}
          </button>

          <div style={S.divider}>
            <div style={{ flex:1,height:1,background:C.border }} />
            <span style={{ color:C.textMid,fontSize:13 }}>or</span>
            <div style={{ flex:1,height:1,background:C.border }} />
          </div>

          <button style={S.btnGoogle} onClick={auth.loginWithGoogle}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RiderApp() {
  const auth = useAuth("rider");
  const { isOnline, location, togglingOnline, toggleOnline } = useRider(auth.user);
  const { pendingOrders, activeDelivery, accepting, accept, advanceStatus } = useRiderOrder(auth.user);

  const [tab, setTab]           = useState("home");
  const [earnings, setEarnings] = useState([]);
  const [showIncoming, setShowIncoming] = useState(null);
  const [requestTimer, setRequestTimer] = useState(15);

  useEffect(() => {
    if (!isOnline || !auth.user?.id) return;
    const channel = subscribeToPendingOrders((newOrder) => {
      setShowIncoming(newOrder);
      setRequestTimer(15);
    });
    return () => channel.unsubscribe();
  }, [isOnline, auth.user?.id]);

  useEffect(() => {
    if (!showIncoming || requestTimer <= 0) { if(requestTimer<=0) setShowIncoming(null); return; }
    const t = setTimeout(() => setRequestTimer(r=>r-1), 1000);
    return () => clearTimeout(t);
  }, [showIncoming, requestTimer]);

  useEffect(() => {
    if (auth.user?.id && tab==="earnings") {
      getRiderEarnings(auth.user.id).then(setEarnings);
    }
  }, [tab, auth.user?.id]);

  const todayEarnings = earnings
    .filter(e=>new Date(e.created_at).toDateString()===new Date().toDateString())
    .reduce((s,e)=>s+e.amount,0);

  const DELIVERY_STEPS = [
    { status:"rider_assigned",  btn:"Arrived at Pickup" },
    { status:"rider_at_pickup", btn:"Confirm Item Pickup" },
    { status:"on_the_way",      btn:"Mark as Delivered" },
  ];
  const currentStep = DELIVERY_STEPS.find(s=>s.status===activeDelivery?.status);

  const displayName = auth.user?.name ||
    auth.user?.user_metadata?.full_name ||
    auth.user?.email?.split("@")[0] ||
    "Rider";

  if (auth.loading) return <FullScreenLoader message="Loading Rider Portal..." />;
  if (!auth.user)   return <RiderAuthScreen auth={auth} />;

  const tabScreens = {
    home:(
      <div style={{ padding:"0 20px" }}>
        <div style={{ padding:"20px 0 16px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div>
              <p style={{ margin:0,color:C.textMid,fontSize:13 }}>Welcome back</p>
              <h2 style={{ margin:"2px 0",fontSize:20,fontWeight:800 }}>{displayName} 🏍</h2>
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
          {[
            ["Today", earnings.filter(e=>new Date(e.created_at).toDateString()===new Date().toDateString()).length, "trips"],
            ["Rating", auth.user?.rating||"5.0","★"],
            ["Total", auth.user?.total_deliveries||0,"orders"],
          ].map(([l,v,u])=>(
            <div key={l} style={{ ...S.card,textAlign:"center" }}>
              <p style={{ margin:0,color:C.textMid,fontSize:11 }}>{l}</p>
              <p style={{ margin:"4px 0 0",fontSize:20,fontWeight:800,color:C.accent }}>{v}</p>
              <p style={{ margin:0,color:C.textMid,fontSize:11 }}>{u}</p>
            </div>
          ))}
        </div>

        <MapView center={location?[location.lat,location.lng]:undefined} riderCoord={location?[location.lat,location.lng]:undefined} height="200px" />

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

        {showIncoming&&(
          <div style={{ position:"fixed",bottom:70,left:"50%",transform:"translateX(-50%)",width:"calc(100% - 40px)",maxWidth:390,background:C.card,borderRadius:20,border:`2px solid ${C.accent}`,padding:20,zIndex:200,boxShadow:`0 0 40px ${C.accent}44` }}>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:12 }}>
              <span style={{ fontWeight:800,fontSize:16 }}>🔔 New Delivery Request</span>
              <div style={{ background:C.accent,borderRadius:"50%",width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:"#fff",fontSize:13 }}>{requestTimer}</div>
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:14 }}>
              <div style={{ display:"flex",gap:8 }}><span style={{ color:C.accent }}>📍</span><span style={{ fontSize:14 }}>{showIncoming.pickup_address}</span></div>
              <div style={{ display:"flex",gap:8 }}><span style={{ color:C.green }}>🏁</span><span style={{ fontSize:14 }}>{showIncoming.dropoff_address}</span></div>
              <span style={{ ...S.tag(C.green) }}>💰 ₦{showIncoming.delivery_fee}</span>
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

    delivery:(
      <div style={{ padding:"0 20px" }}>
        <div style={{ padding:"20px 0 14px" }}><h2 style={{ margin:0,fontSize:18,fontWeight:800 }}>Active Delivery</h2></div>
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
              <button style={{ ...S.btn,background:currentStep.btn==="Mark as Delivered"?C.green:C.accent }} onClick={()=>advanceStatus(activeDelivery)}>
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

    earnings:(
      <div style={{ padding:"0 20px" }}>
        <div style={{ padding:"20px 0 16px" }}><h2 style={{ margin:0,fontSize:18,fontWeight:800 }}>Earnings</h2></div>
        <div style={{ ...S.card,background:`linear-gradient(135deg, ${C.accent} 0%, #ff8c42 100%)`,border:"none",marginBottom:16 }}>
          <p style={{ margin:"0 0 6px",fontSize:13,opacity:0.8 }}>Today's Earnings</p>
          <p style={{ margin:"0 0 4px",fontSize:36,fontWeight:900 }}>₦{todayEarnings.toLocaleString()}</p>
          <p style={{ margin:0,opacity:0.8,fontSize:13 }}>{earnings.filter(e=>new Date(e.created_at).toDateString()===new Date().toDateString()).length} deliveries completed</p>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16 }}>
          {[
            ["This Week", earnings.filter(e=>(new Date()-new Date(e.created_at))<7*86400000).reduce((s,e)=>s+e.amount,0)],
            ["All Time",  earnings.reduce((s,e)=>s+e.amount,0)],
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
              <p style={{ margin:0,color:C.textMid,fontSize:12 }}>{new Date(e.created_at).toLocaleDateString("en-NG")}</p>
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
