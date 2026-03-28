/**
 * Web Push subscription helper — handles subscribing/unsubscribing
 * and persisting to Supabase push_subscriptions table.
 */
import { supabase } from "@/integrations/supabase/client";

const VAPID_PUBLIC_KEY = "BG6eowty0f2cpLfVAC6w6oLOapUt3VuPSXgpjbKwd3_cclmHiTwtgR1nL7WZJ2-4fFipSvAztf5CmITyuxRfJdQ";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export async function subscribeToPush(opts: {
  phone?: string;
  establishmentId?: string;
  userId?: string;
  role: "customer" | "owner";
}): Promise<boolean> {
  if (!isPushSupported()) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });
    }

    const keys = sub.toJSON().keys || {};

    // Upsert to Supabase
    await supabase.from("push_subscriptions").upsert(
      {
        endpoint: sub.endpoint,
        keys_p256dh: keys.p256dh || "",
        keys_auth: keys.auth || "",
        phone: opts.phone || null,
        establishment_id: opts.establishmentId || null,
        user_id: opts.userId || null,
        role: opts.role,
      },
      { onConflict: "endpoint" }
    );

    return true;
  } catch (err) {
    console.error("[Push] Erro ao inscrever:", err);
    return false;
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  const sub = await getExistingSubscription();
  if (sub) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    await sub.unsubscribe();
  }
}
