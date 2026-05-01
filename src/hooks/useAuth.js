// src/hooks/useAuth.js
// ─── OTP Authentication State ─────────────────────────────
import { useState, useEffect } from "react";
import { supabase, sendOTP, verifyOTP, getOrCreateUser, getOrCreateRider } from "../lib/supabase";
import { toast } from "../lib/notifications";

export function useAuth(role = "customer") {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState(null);

  // Check existing session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) hydrateUser(session, role);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session) hydrateUser(session, role);
        if (event === "SIGNED_OUT") { setUser(null); setLoading(false); }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  async function hydrateUser(session, role) {
    try {
      const phone = session.user.phone;
      let profile;
      if (role === "rider") {
        profile = await getOrCreateRider(session.user.id, phone);
      } else {
        profile = await getOrCreateUser(session.user.id, phone);
      }
      setUser({ ...session.user, ...profile });
    } catch (e) {
      console.error("Hydrate error", e);
      setError("Profile load failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function requestOTP(phoneInput) {
    setSending(true);
    setError(null);
    try {
      const e164 = await sendOTP(phoneInput);
      setPhone(e164);
      setOtpSent(true);
      toast("OTP sent to " + phoneInput, "success");
    } catch (e) {
      setError(e.message || "Failed to send OTP. Check your number.");
      toast("Failed to send OTP", "error");
    } finally {
      setSending(false);
    }
  }

  async function confirmOTP(token) {
    setVerifying(true);
    setError(null);
    try {
      await verifyOTP(phone, token);
      // onAuthStateChange will fire and call hydrateUser
    } catch (e) {
      setError("Invalid OTP. Please try again.");
      toast("Invalid OTP", "error");
    } finally {
      setVerifying(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setOtpSent(false);
    setPhone("");
  }

  return {
    user, loading, sending, verifying, phone, otpSent, error,
    requestOTP, confirmOTP, logout,
  };
}
