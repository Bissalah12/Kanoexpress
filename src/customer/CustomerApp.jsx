// src/customer/CustomerApp.jsx
// ─── Customer App — wired to Supabase + Paystack ──────────
import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useOrder } from "../hooks/useOrder";
import { useWallet } from "../hooks/useRider";
import { getShops } from "../lib/supabase";
import { openPaystackPayment } from "../lib/paystack";
import { toast } from "../lib/notifications";
import { FullScreenLoader, Spinner, RetryButton } from "../components/NetworkGuard";
import MapView, { geocodeAddress } from "../components/MapView";

// ─── DESIGN TOKENS (shared) ──────────────────────────────
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
  row:{ display:"flex",alignItems:"center",gap:10 },
};

const ORDER_STATUS_LABELS = ["Order Placed","Accepted by Shop","Rider Assigned","Rider at Pickup","On the Way","Delivered"];
const STATUS_MAP = { pending:0, accepted:1, rider_assigned:2, rider_at_pickup:3, on_the_way:4, delivered:5 };

function StarRating({ val, onRate }) {
  return (
    <div style={{ display:"flex",gap:4 }}>
      {[1,2,3,4,5].map(s => (
        <span key={s} onClick={()=>onRate&&onRate(s)} style={{ fontSize:22,cursor:onRate?"pointer":"default",color:s<=val?C.yellow:C.textDim }}>★</span>
      ))}
    </div>
  );
}

// ─── SCREENS ──────────────────────────────────────────────

function LoginScreen({ auth }) {
  const [phoneInput, setPhoneInput] = useState("");
  return (
    <div style={{ ...S.screen, padding:0, background:`linear-gradient(160deg, #0A0A0F 60%, #1a0a00)` }}>
      <div style={{ padding:"60px 24px 0" }}>
        <div><span style={{ fontSize:36 }}>🛵</span></div>
        <h1 style={{ fontSize:32,fontWeight:900,margin:"8px 0 6px",letterSpacing:-1 }}>KanoExpress</h1>
        <p style={{ color:C.textMid,fontSize:15,marginBottom:40 }}>Fast delivery across Kano City</p>
        {auth.error && <div style={{ background:C.red+"22",border:`1px solid ${C.red}`,borderRadius:10,padding:"10px 14px",marginBottom:16,color:C.red,fontSize:13 }}>{auth.error}</div>}
        <div style={{ marginBottom:16 }}>
          <label style={S.label}>Phone Number</label>
          <div style={{ position:"relative" }}>
            <span style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:C.textMid,fontSize:14 }}>🇳🇬 +234</span>
            <input style={{ ...S.input,paddingLeft:80 }} placeholder="0812 345 6789" value={phoneInput} onChange={e=>setPhoneInput(e.target.value)} inputMode="tel" />
          </div>
        </div>
        <button style={{ ...S.btn,display:"flex",alignItems:"center",justifyContent:"center",gap:8 }} onClick={()=>auth.requestOTP(phoneInput)} disabled={auth.sending||phoneInput.length<8}>
          {auth.sending?<Spinner size={18} color="#fff" />:null} {auth.sending?"Sending OTP...":"Get OTP →"}
        </button>
        <p style={{ textAlign:"center",color:C.textMid,fontSize:13,marginTop:20 }}>By continuing you agree to our Terms</p>
      </div>
    </div>
  );
}

function OTPScreen({ auth }) {
  const [digits, setDigits] = useState(["","","","","",""]);
  const otp = digits.join("");
  return (
    <div style={{ ...S.screen,padding:"60px 24px" }}>
      <button onClick={()=>window.location.reload()} style={{ background:"none",border:"none",color:C.accent,fontSize:16,cursor:"pointer",padding:0,marginBottom:24 }}>‹ Back</button>
      <h2 style={{ fontSize:26,fontWeight:800,marginBottom:8 }}>Enter OTP</h2>
      <p style={{ color:C.textMid,marginBottom:32 }}>Sent to {auth.phone}</p>
      {auth.error && <div style={{ background:C.red+"22",border:`1px solid ${C.red}`,borderRadius:10,padding:"10px 14px",marginBottom:16,color:C.red,fontSize:13 }}>{auth.error}</div>}
      <div style={{ display:"flex",gap:8,marginBottom:32 }}>
        {digits.map((d,i)=>(
          <input key={i} maxLength={1} inputMode="numeric" style={{ ...S.input,textAlign:"center",fontSize:22,fontWeight:700,width:48,padding:"14px 0",flex:1 }}
            value={d} onChange={e=>{ const n=[...digits]; n[i]=e.target.value; setDigits(n); if(e.target.value&&e.target.nextSibling)e.target.nextSibling.focus(); }} />
        ))}
      </div>
      <button style={{ ...S.btn,display:"flex",alignItems:"center",justifyContent:"center",gap:8 }} onClick={()=>auth.confirmOTP(otp)} disabled={auth.verifying||otp.length<6}>
        {auth.verifying?<Spinner size={18} color="#fff" />:null} {auth.verifying?"Verifying...":"Verify & Continue →"}
      </button>
      <p style={{ textAlign:"center",color:C.textMid,fontSize:13,marginTop:16,cursor:"pointer" }} onClick={()=>auth.requestOTP(auth.phone)}>Resend OTP</p>
    </div>
  );
}

export default function CustomerApp() {
  const auth = useAuth("customer");
  const { orders, activeOrder, setActiveOrder, placingOrder, placeOrder, fetchOrders, submitRating } = useOrder(auth.user);
  const { balance } = useWallet(auth.user?.id);

  const [tab, setTab] = useState("home");
  const [shops, setShops] = useState([]);
  const [shopsLoading, setShopsLoading] = useState(false);
  const [shopsError, setShopsError] = useState(false);
  const [selectedShop, setSelectedShop] = useState(null);
  const [cart, setCart] = useState([]);
  const [payMethod, setPayMethod] = useState("cash");
  const [searchQuery, setSearchQuery] = useState("");
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [deliveryForm, setDeliveryForm] = useState({ pickup:"",dropoff:"",item:"",note:"" });
  const [deliveryQuote, setDeliveryQuote] = useState(null);
  const [quotingDelivery, setQuotingDelivery] = useState(false);

  // Fetch shops on mount (cached in state)
  useEffect(() => {
    if (auth.user) loadShops();
  }, [auth.user]);

  async function loadShops() {
    setShopsLoading(true); setShopsError(false);
    try {
      const data = await getShops();
      setShops(data);
    } catch { setShopsError(true); }
    finally { setShopsLoading(false); }
  }

  if (auth.loading) return <FullScreenLoader message="Loading KanoExpress..." />;
  if (!auth.user) return auth.otpSent ? <OTPScreen auth={auth} /> : <LoginScreen auth={auth} />;

  // Cart helpers
  const addToCart = (product) => setCart(c => {
    const ex = c.find(x=>x.id===product.id);
    if(ex) return c.map(x=>x.id===product.id?{...x,qty:x.qty+1}:x);
    return [...c, {...product, qty:1}];
  });
  const cartTotal = cart.reduce((s,i)=>s+i.price*i.qty,0);
  const cartCount = cart.reduce((s,i)=>s+i.qty,0);
  const deliveryFee = selectedShop?.delivery_fee || 200;

  async function handlePlaceOrder() {
    if(!auth.user) return;
    const order = await placeOrder({
      cart, shop: selectedShop,
      paymentMethod: payMethod,
      pickupAddress: selectedShop?.name || "",
      dropoffAddress: "Customer address",
    });
    if(order) {
      setCart([]);
      setActiveOrder(order);
      setTab("tracking");
    }
  }

  async function handleDeliveryRequest() {
    setQuotingDelivery(true);
    try {
      const [pickupCoord, dropoffCoord] = await Promise.all([
        geocodeAddress(deliveryForm.pickup),
        geocodeAddress(deliveryForm.dropoff),
      ]);
      if(!pickupCoord || !dropoffCoord) { toast("Could not find one of the addresses","error"); return; }
      const { distanceBetween, calculateDeliveryFee } = await import("../lib/paystack");
      const dist = distanceBetween(...pickupCoord, ...dropoffCoord);
      const price = calculateDeliveryFee(dist);
      setDeliveryQuote({ dist: dist.toFixed(1), price, pickupCoord, dropoffCoord });
    } finally { setQuotingDelivery(false); }
  }

  async function confirmDeliveryRequest() {
    const order = await placeOrder({
      cart: [],
      shop: null,
      paymentMethod: payMethod,
      pickupAddress: deliveryForm.pickup,
      dropoffAddress: deliveryForm.dropoff,
    });
    if(order) { setActiveOrder(order); setDeliveryQuote(null); setTab("tracking"); }
  }

  const filteredShops = shops.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.category||"").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusIndex = STATUS_MAP[activeOrder?.status] ?? 0;

  const tabScreens = {
    home: (
      <div>
        <div style={{ padding:"20px 20px 12px" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
            <div>
              <p style={{ margin:0,color:C.textMid,fontSize:13 }}>📍 Kano, Nigeria</p>
              <h2 style={{ margin:"2px 0 0",fontSize:20,fontWeight:800 }}>Good day, {auth.user?.name || "friend"} 👋</h2>
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
              {icon:"📦",label:"My Orders",color:C.blue,action:()=>{fetchOrders();setTab("orders")}},
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
          {shopsLoading && <div style={{ textAlign:"center",padding:40 }}><Spinner /></div>}
          {shopsError && <RetryButton onRetry={loadShops} loading={shopsLoading} />}
          <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
            {filteredShops.map(shop=>(
              <button key={shop.id} onClick={()=>{setSelectedShop(shop);setTab("shop");}} style={{ ...S.card,cursor:"pointer",textAlign:"left",border:`1px solid ${C.border}` }}>
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

    shop: selectedShop && (
      <div>
        <div style={{ background:(selectedShop.color||C.accent)+"22",padding:"40px 20px 24px" }}>
          <button onClick={()=>setTab("home")} style={{ background:C.bg+"AA",border:"none",borderRadius:10,padding:"6px 14px",color:C.text,cursor:"pointer",marginBottom:16,fontSize:14 }}>‹ Back</button>
          <div style={{ fontSize:48,marginBottom:10 }}>{selectedShop.img_emoji||"🏪"}</div>
          <h2 style={{ margin:"0 0 4px",fontSize:22,fontWeight:800 }}>{selectedShop.name}</h2>
          <div style={{ display:"flex",gap:12 }}>
            <span style={{ color:C.yellow,fontSize:14 }}>★ {selectedShop.rating}</span>
            <span style={{ color:C.textMid,fontSize:14 }}>⏱ {selectedShop.eta_min}-{selectedShop.eta_max} min</span>
            <span style={{ color:C.textMid,fontSize:14 }}>🛵 ₦{selectedShop.delivery_fee} delivery</span>
          </div>
        </div>
        <div style={{ padding:"16px 20px" }}>
          <h3 style={{ fontSize:15,fontWeight:700,color:C.textMid,marginBottom:14 }}>MENU</h3>
          <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
            {(selectedShop.products||[]).filter(p=>p.available).map(p=>{
              const inCart=cart.find(c=>c.id===p.id);
              return (
                <div key={p.id} style={{ ...S.card,display:"flex",alignItems:"center",gap:14 }}>
                  <div style={{ background:(selectedShop.color||C.accent)+"22",borderRadius:10,width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>{p.img_emoji||"🍽️"}</div>
                  <div style={{ flex:1 }}>
                    <p style={{ margin:0,fontWeight:600,fontSize:14 }}>{p.name}</p>
                    <p style={{ margin:"2px 0 0",color:C.accent,fontWeight:700 }}>₦{p.price.toLocaleString()}</p>
                  </div>
                  {inCart?(
                    <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                      <button onClick={()=>setCart(c=>c.map(x=>x.id===p.id?{...x,qty:Math.max(0,x.qty-1)}:x).filter(x=>x.qty>0))} style={{ background:C.border,border:"none",borderRadius:8,width:28,height:28,color:C.text,cursor:"pointer",fontSize:16 }}>−</button>
                      <span style={{ fontWeight:700,minWidth:16,textAlign:"center" }}>{inCart.qty}</span>
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

    checkout: (
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
            {placingOrder?<Spinner size={18} color="#fff" />:null} {placingOrder?"Placing Order...":"Place Order →"}
          </button>
        </div>
      </div>
    ),

    tracking: activeOrder && (
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
              <button style={{ ...S.btn,marginTop:10 }} onClick={async()=>{ await submitRating(activeOrder.id,rating,reviewText); setTab("home"); }}>Submit & Done</button>
            </div>
          )}
        </div>
        <div style={{ height:80 }} />
      </div>
    ),

    delivery: (
      <div>
        <div style={{ display:"flex",alignItems:"center",gap:12,padding:"16px 20px 8px",background:C.bg,position:"sticky",top:0,zIndex:50 }}>
          <button onClick={()=>setTab("home")} style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:10,width:36,height:36,cursor:"pointer",color:C.text,fontSize:18,display:"flex",alignItems:"center",justifyContent:"center" }}>‹</button>
          <span style={{ fontWeight:700,fontSize:18 }}>Send a Package</span>
        </div>
        <div style={{ padding:"16px 20px" }}>
          <MapView
            pickupCoord={deliveryQuote?.pickupCoord}
            dropoffCoord={deliveryQuote?.dropoffCoord}
          />
          <div style={{ marginTop:16,display:"flex",flexDirection:"column",gap:12 }}>
            <div><label style={S.label}>📍 Pickup Location</label><input style={S.input} placeholder="Enter pickup address in Kano" value={deliveryForm.pickup} onChange={e=>setDeliveryForm(f=>({...f,pickup:e.target.value}))} /></div>
            <div><label style={S.label}>🏁 Drop-off Location</label><input style={S.input} placeholder="Enter destination address" value={deliveryForm.dropoff} onChange={e=>setDeliveryForm(f=>({...f,dropoff:e.target.value}))} /></div>
            <div><label style={S.label}>📦 Describe the Item</label><input style={S.input} placeholder="e.g. Documents, Food package, Phone..." value={deliveryForm.item} onChange={e=>setDeliveryForm(f=>({...f,item:e.target.value}))} /></div>
            {!deliveryQuote?(
              <button style={{ ...S.btn,display:"flex",alignItems:"center",justifyContent:"center",gap:8 }} onClick={handleDeliveryRequest} disabled={quotingDelivery||!deliveryForm.pickup||!deliveryForm.dropoff}>
                {quotingDelivery?<Spinner size={18} color="#fff" />:null} {quotingDelivery?"Calculating...":"Get Price Estimate →"}
              </button>
            ):(
              <div>
                <div style={{ ...S.card,border:`1px solid ${C.accent}`,marginBottom:12 }}>
                  <p style={{ margin:"0 0 10px",fontWeight:700 }}>📊 Delivery Estimate</p>
                  <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}><span style={{ color:C.textMid }}>Distance</span><span>{deliveryQuote.dist} km</span></div>
                  <div style={{ display:"flex",justifyContent:"space-between",paddingTop:8,borderTop:`1px solid ${C.border}` }}><span style={{ fontWeight:700 }}>Price</span><span style={{ color:C.accent,fontWeight:800,fontSize:18 }}>₦{deliveryQuote.price.toLocaleString()}</span></div>
                </div>
                <button style={S.btn} onClick={confirmDeliveryRequest} disabled={placingOrder}>
                  {placingOrder?<Spinner size={18} color="#fff" />:null} Confirm & Find Rider →
                </button>
              </div>
            )}
          </div>
        </div>
        <div style={{ height:80 }} />
      </div>
    ),

    orders: (
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

  const tabBar = [
    {id:"home",icon:"🏠",label:"Home"},
    {id:"delivery",icon:"🛵",label:"Send"},
    {id:"orders",icon:"📦",label:"Orders"},
  ];

  return (
    <div style={S.screen}>
      <div style={{ maxWidth:430,margin:"0 auto",position:"relative",minHeight:"100vh" }}>
        <div style={{ overflowY:"auto",paddingBottom:70 }}>
          {tabScreens[tab]||tabScreens.home}
        </div>
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
