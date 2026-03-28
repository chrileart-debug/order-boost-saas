import { supabase } from "@/integrations/supabase/client";
import { getCart, saveCart, type Cart, type CartItem } from "./cart";
import { getCustomer } from "./customer";

/**
 * Sync local cart to Supabase (upsert by phone + slug).
 * Call after every cart mutation when a customer phone is known.
 */
export async function pushCartToCloud(slug: string) {
  const customer = getCustomer();
  if (!customer?.phone) return;

  const cart = getCart();
  const items = cart && cart.establishmentSlug === slug ? cart.items : [];

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  // Use REST API directly since table is not in generated types
  await fetch(`${supabaseUrl}/rest/v1/customer_carts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      phone: customer.phone,
      establishment_slug: slug,
      items: JSON.stringify(items),
      updated_at: new Date().toISOString(),
    }),
  });
}

/**
 * Pull cart from Supabase for a given phone + slug.
 * Merges with current local cart (remote wins if local is empty).
 * Returns the loaded cart items count.
 */
export async function pullCartFromCloud(
  phone: string,
  slug: string
): Promise<number> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const res = await fetch(
    `${supabaseUrl}/rest/v1/customer_carts?phone=eq.${encodeURIComponent(
      phone
    )}&establishment_slug=eq.${encodeURIComponent(slug)}&select=items`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    }
  );

  if (!res.ok) return 0;

  const rows = await res.json();
  if (!rows || rows.length === 0) return 0;

  let remoteItems: CartItem[];
  try {
    const raw = rows[0].items;
    remoteItems = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return 0;
  }

  if (!remoteItems || remoteItems.length === 0) return 0;

  // Only load remote cart if local is empty for this slug
  const localCart = getCart();
  if (localCart && localCart.establishmentSlug === slug && localCart.items.length > 0) {
    // Local already has items, keep local
    return 0;
  }

  const cart: Cart = { establishmentSlug: slug, items: remoteItems };
  saveCart(cart);
  return remoteItems.length;
}

/**
 * Delete cart from Supabase after order is placed.
 */
export async function clearCloudCart(phone: string, slug: string) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  await fetch(
    `${supabaseUrl}/rest/v1/customer_carts?phone=eq.${encodeURIComponent(
      phone
    )}&establishment_slug=eq.${encodeURIComponent(slug)}`,
    {
      method: "DELETE",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    }
  );
}
