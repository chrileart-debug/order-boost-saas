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

  // Validação de token no header
  const webhookToken = req.headers.get("asaas-access-token");
  const expectedToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");

  if (!expectedToken || webhookToken !== expectedToken) {
    console.error("Webhook token inválido ou ausente");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();
    const { event, payment, subscription: subData } = body;

    console.log("Asaas webhook received:", event, JSON.stringify(body));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const externalReference =
      payment?.externalReference ||
      subData?.externalReference ||
      body.externalReference;

    console.log("Webhook validado para o restaurante:", externalReference);

    if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
      if (!payment) {
        return new Response(JSON.stringify({ ok: true, skipped: true }), {
          status: 200,
          headers: corsHeaders,
        });
      }

      let establishmentId = externalReference;

      if (!establishmentId && payment.paymentLink) {
        const { data: estByLink } = await supabase
          .from("establishments")
          .select("id")
          .eq("current_checkout_id", payment.paymentLink)
          .single();
        if (estByLink) {
          establishmentId = estByLink.id;
        }
      }

      if (!establishmentId) {
        console.error("No externalReference or paymentLink match in payment");
        return new Response(JSON.stringify({ error: "Missing externalReference" }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      let planType = "essential";
      if (payment.value >= 49) {
        planType = "pro";
      }

      const estUpdate: Record<string, unknown> = {};
      if (payment.customer) {
        estUpdate.asaas_customer_id = payment.customer;
      }
      if (Object.keys(estUpdate).length > 0) {
        await supabase
          .from("establishments")
          .update(estUpdate)
          .eq("id", establishmentId);
      }

      const { error: subError } = await supabase
        .from("subscriptions")
        .upsert(
          {
            establishment_id: establishmentId,
            plan_type: planType,
            status: "active",
            gateway_name: "asaas",
            gateway_subscription_id: payment.subscription || null,
            next_billing_date: payment.dueDate || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "establishment_id" }
        );

      if (subError) {
        console.error("Subscription upsert error:", subError);
      }

      await supabase.from("payments").insert({
        establishment_id: establishmentId,
        amount: payment.value || 0,
        status: "approved",
        gateway_name: "asaas",
        gateway_transaction_id: payment.id || null,
      });

      console.log("Payment confirmed for establishment:", establishmentId);
    } else if (event === "PAYMENT_OVERDUE") {
      if (!externalReference) {
        return new Response(JSON.stringify({ ok: true, skipped: true }), {
          status: 200,
          headers: corsHeaders,
        });
      }

      await supabase
        .from("subscriptions")
        .update({ status: "overdue", updated_at: new Date().toISOString() })
        .eq("establishment_id", externalReference);

      console.log("Payment overdue for:", externalReference);
    } else if (event === "SUBSCRIPTION_DELETED" || event === "SUBSCRIPTION_INACTIVE") {
      if (!externalReference) {
        return new Response(JSON.stringify({ ok: true, skipped: true }), {
          status: 200,
          headers: corsHeaders,
        });
      }

      await supabase
        .from("subscriptions")
        .update({ status: "inactive", updated_at: new Date().toISOString() })
        .eq("establishment_id", externalReference);

      console.log("Subscription deleted/inactive for:", externalReference);
    } else {
      console.log("Unhandled event:", event);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("Asaas webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
