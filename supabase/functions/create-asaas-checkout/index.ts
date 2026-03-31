import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

const CHECKOUT_EXPIRATION_MINUTES = 120;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });

const PLAN_VALUES: Record<string, number> = {
  essential: 29.9,
  pro: 49.9,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { establishmentId, planType } = await req.json();

    if (!establishmentId || !planType || !PLAN_VALUES[planType]) {
      return jsonResponse({ error: "Missing or invalid establishmentId/planType" }, 400);
    }

    const asaasKey = Deno.env.get("ASAAS_API_KEY");
    if (!asaasKey) {
      return jsonResponse({ error: "ASAAS_API_KEY not set" }, 500);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: est, error: estErr } = await supabase
      .from("establishments")
      .select("id, name, current_checkout_url, checkout_expires_at, current_checkout_id")
      .eq("id", establishmentId)
      .single();

    if (estErr || !est) {
      return jsonResponse({ error: "Establishment not found" }, 404);
    }

    // Check for existing valid checkout WITH matching plan type
    if (est.current_checkout_url && est.current_checkout_url.length > 0 && est.checkout_expires_at) {
      const expiresAt = new Date(est.checkout_expires_at);
      if (expiresAt > new Date()) {
        // Verify the cached checkout matches the requested plan
        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("plan_type, status")
          .eq("establishment_id", establishmentId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingSub && existingSub.plan_type === planType && existingSub.status === "pending") {
          console.log("Returning existing checkout URL:", est.current_checkout_url);
          return jsonResponse({ checkoutUrl: est.current_checkout_url }, 200);
        }
        console.log("Cached checkout plan mismatch or not pending, creating new checkout");
      }
    }

    const asaasBase = "https://api.asaas.com/v3";
    const asaasHeaders = {
      "Content-Type": "application/json",
      access_token: asaasKey,
    };

    const value = PLAN_VALUES[planType];
    const planLabel = planType.charAt(0).toUpperCase() + planType.slice(1);
    const today = new Date();
    const nextDueDate = today.toISOString().split("T")[0];
    const appUrl = "https://eprato.lovable.app";

    const checkoutRes = await fetch(`${asaasBase}/checkouts`, {
      method: "POST",
      headers: asaasHeaders,
      body: JSON.stringify({
        billingTypes: ["CREDIT_CARD"],
        chargeTypes: ["RECURRENT"],
        minutesToExpire: CHECKOUT_EXPIRATION_MINUTES,
        externalReference: establishmentId,
        items: [
          {
            name: `Plano ${planLabel}`,
            description: "Assinatura Mensal EPRATO",
            quantity: 1,
            value,
          },
        ],
        subscription: {
          cycle: "MONTHLY",
          nextDueDate,
        },
        callback: {
          successUrl: `${appUrl}/dashboard/subscription?status=success`,
          cancelUrl: `${appUrl}/dashboard/subscription?status=cancel`,
          expiredUrl: `${appUrl}/dashboard/subscription?status=expired`,
          autoRedirect: true,
        },
      }),
    });

    if (!checkoutRes.ok) {
      const errText = await checkoutRes.text();
      console.error("Asaas checkout creation error:", errText);
      return jsonResponse({ error: "Failed to create Asaas checkout", details: errText }, 502);
    }

    const checkoutData = await checkoutRes.json();
    console.log("Asaas checkout full response:", JSON.stringify(checkoutData));

    const checkoutUrl = checkoutData.checkoutUrl || checkoutData.link || checkoutData.url || "";
    console.log("Link recebido do Asaas:", checkoutData.checkoutUrl || checkoutData.link || checkoutData.url || null);

    if (!checkoutUrl) {
      console.error("Asaas returned empty checkout URL");
      return jsonResponse({ error: "Asaas returned empty checkout URL", rawResponse: checkoutData }, 502);
    }

    const expiresAt = new Date(Date.now() + CHECKOUT_EXPIRATION_MINUTES * 60 * 1000).toISOString();

    const { error: updateErr } = await supabase
      .from("establishments")
      .update({
        current_checkout_url: checkoutUrl,
        checkout_expires_at: expiresAt,
        current_checkout_id: checkoutData.id || null,
      })
      .eq("id", est.id);

    if (updateErr) {
      console.error("Failed to update establishment:", JSON.stringify(updateErr));
      return jsonResponse({ error: "Failed to save checkout URL", details: updateErr.message }, 500);
    }

    const { error: subErr } = await supabase.from("subscriptions").upsert(
      {
        establishment_id: est.id,
        plan_type: planType,
        status: "pending",
        gateway_name: "asaas",
        gateway_subscription_id: checkoutData.id || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "establishment_id" }
    );

    if (subErr) {
      console.error("Failed to upsert subscription:", JSON.stringify(subErr));
      return jsonResponse({ error: "Checkout created but subscription sync failed", details: subErr.message }, 500);
    }

    return jsonResponse({ checkoutUrl }, 200);
  } catch (err) {
    console.error("create-asaas-checkout error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
