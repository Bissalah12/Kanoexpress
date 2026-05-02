// src/hooks/useAuth.js
// ─── Email/Password Authentication ───────────────────────
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { toast } from "../lib/notifications";

export function useAuth(role = "customer") {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isSignUp, setIsSignUp] = useState(false);

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
      const { getOrCreateUser, getOrCreateRider } = await import("../lib/supabase");
      const phone = session.user.phone || session.user.email;
      let profile;
      if (role === "rider") {
        profile = await getOrCreateRider(session.user.id, phone);
      } else {
        profile = await getOrCreateUser(session.user.id, phone);
      }
      setUser({ ...session.user, ...profile });
    } catch (e) {
      console.error("Hydrate error", e);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email, password) {
    setSubmitting(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email, password
      });
      if (error) throw error;
      toast("Welcome back!", "success");
    } catch (e) {
      setError(e.message || "Login failed. Check your email and password.");
      toast("Login failed", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function signUp(email, password, name) {
    setSubmitting(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } }
      });
      if (error) throw error;
      toast("Account created! Welcome to KanoExpress 🎉", "success");
    } catch (e) {
      setError(e.message || "Sign up failed. Try again.");
      toast("Sign up failed", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  return {
    user, loading, submitting, error,
    isSignUp, setIsSignUp,
    signIn, signUp, logout,
  };
}
