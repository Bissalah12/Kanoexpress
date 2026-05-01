// src/lib/supabase.js
// ─── Supabase client + all database helpers ───────────────
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
  }
);

// ─── AUTH ─────────────────────────────────────────────────

/**
 * Send OTP to a Nigerian phone number via Supabase Auth.
 * Phone must be in E.164 format: +2348012345678
 */
export async function sendOTP(phone) {
  const e164 = formatNigerianPhone(phone);
  const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
  if (error) throw error;
  return e164;
}

export async function verifyOTP(phone, token) {
  const e164 = formatNigerianPhone(phone);
  const { data, error } = await supabase.auth.verifyOtp({
    phone: e164,
    token,
    type: "sms",
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export function formatNigerianPhone(phone) {
  // Accept: 08012345678, 8012345678, +2348012345678
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("234")) return "+" + digits;
  if (digits.startsWith("0")) return "+234" + digits.slice(1);
  return "+234" + digits;
}

// ─── USER PROFILE ─────────────────────────────────────────

export async function getOrCreateUser(userId, phone) {
  // Try to get existing user
  let { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (!user) {
    // Create user + wallet atomically
    const { data: newUser, error } = await supabase
      .from("users")
      .insert({ id: userId, phone })
      .select()
      .single();
    if (error) throw error;
    user = newUser;

    // Create wallet
    await supabase.from("wallets").insert({ user_id: userId, balance: 0 });
  }
  return user;
}

export async function updateUserName(userId, name) {
  const { error } = await supabase
    .from("users")
    .update({ name })
    .eq("id", userId);
  if (error) throw error;
}

// ─── WALLET ───────────────────────────────────────────────

export async function getWalletBalance(userId) {
  const { data, error } = await supabase
    .from("wallets")
    .select("balance")
    .eq("user_id", userId)
    .single();
  if (error) return 0;
  return data.balance;
}

export async function debitWallet(userId, amount, reason, orderId) {
  // Use a Supabase RPC to do this atomically
  const { data, error } = await supabase.rpc("debit_wallet", {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
    p_order_id: orderId,
  });
  if (error) throw error;
  return data;
}

export async function creditWallet(userId, amount, reason, reference) {
  const { data, error } = await supabase.rpc("credit_wallet", {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
    p_reference: reference,
  });
  if (error) throw error;
  return data;
}

// ─── SHOPS ────────────────────────────────────────────────

export async function getShops() {
  const { data, error } = await supabase
    .from("shops")
    .select(`*, products(*)`)
    .eq("is_open", true)
    .order("rating", { ascending: false });
  if (error) throw error;
  return data;
}

// ─── ORDERS ───────────────────────────────────────────────

export async function createOrder(orderData) {
  const { data, error } = await supabase
    .from("orders")
    .insert(orderData)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function insertOrderItems(items) {
  const { error } = await supabase.from("order_items").insert(items);
  if (error) throw error;
}

export async function getCustomerOrders(customerId) {
  const { data, error } = await supabase
    .from("orders")
    .select(`*, order_items(*), shops(name, img_emoji)`)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data || [];
}

export async function updateOrderStatus(orderId, status) {
  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId);
  if (error) throw error;
}

export async function rateOrder(orderId, rating, review) {
  const { error } = await supabase
    .from("orders")
    .update({ customer_rating: rating, customer_review: review })
    .eq("id", orderId);
  if (error) throw error;
}

// Subscribe to a single order's status changes (real-time)
export function subscribeToOrder(orderId, callback) {
  return supabase
    .channel(`order-${orderId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "orders",
        filter: `id=eq.${orderId}`,
      },
      (payload) => callback(payload.new)
    )
    .subscribe();
}

// ─── RIDER ────────────────────────────────────────────────

export async function getOrCreateRider(userId, phone) {
  let { data: rider } = await supabase
    .from("riders")
    .select("*")
    .eq("id", userId)
    .single();

  if (!rider) {
    const { data: newRider, error } = await supabase
      .from("riders")
      .insert({ id: userId, phone })
      .select()
      .single();
    if (error) throw error;
    rider = newRider;
  }
  return rider;
}

export async function setRiderOnline(riderId, isOnline, lat, lng) {
  const { error } = await supabase
    .from("riders")
    .update({
      is_online: isOnline,
      lat: lat || null,
      lng: lng || null,
      location_updated_at: new Date().toISOString(),
    })
    .eq("id", riderId);
  if (error) throw error;
}

export async function updateRiderLocation(riderId, lat, lng) {
  await supabase
    .from("riders")
    .update({ lat, lng, location_updated_at: new Date().toISOString() })
    .eq("id", riderId);
}

// Subscribe to new orders assigned to this rider
export function subscribeToRiderOrders(riderId, callback) {
  return supabase
    .channel(`rider-orders-${riderId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "orders",
        filter: `rider_id=eq.${riderId}`,
      },
      (payload) => callback(payload.new)
    )
    .subscribe();
}

// Subscribe to pending orders (for rider to see new requests in their area)
export function subscribeToPendingOrders(callback) {
  return supabase
    .channel("pending-orders")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "orders",
        filter: `status=eq.pending`,
      },
      (payload) => callback(payload.new)
    )
    .subscribe();
}

export async function getRiderPendingOrders(riderId) {
  // Get orders not yet accepted, ordered by proximity
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("status", "pending")
    .is("rider_id", null)
    .order("created_at", { ascending: true })
    .limit(5);
  if (error) return [];
  return data;
}

export async function acceptOrder(orderId, riderId) {
  // Atomic: only succeeds if status is still 'pending'
  const { data, error } = await supabase
    .from("orders")
    .update({ status: "rider_assigned", rider_id: riderId })
    .eq("id", orderId)
    .eq("status", "pending")   // guard against double-accept
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getRiderEarnings(riderId) {
  const { data, error } = await supabase
    .from("rider_earnings")
    .select("*, orders(order_number, dropoff_address, created_at)")
    .eq("rider_id", riderId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) return [];
  return data;
}

export async function logRiderEarning(riderId, orderId, amount) {
  await supabase
    .from("rider_earnings")
    .insert({ rider_id: riderId, order_id: orderId, amount });

  // Increment total deliveries
  await supabase.rpc("increment_rider_deliveries", { p_rider_id: riderId });
}

// ─── DISPATCH ─────────────────────────────────────────────

export async function dispatchNearestRider(orderId, lat, lng) {
  const { data: riderId, error } = await supabase.rpc("find_nearest_rider", {
    order_lat: lat,
    order_lng: lng,
  });
  if (error || !riderId) return null;

  // Assign rider
  const { error: assignError } = await supabase
    .from("orders")
    .update({ rider_id: riderId, status: "rider_assigned" })
    .eq("id", orderId);

  if (assignError) return null;
  return riderId;
}

// ─── ADMIN ────────────────────────────────────────────────

export async function adminGetAllOrders(limit = 50) {
  const { data } = await supabase
    .from("orders")
    .select(`*, users(phone, name), riders(name, phone), shops(name)`)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data || [];
}

export async function adminGetStats() {
  const [orders, users, riders] = await Promise.all([
    supabase.from("orders").select("id, total, status", { count: "exact" }),
    supabase.from("users").select("id", { count: "exact" }),
    supabase.from("riders").select("id, is_online", { count: "exact" }),
  ]);

  const totalRevenue = (orders.data || [])
    .filter((o) => o.status === "delivered")
    .reduce((s, o) => s + o.total, 0);

  return {
    totalOrders: orders.count || 0,
    totalUsers: users.count || 0,
    totalRiders: riders.count || 0,
    onlineRiders: (riders.data || []).filter((r) => r.is_online).length,
    totalRevenue,
  };
}
