import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { establishmentId, action } = await req.json();

    if (!establishmentId || !action || !["cancel", "reactivate"].includes(action)) {
      return json({ error: "Missing establishmentId or invalid action (cancel|reactivate)" }, 400);
    }

    const asaasKey = Deno.env.get("ASAAS_API_KEY");
    if (!asaasKey) return json({ error: "ASAAS_API_KEY not set" }, 500);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: est, error: estErr } = await supabase
      .from("establishments")
      .select("id, asaas_subscription_id, asaas_customer_id, plan_status, cancel_at_period_end")
      .eq("id", establishmentId)
      .single();

    if (estErr || !est) return json({ error: "Establishment not found" }, 404);

    const asaasBase = "https://api.asaas.com/v3";
    const asaasHeaders = { "Content-Type": "application/json", access_token: asaasKey };

    // ── CANCEL ──
    if (action === "cancel") {
      if (!est.asaas_subscription_id) {
        return json({ error: "Nenhuma assinatura Asaas encontrada para cancelar." }, 400);
      }

      // DELETE subscription on Asaas (stops future charges)
      console.log("Tentando deletar assinatura Asaas:", est.asaas_subscription_id);
      const delRes = await fetch(`${asaasBase}/subscriptions/${est.asaas_subscription_id}`, {
        method: "DELETE",
        headers: asaasHeaders,
      });

      const delBody = await delRes.text();
      console.log("Asaas DELETE response:", delRes.status, delBody);

      // Accept 200 (success) and 404 (already deleted/doesn't exist)
      if (!delRes.ok && delRes.status !== 404) {
        console.error("Asaas DELETE subscription error:", delRes.status, delBody);
        return json({ error: "Falha ao cancelar no Asaas", details: delBody || `Status ${delRes.status}` }, 502);
      }

      console.log("Asaas subscription deleted/not found:", est.asaas_subscription_id);

      // Mark cancel_at_period_end = true, keep plan_status = 'active'
      await supabase
        .from("establishments")
        .update({ cancel_at_period_end: true })
        .eq("id", establishmentId);

      console.log("cancel_at_period_end = true para", establishmentId);
      return json({ ok: true, message: "Cancelamento agendado. Acesso mantido até o fim do ciclo." });
    }

    // ── REACTIVATE ──
    if (action === "reactivate") {
      if (!est.asaas_customer_id) {
        // No customer on Asaas — just clear the cancel flag and let user go through checkout again
        console.log("Sem asaas_customer_id, limpando cancel flag apenas");
        await supabase
          .from("establishments")
          .update({ cancel_at_period_end: false })
          .eq("id", establishmentId);
        return json({ ok: true, needsCheckout: true, message: "Assinatura reativada. Faça um novo checkout para continuar." });
      }

      // Get current subscription info from our DB
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan_type, next_billing_date")
        .eq("establishment_id", establishmentId)
        .maybeSingle();

      const planType = sub?.plan_type || "essential";
      const value = planType === "pro" ? 49.9 : 29.9;
      const planLabel = planType.charAt(0).toUpperCase() + planType.slice(1);

      // Calculate next due date (use existing or tomorrow)
      let nextDueDate: string;
      if (sub?.next_billing_date) {
        const nbd = new Date(sub.next_billing_date);
        nextDueDate = nbd > new Date() ? nbd.toISOString().split("T")[0] : new Date(Date.now() + 86400000).toISOString().split("T")[0];
      } else {
        nextDueDate = new Date(Date.now() + 86400000).toISOString().split("T")[0];
      }

      // Create a NEW subscription on Asaas
      const createRes = await fetch(`${asaasBase}/subscriptions`, {
        method: "POST",
        headers: asaasHeaders,
        body: JSON.stringify({
          customer: est.asaas_customer_id,
          billingType: "CREDIT_CARD",
          value,
          nextDueDate,
          cycle: "MONTHLY",
          description: `Plano ${planLabel} - EPRATO`,
          externalReference: establishmentId,
        }),
      });

      if (!createRes.ok) {
        const errText = await createRes.text();
        console.error("Asaas create subscription error:", errText);
        
        // If customer is invalid, just clear the flag and tell frontend to use checkout
        if (errText.includes("invalid_customer")) {
          console.log("Cliente inválido no Asaas, limpando flag e sugerindo checkout");
          await supabase
            .from("establishments")
            .update({ cancel_at_period_end: false, asaas_customer_id: null })
            .eq("id", establishmentId);
          return json({ ok: true, needsCheckout: true, message: "Cliente não encontrado no Asaas. Use o checkout para reativar." });
        }
        
        return json({ error: "Falha ao reativar no Asaas", details: errText }, 502);
      }

      const newSub = await createRes.json();
      console.log("Nova assinatura Asaas criada:", newSub.id);

      // Update establishment
      await supabase
        .from("establishments")
        .update({
          cancel_at_period_end: false,
          asaas_subscription_id: newSub.id,
        })
        .eq("id", establishmentId);

      // Update subscription record
      await supabase
        .from("subscriptions")
        .upsert({
          establishment_id: establishmentId,
          plan_type: planType,
          status: "active",
          gateway_name: "asaas",
          gateway_subscription_id: newSub.id,
          next_billing_date: nextDueDate,
          updated_at: new Date().toISOString(),
        }, { onConflict: "establishment_id" });

      console.log("Assinatura reativada para", establishmentId);
      return json({ ok: true, message: "Assinatura reativada com sucesso!" });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (err) {
    console.error("manage-asaas-subscription error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
