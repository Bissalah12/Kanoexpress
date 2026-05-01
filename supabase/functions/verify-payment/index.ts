// supabase/functions/verify-payment/index.ts
// ─── Supabase Edge Function — Paystack Verification ───────
// Deploy with: supabase functions deploy verify-payment
// Set secret: supabase secrets set PAYSTACK_SECRET_KEY=sk_live_...

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { reference, orderId } = await req.json();
    if (!reference) return new Response(JSON.stringify({ error: "No reference" }), { status: 400, headers: CORS });

    // Verify with Paystack
    const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}` },
    });
    const paystackData = await paystackRes.json();

    if (!paystackData.status || paystackData.data?.status !== "success") {
      return new Response(JSON.stringify({ verified: false }), { headers: CORS });
    }

    // Mark order as paid in DB
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (orderId) {
      await supabase
        .from("orders")
        .update({ payment_status: "paid", paystack_ref: reference })
        .eq("id", orderId);
    }

    return new Response(
      JSON.stringify({ verified: true, amount: paystackData.data.amount / 100 }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
  }
});
