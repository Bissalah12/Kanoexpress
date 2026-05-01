// src/admin/AdminPanel.jsx
// ─── Lightweight Admin — view orders, users, riders ────────
// Access: add ?admin=1 to URL. In production, protect with a
// separate Supabase auth role or a simple secret token check.

import { useState, useEffect } from "react";
import { adminGetAllOrders, adminGetStats } from "../lib/supabase";
import { Spinner } from "../components/NetworkGuard";

const C = {
  bg:"#0A0A0F",surface:"#13131A",card:"#1C1C26",border:"#2A2A38",
  accent:"#FF5C1A",green:"#22C55E",yellow:"#FBBF24",red:"#EF4444",
  blue:"#3B82F6",text:"#F0F0F5",textMid:"#9898AA",white:"#FFFFFF",
};
const S = {
  card:{ background:C.card,borderRadius:16,border:`1px solid ${C.border}`,padding:"16px" },
  tag:(col)=>({ background:col+"22",color:col,borderRadius:8,padding:"4px 10px",fontSize:12,fontWeight:600 }),
};

const STATUS_COLORS = {
  pending:C.yellow, accepted:C.blue, rider_assigned:C.blue,
  rider_at_pickup:C.accent, on_the_way:C.accent, delivered:C.green, cancelled:C.red,
};

export default function AdminPanel({ onBack }) {
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30_000); // auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [s, o] = await Promise.all([adminGetStats(), adminGetAllOrders(100)]);
      setStats(s);
      setOrders(o);
    } catch (e) {
      console.error("Admin load error", e);
    } finally {
      setLoading(false);
    }
  }

  const filteredOrders = orders.filter(o =>
    !search ||
    o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
    o.users?.phone?.includes(search) ||
    o.users?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const tabBar = [
    { id:"overview", label:"📊 Overview" },
    { id:"orders",   label:"📋 Orders" },
  ];

  return (
    <div style={{ minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Plus Jakarta Sans','Segoe UI',sans-serif" }}>
      {/* Header */}
      <div style={{ background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"14px 24px",display:"flex",alignItems:"center",gap:16 }}>
        <button onClick={onBack} style={{ background:"none",border:"none",color:C.textMid,fontSize:20,cursor:"pointer",lineHeight:1 }}>‹</button>
        <div>
          <p style={{ margin:0,fontSize:12,color:C.textMid }}>KanoExpress</p>
          <h1 style={{ margin:0,fontSize:18,fontWeight:800 }}>Admin Panel</h1>
        </div>
        <div style={{ marginLeft:"auto",display:"flex",gap:8 }}>
          {loading&&<Spinner size={16} />}
          <button onClick={loadData} style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 12px",color:C.text,cursor:"pointer",fontSize:12 }}>🔄 Refresh</button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ background:C.surface,borderBottom:`1px solid ${C.border}`,display:"flex",padding:"0 24px" }}>
        {tabBar.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ background:"none",border:"none",borderBottom:tab===t.id?`2px solid ${C.accent}`:"2px solid transparent",color:tab===t.id?C.accent:C.textMid,padding:"12px 16px",cursor:"pointer",fontWeight:tab===t.id?700:400,fontSize:14 }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth:900,margin:"0 auto",padding:"24px" }}>
        {/* OVERVIEW */}
        {tab==="overview"&&(
          <div>
            {!stats&&loading&&<div style={{ textAlign:"center",paddingTop:60 }}><Spinner size={40} /></div>}
            {stats&&(
              <>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:14,marginBottom:28 }}>
                  {[
                    {label:"Total Orders",   val:stats.totalOrders,   color:C.accent, icon:"📦"},
                    {label:"Total Users",    val:stats.totalUsers,    color:C.blue,   icon:"👤"},
                    {label:"Total Riders",   val:stats.totalRiders,   color:C.yellow, icon:"🏍"},
                    {label:"Online Riders",  val:stats.onlineRiders,  color:C.green,  icon:"🟢"},
                    {label:"Revenue (₦)",    val:stats.totalRevenue.toLocaleString(), color:C.green, icon:"💰"},
                  ].map(k=>(
                    <div key={k.label} style={{ ...S.card,border:`1px solid ${k.color}33` }}>
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                        <div>
                          <p style={{ margin:"0 0 6px",color:C.textMid,fontSize:12 }}>{k.label}</p>
                          <p style={{ margin:0,fontSize:24,fontWeight:800,color:k.color }}>{k.val}</p>
                        </div>
                        <span style={{ fontSize:22 }}>{k.icon}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recent orders in overview */}
                <h3 style={{ fontSize:14,fontWeight:700,color:C.textMid,marginBottom:14 }}>RECENT ORDERS</h3>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13 }}>
                    <thead>
                      <tr style={{ borderBottom:`1px solid ${C.border}` }}>
                        {["Order #","Customer","Shop","Total","Status","Time"].map(h=>(
                          <th key={h} style={{ textAlign:"left",padding:"8px 12px",color:C.textMid,fontWeight:600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0,10).map(o=>(
                        <tr key={o.id} style={{ borderBottom:`1px solid ${C.border}22` }}>
                          <td style={{ padding:"10px 12px",fontWeight:700 }}>{o.order_number}</td>
                          <td style={{ padding:"10px 12px" }}>{o.users?.name||o.users?.phone||"—"}</td>
                          <td style={{ padding:"10px 12px" }}>{o.shops?.name||"Package"}</td>
                          <td style={{ padding:"10px 12px",color:C.accent,fontWeight:700 }}>₦{o.total?.toLocaleString()}</td>
                          <td style={{ padding:"10px 12px" }}><span style={S.tag(STATUS_COLORS[o.status]||C.textMid)}>{o.status}</span></td>
                          <td style={{ padding:"10px 12px",color:C.textMid }}>{new Date(o.created_at).toLocaleString("en-NG",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* ORDERS */}
        {tab==="orders"&&(
          <div>
            <div style={{ marginBottom:16 }}>
              <input
                style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"11px 16px",color:C.text,fontSize:14,width:"100%",outline:"none",boxSizing:"border-box" }}
                placeholder="Search by order #, phone, or name..."
                value={search}
                onChange={e=>setSearch(e.target.value)}
              />
            </div>
            <p style={{ color:C.textMid,fontSize:13,marginBottom:14 }}>{filteredOrders.length} orders</p>
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              {filteredOrders.map(o=>(
                <div key={o.id} style={S.card}>
                  <div style={{ display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8,marginBottom:8 }}>
                    <span style={{ fontWeight:800 }}>{o.order_number}</span>
                    <span style={S.tag(STATUS_COLORS[o.status]||C.textMid)}>{o.status}</span>
                  </div>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px 16px",fontSize:13 }}>
                    <div><span style={{ color:C.textMid }}>Customer: </span>{o.users?.name||o.users?.phone||"—"}</div>
                    <div><span style={{ color:C.textMid }}>Rider: </span>{o.riders?.name||o.riders?.phone||"Unassigned"}</div>
                    <div><span style={{ color:C.textMid }}>Shop: </span>{o.shops?.name||"Peer delivery"}</div>
                    <div><span style={{ color:C.textMid }}>Payment: </span>{o.payment_method}</div>
                    <div><span style={{ color:C.textMid }}>Pickup: </span>{o.pickup_address||"—"}</div>
                    <div><span style={{ color:C.textMid }}>Dropoff: </span>{o.dropoff_address||"—"}</div>
                  </div>
                  <div style={{ display:"flex",justifyContent:"space-between",marginTop:10,paddingTop:10,borderTop:`1px solid ${C.border}` }}>
                    <span style={{ color:C.textMid,fontSize:12 }}>{new Date(o.created_at).toLocaleString("en-NG")}</span>
                    <span style={{ color:C.accent,fontWeight:800 }}>₦{o.total?.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
