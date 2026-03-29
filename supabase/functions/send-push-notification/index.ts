import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ─── Crypto helpers for Web Push (RFC 8291) ─── */

function base64urlDecode(str: string): Uint8Array {
  const padded = str + "=".repeat((4 - (str.length % 4)) % 4);
  const bin = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function base64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function concatBuffers(...buffers: Uint8Array[]): Uint8Array {
  const total = buffers.reduce((s, b) => s + b.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const buf of buffers) {
    result.set(buf, offset);
    offset += buf.length;
  }
  return result;
}

function encodeLength(len: number): Uint8Array {
  return new Uint8Array([len >> 8, len & 0xff]);
}

async function createInfo(
  type: string,
  clientPublicKey: Uint8Array,
  serverPublicKey: Uint8Array
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const typeBytes = encoder.encode(type);
  const nul = new Uint8Array([0]);
  return concatBuffers(
    encoder.encode("Content-Encoding: "),
    typeBytes,
    nul,
    encoder.encode("P-256"),
    nul,
    encodeLength(clientPublicKey.length),
    clientPublicKey,
    encodeLength(serverPublicKey.length),
    serverPublicKey
  );
}

async function hkdfDerive(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", key, salt.length ? salt : new Uint8Array(32)));
  const prkKey = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const infoWithCounter = concatBuffers(info, new Uint8Array([1]));
  const okm = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, infoWithCounter));
  return okm.slice(0, length);
}

async function encryptPayload(
  payload: string,
  subscriptionKeys: { p256dh: string; auth: string }
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const clientPublicKeyBytes = base64urlDecode(subscriptionKeys.p256dh);
  const authSecret = base64urlDecode(subscriptionKeys.auth);

  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  const localPublicKey = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeyPair.publicKey)
  );

  // Import client public key
  const clientPublicKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // ECDH shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: clientPublicKey },
      localKeyPair.privateKey,
      256
    )
  );

  // Salt (random 16 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF to derive encryption key and nonce
  const authInfo = new TextEncoder().encode("Content-Encoding: auth\0");
  const prk = await hkdfDerive(authSecret, sharedSecret, authInfo, 32);

  const cekInfo = await createInfo("aesgcm", clientPublicKeyBytes, localPublicKey);
  const contentEncryptionKey = await hkdfDerive(salt, prk, cekInfo, 16);

  const nonceInfo = await createInfo("nonce", clientPublicKeyBytes, localPublicKey);
  const nonce = await hkdfDerive(salt, prk, nonceInfo, 12);

  // Encrypt with AES-128-GCM
  const paddingLength = 0;
  const paddedPayload = concatBuffers(
    new Uint8Array([paddingLength >> 8, paddingLength & 0xff]),
    new TextEncoder().encode(payload)
  );

  const aesKey = await crypto.subtle.importKey(
    "raw",
    contentEncryptionKey,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      aesKey,
      paddedPayload
    )
  );

  return { encrypted, salt, localPublicKey };
}

/* ─── VAPID JWT ─── */

async function buildVapidJwt(aud: string, sub: string, privateKeyB64: string): Promise<string> {
  const header = base64urlEncode(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64urlEncode(
    new TextEncoder().encode(JSON.stringify({ aud, exp: now + 86400, sub }))
  );
  const input = new TextEncoder().encode(`${header}.${payload}`);

  // Import the private key (PKCS8 format from base64url)
  const rawKey = base64urlDecode(privateKeyB64);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    rawKey,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, input));

  // Convert DER signature to raw r||s format (64 bytes)
  const r_s = derToRaw(signature);
  const sigB64 = base64urlEncode(r_s);

  return `${header}.${payload}.${sigB64}`;
}

function derToRaw(sig: Uint8Array): Uint8Array {
  // If already 64 bytes, it's raw format
  if (sig.length === 64) return sig;

  // Parse DER: 0x30 <len> 0x02 <rLen> <r> 0x02 <sLen> <s>
  if (sig[0] !== 0x30) return sig; // not DER, return as-is

  let offset = 2;
  const rLen = sig[offset + 1];
  const r = sig.slice(offset + 2, offset + 2 + rLen);
  offset = offset + 2 + rLen;
  const sLen = sig[offset + 1];
  const s = sig.slice(offset + 2, offset + 2 + sLen);

  // Pad/trim to 32 bytes each
  const rPadded = new Uint8Array(32);
  const sPadded = new Uint8Array(32);
  rPadded.set(r.length > 32 ? r.slice(r.length - 32) : r, 32 - Math.min(r.length, 32));
  sPadded.set(s.length > 32 ? s.slice(s.length - 32) : s, 32 - Math.min(s.length, 32));

  return concatBuffers(rPadded, sPadded);
}

/* ─── Main Handler ─── */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id, new_status } = await req.json();
    if (!order_id || !new_status) {
      return new Response(
        JSON.stringify({ error: "order_id and new_status required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
      console.error("[Push] Order not found:", orderError);
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if this status should trigger notification
    const est = order.establishments as any;
    const notifyStatuses = est?.push_notify_statuses || ["preparing", "shipping", "completed"];
    if (!notifyStatuses.includes(new_status)) {
      return new Response(
        JSON.stringify({ message: "Status not configured for notification" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const statusLabels: Record<string, string> = {
      pending: "Pendente",
      preparing: "Preparando seu pedido",
      shipping: "Saiu para entrega",
      completed: "Pedido entregue",
    };

    const storeName = est?.name || "Loja";
    const title = `${storeName}`;
    const body = `Pedido #${order_id.slice(0, 6).toUpperCase()} — ${statusLabels[new_status] || new_status}`;

    const pushPayload = JSON.stringify({
      title,
      body,
      icon: "/pwa-192x192.png",
      data: { url: `/pedido/${order_id}` },
    });

    // Get push subscriptions for this customer
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("phone", order.customer_phone)
      .eq("establishment_id", order.establishment_id)
      .eq("role", "customer");

    console.log(`[Push] Found ${subs?.length || 0} subscriptions for phone ${order.customer_phone}`);

    const results: string[] = [];

    for (const sub of subs || []) {
      try {
        const url = new URL(sub.endpoint);
        const aud = `${url.protocol}//${url.host}`;

        // Build VAPID authorization
        const jwt = await buildVapidJwt(aud, "mailto:contato@eprato.com", vapidPrivateKey);

        // Encrypt payload using subscriber's keys
        const { encrypted, salt, localPublicKey } = await encryptPayload(pushPayload, {
          p256dh: sub.keys_p256dh,
          auth: sub.keys_auth,
        });

        const response = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Encoding": "aesgcm",
            "Content-Length": String(encrypted.length),
            Encryption: `salt=${base64urlEncode(salt)}`,
            "Crypto-Key": `dh=${base64urlEncode(localPublicKey)};p256ecdsa=${vapidPublicKey}`,
            TTL: "86400",
            Authorization: `WebPush ${jwt}`,
          },
          body: encrypted,
        });

        console.log(`[Push] Sent to ${sub.id}: status=${response.status}`);

        if (response.status === 410 || response.status === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          results.push(`Removed expired: ${sub.id}`);
        } else if (response.status >= 200 && response.status < 300) {
          results.push(`OK: ${sub.id}`);
        } else {
          const text = await response.text();
          console.error(`[Push] Error ${response.status} for ${sub.id}:`, text);
          results.push(`Error ${response.status}: ${sub.id}`);
        }
      } catch (err) {
        console.error(`[Push] Exception for ${sub.id}:`, err);
        results.push(`Exception: ${sub.id} — ${(err as Error).message}`);
      }
    }

    return new Response(
      JSON.stringify({ sent: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[Push] Top-level error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
