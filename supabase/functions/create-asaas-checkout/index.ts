import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_VALUES: Record<string, number> = {
  essential: 29.9,
  pro: 49.9,
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
    const { establishmentId, planType } = await req.json();

    if (!establishmentId || !planType || !PLAN_VALUES[planType]) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid establishmentId/planType" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const asaasKey = Deno.env.get("ASAAS_API_KEY");
    if (!asaasKey) {
      return new Response(JSON.stringify({ error: "ASAAS_API_KEY not set" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Fetch establishment
    const { data: est, error: estErr } = await supabase
      .from("establishments")
      .select("id, name, current_checkout_url, checkout_expires_at, cnpj, whatsapp")
      .eq("id", establishmentId)
      .single();

    if (estErr || !est) {
      return new Response(JSON.stringify({ error: "Establishment not found" }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    // 2. Check for valid existing checkout URL
    if (est.current_checkout_url && est.checkout_expires_at) {
      const expiresAt = new Date(est.checkout_expires_at);
      if (expiresAt > new Date()) {
        console.log("Returning existing checkout URL");
        return new Response(
          JSON.stringify({ checkoutUrl: est.current_checkout_url }),
          { status: 200, headers: corsHeaders }
        );
      }
    }

    // 3. Create checkout via Asaas /v3/checkouts
    const asaasBase = "https://api.asaas.com/v3";
    const asaasHeaders = {
      "Content-Type": "application/json",
      access_token: asaasKey,
    };

    const value = PLAN_VALUES[planType];
    const planLabel = planType.charAt(0).toUpperCase() + planType.slice(1);

    const checkoutRes = await fetch(`${asaasBase}/checkouts`, {
      method: "POST",
      headers: asaasHeaders,
      body: JSON.stringify({
        billingTypes: ["CREDIT_CARD"],
        chargeType: "RECURRING",
        subscriptionCycle: "MONTHLY",
        value,
        name: `Assinatura Mensal EPRATO - ${planLabel}`,
        description: `Plano ${planLabel} - Assinatura mensal EPRATO`,
        externalReference: est.id,
      }),
    });

    if (!checkoutRes.ok) {
      const errText = await checkoutRes.text();
      console.error("Asaas checkout creation error:", errText);
      return new Response(
        JSON.stringify({ error: "Failed to create Asaas checkout", details: errText }),
        { status: 502, headers: corsHeaders }
      );
    }

    const checkoutData = await checkoutRes.json();
    console.log("Asaas checkout created:", JSON.stringify(checkoutData));

    const checkoutUrl = checkoutData.url || checkoutData.invoiceUrl || "";

    // 4. Save checkout URL with 15min expiry
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await supabase
      .from("establishments")
      .update({
        current_checkout_url: checkoutUrl,
        checkout_expires_at: expiresAt.toISOString(),
      })
      .eq("id", est.id);

    // 5. Upsert subscription as pending
    await supabase.from("subscriptions").upsert(
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

    return new Response(JSON.stringify({ checkoutUrl }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("create-asaas-checkout error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
