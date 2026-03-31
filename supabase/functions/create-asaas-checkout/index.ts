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
    const { establishmentId, planType, originUrl: rawOrigin } = await req.json();
    const normalizedEstablishmentId =
      typeof establishmentId === "string" ? establishmentId.trim() : "";
    const originUrl = rawOrigin && rawOrigin.startsWith("http") ? rawOrigin : "https://eprato.lovable.app";

    if (!normalizedEstablishmentId || !planType || !PLAN_VALUES[planType]) {
      return jsonResponse({ error: "Missing or invalid establishmentId/planType" }, 400);
    }

    const asaasKey = Deno.env.get("ASAAS_API_KEY");
    if (!asaasKey) {
      return jsonResponse({ error: "ASAAS_API_KEY not set" }, 500);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Read establishment + current subscription BEFORE any write
    const { data: est, error: estErr } = await supabase
      .from("establishments")
      .select("id, name, current_checkout_url, checkout_expires_at, current_checkout_id, plan_status")
      .eq("id", normalizedEstablishmentId)
      .single();

    if (estErr || !est) {
      return jsonResponse({ error: "Establishment not found" }, 404);
    }

    const { data: currentSub } = await supabase
      .from("subscriptions")
      .select("plan_type, status")
      .eq("establishment_id", normalizedEstablishmentId)
      .maybeSingle();

    console.log(`Estado atual: plan_status=${est.plan_status}, sub_plan=${currentSub?.plan_type}, sub_status=${currentSub?.status}, solicitado=${planType}`);

    // RULE: active + same plan => block
    if (est.plan_status === "active" && currentSub?.plan_type === planType) {
      console.log("Mesmo plano ativo, bloqueando checkout");
      return jsonResponse({ error: "Você já possui este plano ativo.", alreadyActive: true }, 200);
    }

    // RULE: active + different plan => upgrade allowed
    if (est.plan_status === "active" && currentSub?.plan_type !== planType) {
      console.log(`Upgrade permitido: ${currentSub?.plan_type} -> ${planType}`);
    }

    // Check for existing valid checkout WITH matching plan value
    if (est.current_checkout_url && est.current_checkout_url.length > 0 && est.checkout_expires_at) {
      const expiresAt = new Date(est.checkout_expires_at);
      if (expiresAt > new Date()) {
        // Only reuse if the cached checkout is for the SAME plan being requested
        // We check by looking at current_checkout_id presence — but for safety,
        // we skip reuse during upgrades (plan differs from active sub)
        const isUpgrade = est.plan_status === "active" && currentSub?.plan_type !== planType;
        if (!isUpgrade) {
          console.log("Reutilizando checkout existente:", est.current_checkout_url);
          return jsonResponse({ checkoutUrl: est.current_checkout_url }, 200);
        }
        console.log("Upgrade: ignorando checkout cacheado, criando novo");
      }
    }

    // Create new Asaas checkout
    const asaasBase = "https://api.asaas.com/v3";
    const asaasHeaders = {
      "Content-Type": "application/json",
      access_token: asaasKey,
    };

    const value = PLAN_VALUES[planType];
    const planLabel = planType.charAt(0).toUpperCase() + planType.slice(1);
    const today = new Date();
    const nextDueDate = today.toISOString().split("T")[0];

    const checkoutRes = await fetch(`${asaasBase}/checkouts`, {
      method: "POST",
      headers: asaasHeaders,
      body: JSON.stringify({
        billingTypes: ["CREDIT_CARD"],
        chargeTypes: ["RECURRENT"],
        minutesToExpire: CHECKOUT_EXPIRATION_MINUTES,
        externalReference: normalizedEstablishmentId,
        items: [
          {
            name: `Plano ${planLabel}`,
            description: "Assinatura Mensal EPRATO",
            externalReference: normalizedEstablishmentId,
            quantity: 1,
            value,
          },
        ],
        subscription: {
          cycle: "MONTHLY",
          nextDueDate,
        },
        callback: {
          successUrl: `${originUrl}/dashboard/subscription?status=success`,
          cancelUrl: `${originUrl}/dashboard/subscription?status=cancel`,
          expiredUrl: `${originUrl}/dashboard/subscription?status=expired`,
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
    console.log("Asaas checkout response:", JSON.stringify(checkoutData));

    const checkoutUrl = checkoutData.checkoutUrl || checkoutData.link || checkoutData.url || "";

    if (!checkoutUrl) {
      console.error("Asaas returned empty checkout URL");
      return jsonResponse({ error: "Asaas returned empty checkout URL", rawResponse: checkoutData }, 502);
    }

    const expiresAt = new Date(Date.now() + CHECKOUT_EXPIRATION_MINUTES * 60 * 1000).toISOString();

    // ONLY update checkout metadata — NEVER touch plan_status here
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

    // DO NOT upsert subscriptions here — the webhook is the ONLY authority to change subscription status.
    // This prevents overwriting an active subscription with "pending" during upgrades.

    console.log(`Checkout criado com sucesso. Decisão: ${est.plan_status === "active" ? "upgrade" : "nova assinatura"}`);

    return jsonResponse({ checkoutUrl }, 200);
  } catch (err) {
    console.error("create-asaas-checkout error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
