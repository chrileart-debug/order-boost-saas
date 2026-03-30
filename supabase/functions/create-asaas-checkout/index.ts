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

    const asaasBase = "https://api.asaas.com/v3";
    const asaasHeaders = {
      "Content-Type": "application/json",
      access_token: asaasKey,
    };

    // 1. Fetch establishment
    const { data: est, error: estErr } = await supabase
      .from("establishments")
      .select("id, name, asaas_customer_id, current_checkout_url, checkout_expires_at, cnpj, whatsapp")
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

    // 3. Ensure Asaas customer exists
    let customerId = est.asaas_customer_id;
    if (!customerId) {
      const customerRes = await fetch(`${asaasBase}/customers`, {
        method: "POST",
        headers: asaasHeaders,
        body: JSON.stringify({
          name: est.name,
          cpfCnpj: est.cnpj?.replace(/\D/g, "") || "00000000000",
          mobilePhone: est.whatsapp?.replace(/\D/g, "") || undefined,
          externalReference: est.id,
        }),
      });

      if (!customerRes.ok) {
        const errText = await customerRes.text();
        console.error("Asaas customer creation error:", errText);
        return new Response(
          JSON.stringify({ error: "Failed to create Asaas customer" }),
          { status: 502, headers: corsHeaders }
        );
      }

      const customerData = await customerRes.json();
      customerId = customerData.id;

      await supabase
        .from("establishments")
        .update({ asaas_customer_id: customerId })
        .eq("id", est.id);
    }

    // 4. Create subscription in Asaas
    const value = PLAN_VALUES[planType];
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 1);
    const dueDateStr = nextDueDate.toISOString().split("T")[0]; // YYYY-MM-DD

    const subRes = await fetch(`${asaasBase}/subscriptions`, {
      method: "POST",
      headers: asaasHeaders,
      body: JSON.stringify({
        customer: customerId,
        billingType: "CREDIT_CARD",
        cycle: "MONTHLY",
        value,
        nextDueDate: dueDateStr,
        description: `Plano ${planType.charAt(0).toUpperCase() + planType.slice(1)} - ePrato`,
        externalReference: est.id,
      }),
    });

    if (!subRes.ok) {
      const errText = await subRes.text();
      console.error("Asaas subscription creation error:", errText);
      return new Response(
        JSON.stringify({ error: "Failed to create Asaas subscription" }),
        { status: 502, headers: corsHeaders }
      );
    }

    const subData = await subRes.json();
    console.log("Asaas subscription created:", JSON.stringify(subData));

    // The invoiceUrl is the payment link
    const checkoutUrl = subData.invoiceUrl || subData.bankSlipUrl || "";

    // Save checkout URL with 24h expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await supabase
      .from("establishments")
      .update({
        current_checkout_url: checkoutUrl,
        checkout_expires_at: expiresAt.toISOString(),
      })
      .eq("id", est.id);

    // Also upsert into subscriptions table as pending
    await supabase.from("subscriptions").upsert(
      {
        establishment_id: est.id,
        plan_type: planType,
        status: "pending",
        gateway_name: "asaas",
        gateway_subscription_id: subData.id,
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
