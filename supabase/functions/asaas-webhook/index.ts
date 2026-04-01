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

  // Validate webhook token
  const webhookToken = req.headers.get("asaas-access-token");
  const expectedToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");

  if (!expectedToken || webhookToken !== expectedToken) {
    console.error("Webhook token inválido ou ausente");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: corsHeaders,
    });
  }
  console.log("Token validado");

  try {
    const body = await req.json();
    const { event, payment, subscription: subData } = body;

    console.log("Asaas webhook received:", event, JSON.stringify(body));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let resolvedEstablishmentId: string | null =
      payment?.externalReference || subData?.externalReference || null;

    // Fallback: look up by checkoutSession
    if (!resolvedEstablishmentId && payment?.checkoutSession) {
      const { data: estBySession } = await supabase
        .from("establishments")
        .select("id")
        .eq("current_checkout_id", payment.checkoutSession)
        .maybeSingle();
      if (estBySession) {
        resolvedEstablishmentId = estBySession.id;
      }
    }

    console.log("ID identificado:", resolvedEstablishmentId);

    if (!resolvedEstablishmentId) {
      console.error("ExternalReference ausente e fallback falhou");
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    const establishmentId = resolvedEstablishmentId;

    if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
      if (!payment) {
        return new Response(JSON.stringify({ ok: true, skipped: true }), {
          status: 200,
          headers: corsHeaders,
        });
      }

      let planType = "essential";
      if (payment.value >= 49) {
        planType = "pro";
      }

      // Calculate next_billing_date: today + 30 days (UTC-safe)
      const today = new Date();
      const nextBilling = new Date(today);
      nextBilling.setDate(nextBilling.getDate() + 30);
      const nextBillingISO = nextBilling.toISOString();

      console.log(`Data de hoje: ${today.toISOString()}, Data calculada para vencimento: ${nextBillingISO}`);

      // Update establishment — ALWAYS set active on confirmed payment
      const estUpdate: Record<string, unknown> = {
        plan_status: "active",
        cancel_at_period_end: false, // Clear any pending cancellation
      };
      if (payment.customer) {
        estUpdate.asaas_customer_id = payment.customer;
      }
      if (payment.subscription) {
        estUpdate.asaas_subscription_id = payment.subscription;
      }

      const { error: estUpdateError } = await supabase
        .from("establishments")
        .update(estUpdate)
        .eq("id", establishmentId);

      if (estUpdateError) {
        console.error("Falha ao atualizar establishments:", estUpdateError.message);
      }

      // Upsert subscription with CONFIRMED data
      const { error: subError } = await supabase
        .from("subscriptions")
        .upsert(
          {
            establishment_id: establishmentId,
            plan_type: planType,
            status: "active",
            gateway_name: "asaas",
            gateway_subscription_id: payment.subscription || null,
            next_billing_date: payment.dueDate || nextBillingISO,
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

      console.log("Banco atualizado: plano ativado", planType, "próxima cobrança:", payment.dueDate || nextBillingISO);
    } else if (event === "PAYMENT_OVERDUE") {
      const { error: overdueUpdateError } = await supabase
        .from("establishments")
        .update({ plan_status: "overdue" })
        .eq("id", establishmentId);

      if (overdueUpdateError) {
        console.error("Falha ao atualizar plan_status overdue:", overdueUpdateError.message);
      }

      await supabase
        .from("subscriptions")
        .update({ status: "overdue", updated_at: new Date().toISOString() })
        .eq("establishment_id", establishmentId);

      console.log("Banco atualizado: overdue");
    } else if (event === "SUBSCRIPTION_DELETED" || event === "SUBSCRIPTION_INACTIVE") {
      // PROTECTION: Only degrade if the event matches the ACTIVE subscription
      const subscriptionIdFromEvent = subData?.id || payment?.subscription || null;

      const { data: est } = await supabase
        .from("establishments")
        .select("asaas_subscription_id")
        .eq("id", establishmentId)
        .maybeSingle();

      if (est && subscriptionIdFromEvent && est.asaas_subscription_id !== subscriptionIdFromEvent) {
        console.log(`Evento órfão ignorado: evento sub=${subscriptionIdFromEvent}, ativa=${est.asaas_subscription_id}`);
        return new Response(JSON.stringify({ ok: true, skipped: true }), {
          status: 200,
          headers: corsHeaders,
        });
      }

      const { error: inactiveUpdateError } = await supabase
        .from("establishments")
        .update({ plan_status: "inactive" })
        .eq("id", establishmentId);

      if (inactiveUpdateError) {
        console.error("Falha ao atualizar plan_status inactive:", inactiveUpdateError.message);
      }

      await supabase
        .from("subscriptions")
        .update({ status: "inactive", updated_at: new Date().toISOString() })
        .eq("establishment_id", establishmentId);

      console.log("Banco atualizado: inactive");
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
