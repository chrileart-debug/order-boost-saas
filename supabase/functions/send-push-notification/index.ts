import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Convert base64url VAPID key to Uint8Array for Web Push crypto */
function base64urlToUint8Array(b64: string): Uint8Array {
  const bin = atob(b64.replace(/-/g, "+").replace(/_/g, "/") + "==".slice(0, (4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/** Build unsigned JWT for VAPID */
function buildVapidJwt(aud: string, sub: string, privateKeyB64: string): Promise<string> {
  return (async () => {
    const header = btoa(JSON.stringify({ typ: "JWT", alg: "ES256" })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const now = Math.floor(Date.now() / 1000);
    const payload = btoa(JSON.stringify({ aud, exp: now + 86400, sub })).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    const input = new TextEncoder().encode(`${header}.${payload}`);

    const rawKey = base64urlToUint8Array(privateKeyB64);
    const key = await crypto.subtle.importKey("raw", rawKey, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
    const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, input));
    const sigB64 = btoa(String.fromCharCode(...sig)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    return `${header}.${payload}.${sigB64}`;
  })();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id, new_status } = await req.json();
    if (!order_id || !new_status) {
      return new Response(JSON.stringify({ error: "order_id and new_status required" }), { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*, establishments(name, push_notify_statuses)")
      .eq("id", order_id)
      .maybeSingle();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: corsHeaders });
    }

    // Check if this status should trigger notification
    const notifyStatuses = (order.establishments as any)?.push_notify_statuses || ["preparing", "shipping", "completed"];
    if (!notifyStatuses.includes(new_status)) {
      return new Response(JSON.stringify({ message: "Status not configured for notification" }), { headers: corsHeaders });
    }

    const statusLabels: Record<string, string> = {
      pending: "Pendente",
      preparing: "Preparando",
      shipping: "Saiu para entrega",
      completed: "Entregue",
    };

    const storeName = (order.establishments as any)?.name || "Loja";
    const title = `${storeName} - Pedido atualizado`;
    const body = `Seu pedido #${order_id.slice(0, 6).toUpperCase()} está: ${statusLabels[new_status] || new_status}`;

    // Get push subscriptions for this customer
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("phone", order.customer_phone)
      .eq("establishment_id", order.establishment_id)
      .eq("role", "customer");

    const results: string[] = [];

    for (const sub of subs || []) {
      try {
        const url = new URL(sub.endpoint);
        const aud = `${url.protocol}//${url.host}`;
        const jwt = await buildVapidJwt(aud, "mailto:contato@eprato.com", vapidPrivateKey);

        const pushPayload = JSON.stringify({
          title,
          body,
          icon: "/pwa-192x192.png",
          data: { url: `/pedido/${order_id}` },
        });

        const payloadBytes = new TextEncoder().encode(pushPayload);

        const response = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Encoding": "identity",
            TTL: "86400",
            Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
          },
          body: payloadBytes,
        });

        if (response.status === 410 || response.status === 404) {
          // Subscription expired, remove it
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          results.push(`Removed expired: ${sub.id}`);
        } else {
          results.push(`Sent to ${sub.id}: ${response.status}`);
        }
      } catch (err) {
        results.push(`Error for ${sub.id}: ${(err as Error).message}`);
      }
    }

    return new Response(JSON.stringify({ sent: results.length, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});
