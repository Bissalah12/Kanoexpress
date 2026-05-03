// src/customer/CustomerApp.jsx
// ─── Customer App — Email/Password + Google Auth ──────────
import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useOrder } from "../hooks/useOrder";
import { useWallet } from "../hooks/useRider";
import { getShops } from "../lib/supabase";
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
  btnOutline:{ background:"transparent",color:C.accent,border:`2px solid ${C.accent}`,borderRadius:12,padding:"13px 24px",fontWeight:700,fontSize:14,cursor:"pointer",width:"100%" },
  btnGoogle:{ background:"#fff",color:"#333",border:"1px solid #ddd",borderRadius:12,padding:"13px 24px",fontWeight:700,fontSize:14,cursor:"pointer",width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:10 },
  input:{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"13px 16px",color:C.text,fontSize:15,width:"100%",outline:"none",boxSizing:"border-box" },
  tag:(col)=>({ background:col+"22",color:col,borderRadius:8,padding:"4px 10px",fontSize:12,fontWeight:600 }),
  label:{ color:C.textMid,fontSize:13,marginBottom:6,display:"block" },
  row:{ display:"flex",alignItems:"center",gap:10 },
  divider:{ display:"flex",alignItems:"center",gap:12,margin:"16px 0" },
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

// ─── AUTH SCREEN ─────────────────────────────────────────
function AuthScreen({ auth }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [showPass, setShowPass] = useState(false);

  const isLogin  = auth.mode === "login";
  const isSignup = auth.mode === "signup";
  const isReset  = auth.mode === "reset";

  function handleSubmit() {
    if (isReset)  return auth.resetPassword(email);
    if (isSignup) return auth.signUp(email, password, name);
    return auth.login(email, password);
  }

  return (
    <div style={{ ...S.screen, display:"flex", flexDirection:"column", padding:"0" }}>
      {/* Hero */}
      <div style={{ background:`linear-gradient(160deg, #0A0A0F 60%, #1a0a00)`, padding:"50px 24px 32px", textAlign:"center" }}>
        <span style={{ fontSize:48 }}>🛵</span>
        <h1 style={{ fontSize:30,fontWeight:900,margin:"8px 0 4px",letterSpacing:-1 }}>KanoExpress</h1>
        <p style={{ color:C.textMid,fontSize:14,margin:0 }}>Fast delivery across Kano City</p>
      </div>

      {/* Form card */}
      <div style={{ flex:1,padding:"24px",background:C.bg }}>
        <div style={{ ...S.card,marginBottom:0 }}>

          {/* Tab switcher */}
          {!isReset && (
            <div style={{ display:"flex",background:C.surface,borderRadius:10,padding:4,marginBottom:20 }}>
              {[["login","Sign In"],["signup","Sign Up"]].map(([m,lbl])=>(
                <button key={m} onClick={()=>auth.setMode(m)} style={{ flex:1,background:auth.mode===m?C.card:"transparent",border:"none",borderRadius:8,padding:"10px",color:auth.mode===m?C.text:C.textMid,fontWeight:auth.mode===m?700:400,cursor:"pointer",fontSize:14,transition:"all 0.2s" }}>{lbl}</button>
              ))}
            </div>
          )}

          {isReset && (
            <div style={{ marginBottom:20 }}>
              <h2 style={{ margin:"0 0 4px",fontSize:20,fontWeight:800 }}>Reset Password</h2>
              <p style={{ margin:0,color:C.textMid,fontSize:13 }}>We'll send a reset link to your email</p>
            </div>
          )}

          {/* Error */}
          {auth.error && (
            <div style={{ background:C.red+"22",border:`1px solid ${C.red}`,borderRadius:10,padding:"10px 14px",marginBottom:16,color:C.red,fontSize:13 }}>
              {auth.error}
            </div>
          )}

          {/* Name field (signup only) */}
          {isSignup && (
            <div style={{ marginBottom:14 }}>
              <label style={S.label}>Full Name</label>
              <input style={S.input} placeholder="e.g. Adamu Bissalah" value={name} onChange={e=>setName(e.target.value)} />
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom:14 }}>
            <label style={S.label}>Email Address</label>
            <input style={S.input} type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} inputMode="email" />
          </div>

          {/* Password */}
          {!isReset && (
            <div style={{ marginBottom:20 }}>
              <label style={S.label}>Password</label>
              <div style={{ position:"relative" }}>
                <input style={{ ...S.input,paddingRight:50 }} type={showPass?"text":"password"} placeholder={isSignup?"Min. 6 characters":"Your password"} value={password} onChange={e=>setPassword(e.target.value)} />
                <button onClick={()=>setShowPass(s=>!s)} style={{ position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:C.textMid,cursor:"pointer",fontSize:16 }}>
                  {showPass?"🙈":"👁️"}
                </button>
              </div>
              {isLogin && (
                <p onClick={()=>auth.setMode("reset")} style={{ margin:"8px 0 0",color:C.accent,fontSize:13,cursor:"pointer",textAlign:"right" }}>
                  Forgot password?
                </p>
              )}
            </div>
          )}

          {/* Submit button */}
          <button
            style={{ ...S.btn,display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:auth.submitting?0.7:1 }}
            onClick={handleSubmit}
            disabled={auth.submitting}
          >
            {auth.submitting && <Spinner size={18} color="#fff" />}
            {isReset ? "Send Reset Link" : isSignup ? "Create Account →" : "Sign In →"}
          </button>

          {/* Divider */}
          {!isReset && (
            <>
              <div style={S.divider}>
                <div style={{ flex:1,height:1,background:C.border }} />
                <span style={{ color:C.textMid,fontSize:13 }}>or</span>
                <div style={{ flex:1,height:1,background:C.border }} />
              </div>

              {/* Google button */}
              <button style={S.btnGoogle} onClick={auth.loginWithGoogle}>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
            </>
          )}

          {/* Back to login */}
          {isReset && (
            <p onClick={()=>auth.setMode("login")} style={{ textAlign:"center",color:C.accent,fontSize:14,cursor:"pointer",marginTop:16 }}>
              ← Back to Sign In
            </p>
          )}
        </div>

        <p style={{ textAlign:"center",color:C.textDim,fontSize:12,marginTop:20 }}>
          By continuing you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}

// ─── MAIN CUSTOMER APP ────────────────────────────────────
export default function CustomerApp() {
  const auth = useAuth("customer");
  const { orders, activeOrder, setActiveOrder, placingOrder, placeOrder, fetchOrders, submitRating } = useOrder(auth.user);
  const { balance } = useWallet(auth.user?.id);

  const [tab, setTab]             = useState("home");
  const [shops, setShops]         = useState([]);
  const [shopsLoading, setShopsLoading] = useState(false);
  const [shopsError, setShopsError]     = useState(false);
  const [selectedShop, setSelectedShop] = useState(null);
  const [cart, setCart]           = useState([]);
  const [payMethod, setPayMethod] = useState("cash");
  const [searchQuery, setSearchQuery]   = useState("");
  const [rating, setRating]       = useState(0);
  const [reviewText, setReviewText]     = useState("");
  const [deliveryForm, setDeliveryForm] = useState({ pickup:"",dropoff:"",item:"" });
  const [deliveryQuote, setDeliveryQuote]   = useState(null);
  const [quotingDelivery, setQuotingDelivery] = useState(false);

  useEffect(() => { if (auth.user) loadShops(); }, [auth.user]);

  async function loadShops() {
    setShopsLoading(true); setShopsError(false);
    try { const data = await getShops(); setShops(data); }
    catch { setShopsError(true); }
    finally { setShopsLoading(false); }
  }

  if (auth.loading) return <FullScreenLoader message="Loading KanoExpress..." />;
  if (!auth.user)   return <AuthScreen auth={auth} />;

  const addToCart = (product) => setCart(c => {
    const ex = c.find(x=>x.id===product.id);
    if(ex) return c.map(x=>x.id===product.id?{...x,qty:x.qty+1}:x);
    return [...c,{...product,qty:1}];
  });
  const cartTotal = cart.reduce((s,i)=>s+i.price*i.qty,0);
  const cartCount = cart.reduce((s,i)=>s+i.qty,0);
  const deliveryFee = selectedShop?.delivery_fee||200;

  const displayName = auth.user?.name ||
    auth.user?.user_metadata?.full_name ||
    auth.user?.email?.split("@")[0] ||
    "friend";

  async function handlePlaceOrder() {
    const order = await placeOrder({
      cart, shop: selectedShop,
      paymentMethod: payMethod,
      pickupAddress: selectedShop?.name||"",
      dropoffAddress: "Customer address",
    });
    if(order){ setCart([]); setActiveOrder(order); setTab("tracking"); }
  }

  async function handleDeliveryRequest() {
    setQuotingDelivery(true);
    try {
      const [p,d] = await Promise.all([geocodeAddress(deliveryForm.pickup),geocodeAddress(deliveryForm.dropoff)]);
      if(!p||!d){ toast("Could not find one of the addresses","error"); return; }
      const { distanceBetween, calculateDeliveryFee } = await import("../lib/paystack");
      const dist = distanceBetween(...p,...d);
      setDeliveryQuote({ dist:dist.toFixed(1), price:calculateDeliveryFee(dist), pickupCoord:p, dropoffCoord:d });
    } finally { setQuotingDelivery(false); }
  }

  const filteredShops = shops.filter(s=>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.category||"").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusIndex = STATUS_MAP[activeOrder?.status]??0;

  const tabScreens = {
    home:(
      <div>
        <div style={{ padding:"20px 20px 12px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
            <div>
              <p style={{ margin:0,color:C.textMid,fontSize:13 }}>📍 Kano, Nigeria</p>
              <h2 style={{ margin:"2px 0 0",fontSize:20,fontWeight:800 }}>Good day, {displayName} 👋</h2>
            </div>
            <div style={{ background:C.card,borderRadius:12,padding:"8px 14px",border:`1px solid ${C.border}` }}>
              <p style={{ margin:0,fontSize:11,color:C.textMid }}>Wallet</p>
              <p style={{ margin:0,fontSize:14,fontWeight:700,color:C.green }}>₦{Number(balance).toLocaleString()}</p>
            </div>
          </div>
          <div style={{ position:"relative" }}>
            <span style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:16 }}>🔍</span>
            <input style={{ ...S.input,paddingLeft:44 }} placeholder="Search food, pharmacy, groceries..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} />
          </div>
        </div>
        <div style={{ padding:"0 20px 16px" }}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
            {[
              {icon:"🛵",label:"Send Package",color:C.accent,action:()=>setTab("delivery")},
              {icon:"📦",label:"My Orders",color:C.blue,action:()=>{fetchOrders();setTab("orders");}},
            ].map(q=>(
              <button key={q.label} onClick={q.action} style={{ ...S.card,border:`1px solid ${q.color}33`,cursor:"pointer",textAlign:"left",background:q.color+"11" }}>
                <span style={{ fontSize:24 }}>{q.icon}</span>
                <p style={{ margin:"8px 0 0",fontWeight:700,fontSize:14 }}>{q.label}</p>
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding:"0 20px" }}>
          <h3 style={{ fontSize:16,fontWeight:700,marginBottom:14,color:C.textMid }}>NEARBY SHOPS</h3>
          {shopsLoading&&<div style={{ textAlign:"center",padding:40 }}><Spinner /></div>}
          {shopsError&&<RetryButton onRetry={loadShops} loading={shopsLoading} />}
          <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
            {filteredShops.map(shop=>(
              <button key={shop.id} onClick={()=>{setSelectedShop(shop);setTab("shop");}} style={{ ...S.card,cursor:"pointer",textAlign:"left" }}>
                <div style={{ display:"flex",gap:14,alignItems:"center" }}>
                  <div style={{ background:(shop.color||C.accent)+"22",borderRadius:12,width:52,height:52,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0 }}>{shop.img_emoji||"🏪"}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                      <p style={{ margin:0,fontWeight:700,fontSize:15 }}>{shop.name}</p>
                      <span style={{ ...S.tag(shop.color||C.accent),marginLeft:8 }}>{shop.category}</span>
                    </div>
                    <div style={{ display:"flex",gap:12,marginTop:4 }}>
                      <span style={{ color:C.yellow,fontSize:13 }}>★ {shop.rating}</span>
                      <span style={{ color:C.textMid,fontSize:13 }}>⏱ {shop.eta_min}-{shop.eta_max} min</span>
                      <span style={{ color:C.textMid,fontSize:13 }}>🛵 ₦{shop.delivery_fee}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div style={{ height:80 }} />
      </div>
    ),

    shop: selectedShop&&(
      <div>
        <div style={{ background:(selectedShop.color||C.accent)+"22",padding:"40px 20px 24px" }}>
          <button onClick={()=>setTab("home")} style={{ background:C.bg+"AA",border:"none",borderRadius:10,padding:"6px 14px",color:C.text,cursor:"pointer",marginBottom:16,fontSize:14 }}>‹ Back</button>
          <div style={{ fontSize:48,marginBottom:10 }}>{selectedShop.img_emoji||"🏪"}</div>
          <h2 style={{ margin:"0 0 4px",fontSize:22,fontWeight:800 }}>{selectedShop.name}</h2>
          <div style={{ display:"flex",gap:12 }}>
            <span style={{ color:C.yellow,fontSize:14 }}>★ {selectedShop.rating}</span>
            <span style={{ color:C.textMid,fontSize:14 }}>⏱ {selectedShop.eta_min}-{selectedShop.eta_max} min</span>
            <span style={{ color:C.textMid,fontSize:14 }}>🛵 ₦{selectedShop.delivery_fee}</span>
          </div>
        </div>
        <div style={{ padding:"16px 20px" }}>
          <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
            {(selectedShop.products||[]).filter(p=>p.available).map(p=>{
              const inCart=cart.find(c=>c.id===p.id);
              return(
                <div key={p.id} style={{ ...S.card,display:"flex",alignItems:"center",gap:14 }}>
                  <div style={{ background:(selectedShop.color||C.accent)+"22",borderRadius:10,width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>{p.img_emoji||"🍽️"}</div>
                  <div style={{ flex:1 }}>
                    <p style={{ margin:0,fontWeight:600,fontSize:14 }}>{p.name}</p>
                    <p style={{ margin:"2px 0 0",color:C.accent,fontWeight:700 }}>₦{p.price.toLocaleString()}</p>
                  </div>
                  {inCart?(
                    <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                      <button onClick={()=>setCart(c=>c.map(x=>x.id===p.id?{...x,qty:Math.max(0,x.qty-1)}:x).filter(x=>x.qty>0))} style={{ background:C.border,border:"none",borderRadius:8,width:28,height:28,color:C.text,cursor:"pointer",fontSize:16 }}>−</button>
                      <span style={{ fontWeight:700 }}>{inCart.qty}</span>
                      <button onClick={()=>addToCart(p)} style={{ background:C.accent,border:"none",borderRadius:8,width:28,height:28,color:"#fff",cursor:"pointer",fontSize:16 }}>+</button>
                    </div>
                  ):(
                    <button onClick={()=>addToCart(p)} style={{ background:C.accent,border:"none",borderRadius:8,width:32,height:32,color:"#fff",cursor:"pointer",fontSize:18 }}>+</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {cartCount>0&&(
          <div style={{ position:"sticky",bottom:70,padding:"0 20px 12px" }}>
            <button onClick={()=>setTab("checkout")} style={{ ...S.btn,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <span style={{ background:"#fff3",borderRadius:6,padding:"2px 8px",fontSize:13 }}>{cartCount}</span>
              <span>View Cart</span>
              <span>₦{cartTotal.toLocaleString()}</span>
            </button>
          </div>
        )}
        <div style={{ height:80 }} />
      </div>
    ),

    checkout:(
      <div>
        <div style={{ display:"flex",alignItems:"center",gap:12,padding:"16px 20px 8px",background:C.bg,position:"sticky",top:0,zIndex:50 }}>
          <button onClick={()=>setTab("shop")} style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:10,width:36,height:36,cursor:"pointer",color:C.text,fontSize:18,display:"flex",alignItems:"center",justifyContent:"center" }}>‹</button>
          <span style={{ fontWeight:700,fontSize:18 }}>Checkout</span>
        </div>
        <div style={{ padding:"16px 20px" }}>
          <div style={{ marginBottom:20 }}>
            {cart.map(i=>(
              <div key={i.id} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${C.border}` }}>
                <div style={{ display:"flex",gap:10,alignItems:"center" }}>
                  <span style={{ fontSize:20 }}>{i.img_emoji||"🍽️"}</span>
                  <div><p style={{ margin:0,fontSize:14,fontWeight:600 }}>{i.name}</p><p style={{ margin:0,color:C.textMid,fontSize:13 }}>x{i.qty}</p></div>
                </div>
                <span style={{ fontWeight:700 }}>₦{(i.price*i.qty).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div style={{ ...S.card,marginBottom:16 }}>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}><span style={{ color:C.textMid }}>Subtotal</span><span>₦{cartTotal.toLocaleString()}</span></div>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}><span style={{ color:C.textMid }}>Delivery fee</span><span>₦{deliveryFee}</span></div>
            <div style={{ display:"flex",justifyContent:"space-between",paddingTop:8,borderTop:`1px solid ${C.border}` }}><span style={{ fontWeight:700 }}>Total</span><span style={{ color:C.accent,fontWeight:800,fontSize:17 }}>₦{(cartTotal+deliveryFee).toLocaleString()}</span></div>
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={S.label}>Payment Method</label>
            {[["cash","💵","Cash on Delivery"],["bank_transfer","🏦","Bank Transfer (Paystack)"],["wallet","👛",`Wallet (₦${Number(balance).toLocaleString()})`]].map(([val,ico,lbl])=>(
              <button key={val} onClick={()=>setPayMethod(val)} style={{ ...S.card,display:"flex",alignItems:"center",gap:12,marginBottom:8,border:payMethod===val?`2px solid ${C.accent}`:`1px solid ${C.border}`,cursor:"pointer",width:"100%",textAlign:"left" }}>
                <span style={{ fontSize:22 }}>{ico}</span>
                <span style={{ fontWeight:600,fontSize:14 }}>{lbl}</span>
                {payMethod===val&&<span style={{ marginLeft:"auto",color:C.accent,fontSize:18 }}>✓</span>}
              </button>
            ))}
          </div>
          <button style={{ ...S.btn,display:"flex",alignItems:"center",justifyContent:"center",gap:8 }} onClick={handlePlaceOrder} disabled={placingOrder}>
            {placingOrder&&<Spinner size={18} color="#fff" />}
            {placingOrder?"Placing Order...":"Place Order →"}
          </button>
        </div>
      </div>
    ),

    tracking: activeOrder&&(
      <div>
        <div style={{ display:"flex",alignItems:"center",gap:12,padding:"16px 20px 8px",background:C.bg,position:"sticky",top:0,zIndex:50 }}>
          <button onClick={()=>setTab("home")} style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:10,width:36,height:36,cursor:"pointer",color:C.text,fontSize:18,display:"flex",alignItems:"center",justifyContent:"center" }}>‹</button>
          <span style={{ fontWeight:700,fontSize:18 }}>Live Tracking</span>
        </div>
        <div style={{ padding:"0 20px" }}>
          <MapView height="220px" />
          <div style={{ ...S.card,margin:"14px 0",display:"flex",alignItems:"center",gap:14 }}>
            <div style={{ background:C.blue+"33",borderRadius:"50%",width:48,height:48,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22 }}>🏍</div>
            <div style={{ flex:1 }}>
              <p style={{ margin:0,fontWeight:700 }}>Ibrahim Usman</p>
              <p style={{ margin:0,color:C.textMid,fontSize:13 }}>Motorcycle • {activeOrder.order_number}</p>
            </div>
            <button style={{ background:C.green,border:"none",borderRadius:10,padding:"8px 14px",color:"#fff",cursor:"pointer",fontWeight:600,fontSize:13 }}>📞 Call</button>
          </div>
          <div style={{ ...S.card,marginBottom:14 }}>
            {ORDER_STATUS_LABELS.map((s,i)=>(
              <div key={s} style={{ display:"flex",gap:12,alignItems:"center",padding:"8px 0" }}>
                <div style={{ width:22,height:22,borderRadius:"50%",background:i<=statusIndex?C.accent:C.border,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:11,color:"#fff",fontWeight:700 }}>{i<=statusIndex?"✓":i+1}</div>
                <span style={{ fontSize:14,fontWeight:i===statusIndex?700:400,color:i<=statusIndex?C.text:C.textDim }}>{s}</span>
                {i===statusIndex&&<span style={{ ...S.tag(C.accent),marginLeft:"auto" }}>Active</span>}
              </div>
            ))}
          </div>
          {activeOrder.status==="delivered"&&!activeOrder.customer_rating&&(
            <div style={{ ...S.card,border:`1px solid ${C.green}`,marginBottom:14 }}>
              <p style={{ margin:"0 0 8px",fontWeight:700,color:C.green }}>✓ Delivered!</p>
              <label style={S.label}>Rate your experience</label>
              <StarRating val={rating} onRate={setRating} />
              <textarea style={{ ...S.input,marginTop:10,height:70,resize:"none" }} placeholder="Leave a review..." value={reviewText} onChange={e=>setReviewText(e.target.value)} />
              <button style={{ ...S.btn,marginTop:10 }} onClick={async()=>{await submitRating(activeOrder.id,rating,reviewText);setTab("home");}}>Submit & Done</button>
            </div>
          )}
        </div>
        <div style={{ height:80 }} />
      </div>
    ),

    delivery:(
      <div>
        <div style={{ display:"flex",alignItems:"center",gap:12,padding:"16px 20px 8px",background:C.bg,position:"sticky",top:0,zIndex:50 }}>
          <button onClick={()=>setTab("home")} style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:10,width:36,height:36,cursor:"pointer",color:C.text,fontSize:18,display:"flex",alignItems:"center",justifyContent:"center" }}>‹</button>
          <span style={{ fontWeight:700,fontSize:18 }}>Send a Package</span>
        </div>
        <div style={{ padding:"16px 20px" }}>
          <MapView pickupCoord={deliveryQuote?.pickupCoord} dropoffCoord={deliveryQuote?.dropoffCoord} />
          <div style={{ marginTop:16,display:"flex",flexDirection:"column",gap:12 }}>
            <div><label style={S.label}>📍 Pickup Location</label><input style={S.input} placeholder="Enter pickup address in Kano" value={deliveryForm.pickup} onChange={e=>setDeliveryForm(f=>({...f,pickup:e.target.value}))} /></div>
            <div><label style={S.label}>🏁 Drop-off Location</label><input style={S.input} placeholder="Enter destination address" value={deliveryForm.dropoff} onChange={e=>setDeliveryForm(f=>({...f,dropoff:e.target.value}))} /></div>
            <div><label style={S.label}>📦 Describe the Item</label><input style={S.input} placeholder="e.g. Documents, Food package..." value={deliveryForm.item} onChange={e=>setDeliveryForm(f=>({...f,item:e.target.value}))} /></div>
            {!deliveryQuote?(
              <button style={{ ...S.btn,display:"flex",alignItems:"center",justifyContent:"center",gap:8 }} onClick={handleDeliveryRequest} disabled={quotingDelivery||!deliveryForm.pickup||!deliveryForm.dropoff}>
                {quotingDelivery&&<Spinner size={18} color="#fff" />}
                {quotingDelivery?"Calculating...":"Get Price Estimate →"}
              </button>
            ):(
              <div>
                <div style={{ ...S.card,border:`1px solid ${C.accent}`,marginBottom:12 }}>
                  <p style={{ margin:"0 0 10px",fontWeight:700 }}>📊 Delivery Estimate</p>
                  <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}><span style={{ color:C.textMid }}>Distance</span><span>{deliveryQuote.dist} km</span></div>
                  <div style={{ display:"flex",justifyContent:"space-between",paddingTop:8,borderTop:`1px solid ${C.border}` }}><span style={{ fontWeight:700 }}>Price</span><span style={{ color:C.accent,fontWeight:800,fontSize:18 }}>₦{deliveryQuote.price.toLocaleString()}</span></div>
                </div>
                <button style={S.btn} onClick={async()=>{ const o=await placeOrder({cart:[],shop:null,paymentMethod:payMethod,pickupAddress:deliveryForm.pickup,dropoffAddress:deliveryForm.dropoff}); if(o){setActiveOrder(o);setDeliveryQuote(null);setTab("tracking");} }} disabled={placingOrder}>
                  {placingOrder?<Spinner size={18} color="#fff" />:null} Confirm & Find Rider →
                </button>
              </div>
            )}
          </div>
        </div>
        <div style={{ height:80 }} />
      </div>
    ),

    orders:(
      <div>
        <div style={{ display:"flex",alignItems:"center",gap:12,padding:"16px 20px 8px",background:C.bg,position:"sticky",top:0,zIndex:50 }}>
          <span style={{ fontWeight:700,fontSize:18 }}>Order History</span>
        </div>
        <div style={{ padding:"16px 20px" }}>
          {orders.length===0?<p style={{ color:C.textMid,textAlign:"center",marginTop:40 }}>No orders yet</p>:orders.map(o=>(
            <div key={o.id} style={{ ...S.card,marginBottom:12,cursor:"pointer" }} onClick={()=>{setActiveOrder(o);setTab("tracking");}}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}>
                <span style={{ fontWeight:700,fontSize:15 }}>{o.shops?.name||"Package Delivery"}</span>
                <span style={{ ...S.tag(o.status==="delivered"?C.green:o.status==="cancelled"?C.red:C.accent) }}>{o.status}</span>
              </div>
              <p style={{ color:C.textMid,fontSize:13,margin:"0 0 6px" }}>{o.order_number}</p>
              <div style={{ display:"flex",justifyContent:"space-between" }}>
                <span style={{ color:C.textMid,fontSize:12 }}>{new Date(o.created_at).toLocaleString("en-NG")}</span>
                <span style={{ fontWeight:700,color:C.accent }}>₦{o.total?.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ height:80 }} />
      </div>
    ),
  };

  const tabBar=[{id:"home",icon:"🏠",label:"Home"},{id:"delivery",icon:"🛵",label:"Send"},{id:"orders",icon:"📦",label:"Orders"}];

  return (
    <div style={S.screen}>
      <div style={{ maxWidth:430,margin:"0 auto",position:"relative",minHeight:"100vh" }}>
        <div style={{ overflowY:"auto",paddingBottom:70 }}>{tabScreens[tab]||tabScreens.home}</div>
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
