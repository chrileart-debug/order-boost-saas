import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PLAN_VALUES: Record<string, { min: number; max: number; name: string }> = {
  essential: { min: 25, max: 40, name: "essential" },
  pro: { min: 40, max: 70, name: "pro" },
};

function detectPlan(value: number): string {
  for (const [, range] of Object.entries(PLAN_VALUES)) {
    if (value >= range.min && value < range.max) return range.name;
  }
  // Fallback: if value >= 40, it's pro; otherwise essential
  return value >= 40 ? "pro" : "essential";
}

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

    // ── PAYMENT CONFIRMED / RECEIVED ──
    if (event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED") {
      if (!payment) {
        return new Response(JSON.stringify({ ok: true, skipped: true }), {
          status: 200,
          headers: corsHeaders,
        });
      }

      const planType = detectPlan(payment.value || 0);

      // Calculate next_billing_date: today + 30 days
      const today = new Date();
      const nextBilling = new Date(today);
      nextBilling.setDate(nextBilling.getDate() + 30);
      const nextBillingISO = nextBilling.toISOString();

      console.log(`Plano detectado: ${planType} (valor: ${payment.value})`);
      console.log(`Data de hoje: ${today.toISOString()}, Vencimento: ${nextBillingISO}`);

      // Update establishment — set active + update plan_name
      const estUpdate: Record<string, unknown> = {
        plan_status: "active",
        plan_name: planType,
        cancel_at_period_end: false,
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

      // Upsert subscription
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

    // ── PAYMENT REFUNDED / DELETED ──
    } else if (event === "PAYMENT_REFUNDED" || event === "PAYMENT_DELETED") {
      console.log("Pagamento estornado/deletado, revertendo plano");

      await supabase
        .from("establishments")
        .update({ plan_status: "inactive", plan_name: "free" })
        .eq("id", establishmentId);

      await supabase
        .from("subscriptions")
        .update({ status: "inactive", updated_at: new Date().toISOString() })
        .eq("establishment_id", establishmentId);

      if (payment) {
        await supabase.from("payments").insert({
          establishment_id: establishmentId,
          amount: payment.value || 0,
          status: "refunded",
          gateway_name: "asaas",
          gateway_transaction_id: payment.id || null,
        });
      }

      console.log("Banco atualizado: plano revertido para free (estorno)");

    // ── PAYMENT OVERDUE ──
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

    // ── SUBSCRIPTION DELETED / INACTIVE ──
    } else if (event === "SUBSCRIPTION_DELETED" || event === "SUBSCRIPTION_INACTIVE") {
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

      await supabase
        .from("establishments")
        .update({ plan_status: "inactive", plan_name: "free" })
        .eq("id", establishmentId);

      await supabase
        .from("subscriptions")
        .update({ status: "inactive", updated_at: new Date().toISOString() })
        .eq("establishment_id", establishmentId);

      console.log("Banco atualizado: inactive, plan_name resetado para free");
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
