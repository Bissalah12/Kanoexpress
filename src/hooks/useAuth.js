// src/hooks/useAuth.js
// ─── Auth: Email/Password + Google OAuth ──────────────────
import { useState, useEffect } from "react";
import { supabase, getOrCreateUser, getOrCreateRider } from "../lib/supabase";
import { toast } from "../lib/notifications";

export function useAuth(role = "customer") {
  const [user, setUser]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState(null);
  const [mode, setMode]           = useState("login"); // "login" | "signup" | "reset"

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) hydrateUser(session);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session) hydrateUser(session);
        if (event === "SIGNED_OUT") { setUser(null); setLoading(false); }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  async function hydrateUser(session) {
    try {
      const identifier = session.user.email || session.user.id;
      const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || "";
      let profile;
      if (role === "rider") {
        profile = await getOrCreateRider(session.user.id, identifier);
      } else {
        profile = await getOrCreateUser(session.user.id, identifier);
      }
      setUser({ ...session.user, ...profile, name: profile.name || name });
    } catch (e) {
      setError("Profile load failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function signUp(email, password, name) {
    setSubmitting(true); setError(null);
    try {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { name } },
      });
      if (error) throw error;
      toast("Account created! Check your email to confirm. ✅", "success");
    } catch (e) {
      setError(e.message || "Sign up failed.");
      toast(e.message || "Sign up failed", "error");
    } finally { setSubmitting(false); }
  }

  async function login(email, password) {
    setSubmitting(true); setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (e) {
      setError(e.message || "Incorrect email or password.");
      toast("Login failed", "error");
    } finally { setSubmitting(false); }
  }

  async function loginWithGoogle() {
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (e) {
      setError("Google login failed.");
      toast("Google login failed", "error");
    }
  }

  async function resetPassword(email) {
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      toast("Reset email sent! Check your inbox. 📧", "success");
      setMode("login");
    } catch (e) {
      toast(e.message || "Reset failed", "error");
    } finally { setSubmitting(false); }
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  return {
    user, loading, submitting, error, mode, setMode,
    signUp, login, loginWithGoogle, resetPassword, logout,
  };
}
