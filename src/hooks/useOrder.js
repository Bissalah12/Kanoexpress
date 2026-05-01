// src/hooks/useOrder.js
// ─── Real-time Order State ─────────────────────────────────
import { useState, useEffect, useRef } from "react";
import {
  createOrder, insertOrderItems, getCustomerOrders,
  subscribeToOrder, updateOrderStatus, rateOrder,
  logRiderEarning,
} from "../lib/supabase";
import { notifyOrderStatus, toast } from "../lib/notifications";
import { openPaystackPayment } from "../lib/paystack";

export function useOrder(user) {
  const [orders, setOrders] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const channelRef = useRef(null);

  useEffect(() => {
    if (user?.id) fetchOrders();
  }, [user?.id]);

  // Subscribe to active order changes
  useEffect(() => {
    if (!activeOrder?.id) return;

    channelRef.current = subscribeToOrder(activeOrder.id, (updated) => {
      setActiveOrder((o) => ({ ...o, ...updated }));
      notifyOrderStatus(updated.status);
      // Update in orders list too
      setOrders((prev) =>
        prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
      );
    });

    return () => channelRef.current?.unsubscribe();
  }, [activeOrder?.id]);

  async function fetchOrders() {
    setLoadingOrders(true);
    try {
      const data = await getCustomerOrders(user.id);
      setOrders(data);
    } catch (e) {
      toast("Could not load orders", "error");
    } finally {
      setLoadingOrders(false);
    }
  }

  async function placeOrder({ cart, shop, paymentMethod, pickupAddress, dropoffAddress }) {
    setPlacingOrder(true);
    try {
      const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
      const total = subtotal + (shop?.delivery_fee || 200);

      // Handle Paystack payment before creating order
      if (paymentMethod === "wallet") {
        // Deducted server-side via RPC — proceed
      } else if (paymentMethod === "bank_transfer") {
        // Paystack inline
        await new Promise((resolve, reject) =>
          openPaystackPayment({
            email: `${user.phone.replace("+", "")}@kanoexpress.ng`,
            amount: total,
            phone: user.phone,
            orderId: "pending",
            onSuccess: resolve,
            onClose: () => reject(new Error("Payment cancelled")),
          })
        );
      }

      const order = await createOrder({
        customer_id: user.id,
        shop_id: shop?.id || null,
        type: shop ? "shop_order" : "peer_delivery",
        payment_method: paymentMethod,
        subtotal,
        delivery_fee: shop?.delivery_fee || 200,
        total,
        pickup_address: pickupAddress,
        dropoff_address: dropoffAddress,
        status: "pending",
      });

      if (cart.length > 0) {
        await insertOrderItems(
          cart.map((i) => ({
            order_id: order.id,
            product_id: i.id,
            product_name: i.name,
            price: i.price,
            qty: i.qty,
          }))
        );
      }

      setActiveOrder(order);
      setOrders((prev) => [order, ...prev]);
      toast("Order placed! Finding a rider...", "success");
      return order;
    } catch (e) {
      toast(e.message || "Failed to place order", "error");
      return null;
    } finally {
      setPlacingOrder(false);
    }
  }

  async function submitRating(orderId, rating, review) {
    await rateOrder(orderId, rating, review);
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, customer_rating: rating } : o
      )
    );
    toast("Thanks for your rating! ⭐", "success");
  }

  return {
    orders, activeOrder, setActiveOrder,
    loadingOrders, placingOrder,
    placeOrder, fetchOrders, submitRating,
  };
}

// ─── RIDER ORDER HOOK ─────────────────────────────────────
export function useRiderOrder(rider) {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!rider?.id) return;
    fetchPendingOrders();
  }, [rider?.id]);

  async function fetchPendingOrders() {
    const { getRiderPendingOrders } = await import("../lib/supabase");
    const data = await getRiderPendingOrders(rider.id);
    setPendingOrders(data);
  }

  async function accept(order) {
    setAccepting(true);
    try {
      const { acceptOrder } = await import("../lib/supabase");
      const accepted = await acceptOrder(order.id, rider.id);
      setActiveDelivery(accepted);
      setPendingOrders([]);
      toast("Order accepted! Head to pickup 🏍", "success");
    } catch {
      toast("Order was already taken. Refreshing...", "error");
      fetchPendingOrders();
    } finally {
      setAccepting(false);
    }
  }

  async function advanceStatus(order) {
    const flow = {
      rider_assigned: "rider_at_pickup",
      rider_at_pickup: "on_the_way",
      on_the_way: "delivered",
    };
    const next = flow[order.status];
    if (!next) return;

    await updateOrderStatus(order.id, next);
    const updated = { ...order, status: next };
    setActiveDelivery(updated);

    if (next === "delivered") {
      const earning = order.delivery_fee || 200;
      await logRiderEarning(rider.id, order.id, earning);
      toast(`Delivery complete! ₦${earning} earned 💰`, "success");
      setTimeout(() => setActiveDelivery(null), 2000);
    }
  }

  return {
    pendingOrders, activeDelivery, accepting,
    accept, advanceStatus, fetchPendingOrders,
  };
}
