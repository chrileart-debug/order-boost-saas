import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();
    const { id, type } = body;

    console.log("Webhook received:", { id, type });

    // Only handle subscription notifications
    if (type !== "subscription_preapproval") {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    const mpToken = Deno.env.get("MP_ACCESS_TOKEN");
    if (!mpToken) {
      console.error("MP_ACCESS_TOKEN not configured");
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Fetch subscription details from Mercado Pago
    const mpRes = await fetch(
      `https://api.mercadopago.com/preapproval/${id}`,
      {
        headers: { Authorization: `Bearer ${mpToken}` },
      }
    );

    if (!mpRes.ok) {
      const errText = await mpRes.text();
      console.error("MP API error:", mpRes.status, errText);
      return new Response(
        JSON.stringify({ error: "Failed to fetch MP details" }),
        { status: 502, headers: corsHeaders }
      );
    }

    const mpData = await mpRes.json();
    console.log("MP subscription data:", JSON.stringify(mpData));

    const establishmentId = mpData.external_reference;
    if (!establishmentId) {
      console.error("No external_reference in MP data");
      return new Response(
        JSON.stringify({ error: "Missing external_reference" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Determine plan type from the preapproval_plan_id
    const planId = mpData.preapproval_plan_id;
    let planType = "essential";
    if (planId === "14d541e5eb6543aaa2ff7514f1fca373") {
      planType = "pro";
    }

    // Map MP status to our status
    const mpStatus = mpData.status; // "authorized", "paused", "cancelled", "pending"
    let ourStatus = "inactive";
    if (mpStatus === "authorized") ourStatus = "active";
    else if (mpStatus === "paused") ourStatus = "paused";
    else if (mpStatus === "cancelled") ourStatus = "cancelled";
    else if (mpStatus === "pending") ourStatus = "pending";

    // Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Upsert subscription
    const nextBilling = mpData.next_payment_date || null;

    const { error: subError } = await supabase
      .from("subscriptions")
      .upsert(
        {
          establishment_id: establishmentId,
          plan_type: planType,
          status: ourStatus,
          gateway_name: "mercadopago",
          gateway_subscription_id: String(id),
          next_billing_date: nextBilling,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "establishment_id" }
      );

    if (subError) {
      console.error("Subscription upsert error:", subError);
      // Fallback: try insert if upsert fails (no unique constraint yet)
      const { error: insertErr } = await supabase
        .from("subscriptions")
        .insert({
          establishment_id: establishmentId,
          plan_type: planType,
          status: ourStatus,
          gateway_name: "mercadopago",
          gateway_subscription_id: String(id),
          next_billing_date: nextBilling,
        });

      if (insertErr) {
        console.error("Subscription insert fallback error:", insertErr);
      }
    }

    // Register payment if status is authorized
    if (ourStatus === "active") {
      const amount = mpData.auto_recurring?.transaction_amount || 0;
      await supabase.from("payments").insert({
        establishment_id: establishmentId,
        amount,
        status: "approved",
        gateway_name: "mercadopago",
        gateway_transaction_id: String(id),
      });
    }

    console.log("Webhook processed successfully for establishment:", establishmentId);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
