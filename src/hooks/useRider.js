// src/hooks/useRider.js
// ─── Rider Online State + GPS Location ────────────────────
import { useState, useEffect, useRef } from "react";
import { setRiderOnline, updateRiderLocation, subscribeToPendingOrders } from "../lib/supabase";
import { toast } from "../lib/notifications";

export function useRider(rider) {
  const [isOnline, setIsOnline] = useState(rider?.is_online || false);
  const [location, setLocation] = useState(null);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const watchRef = useRef(null);
  const updateRef = useRef(null);

  // Start/stop GPS tracking when online status changes
  useEffect(() => {
    if (isOnline) startLocationTracking();
    else stopLocationTracking();
    return stopLocationTracking;
  }, [isOnline]);

  function startLocationTracking() {
    if (!navigator.geolocation) return;

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLocation({ lat, lng });

        // Debounce DB update to every 10s
        clearTimeout(updateRef.current);
        updateRef.current = setTimeout(() => {
          if (rider?.id) updateRiderLocation(rider.id, lat, lng);
        }, 10_000);
      },
      (err) => console.warn("GPS error", err),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 5_000 }
    );
  }

  function stopLocationTracking() {
    if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current);
    clearTimeout(updateRef.current);
  }

  async function toggleOnline() {
    if (!rider?.id) return;
    setTogglingOnline(true);
    try {
      const newStatus = !isOnline;

      let lat = location?.lat, lng = location?.lng;

      // Try to get position if going online
      if (newStatus && !lat) {
        try {
          const pos = await new Promise((res, rej) =>
            navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
          );
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          // Kano city center as fallback
          lat = 12.0022;
          lng = 8.5920;
        }
      }

      await setRiderOnline(rider.id, newStatus, lat, lng);
      setIsOnline(newStatus);
      toast(newStatus ? "You're now online 🟢" : "You're offline", newStatus ? "success" : "info");
    } catch (e) {
      toast("Could not update status", "error");
    } finally {
      setTogglingOnline(false);
    }
  }

  return { isOnline, location, togglingOnline, toggleOnline };
}

// ─── WALLET HOOK ──────────────────────────────────────────
export function useWallet(userId) {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    fetchBalance();
    fetchTransactions();
  }, [userId]);

  async function fetchBalance() {
    const { getWalletBalance } = await import("../lib/supabase");
    const bal = await getWalletBalance(userId);
    setBalance(bal);
    setLoading(false);
  }

  async function fetchTransactions() {
    const { supabase } = await import("../lib/supabase");
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);
    setTransactions(data || []);
  }

  return { balance, transactions, loading, refetch: fetchBalance };
}
