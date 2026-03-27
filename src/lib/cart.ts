export interface CartItemOption {
  name: string;
  price: number;
  quantity: number;
}

export interface CartItem {
  productId: string;
  productName: string;
  productImage: string | null;
  basePrice: number;
  quantity: number;
  options: CartItemOption[];
  notes?: string;
}

export interface Cart {
  establishmentSlug: string;
  items: CartItem[];
}

const CART_KEY = "eprato_cart";

export function getCart(): Cart | null {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return null;
    const cart = JSON.parse(raw) as Cart;
    // Migrate old carts that don't have quantity on options
    cart.items = cart.items.map(item => ({
      ...item,
      options: item.options.map(o => ({ ...o, quantity: o.quantity || 1 })),
    }));
    return cart;
  } catch {
    return null;
  }
}

export function saveCart(cart: Cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function clearCart() {
  localStorage.removeItem(CART_KEY);
}

export function addToCart(slug: string, item: CartItem) {
  let cart = getCart();
  if (!cart || cart.establishmentSlug !== slug) {
    cart = { establishmentSlug: slug, items: [] };
  }
  cart.items.push(item);
  saveCart(cart);
  return cart;
}

export function removeFromCart(index: number) {
  const cart = getCart();
  if (!cart) return null;
  cart.items.splice(index, 1);
  saveCart(cart);
  return cart;
}

export function updateCartItemQuantity(index: number, quantity: number) {
  const cart = getCart();
  if (!cart) return null;
  if (quantity <= 0) {
    cart.items.splice(index, 1);
  } else {
    cart.items[index].quantity = quantity;
  }
  saveCart(cart);
  return cart;
}

export function getCartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => {
    const optionsTotal = item.options.reduce((s, o) => s + o.price * o.quantity, 0);
    return sum + (item.basePrice + optionsTotal) * item.quantity;
  }, 0);
}
