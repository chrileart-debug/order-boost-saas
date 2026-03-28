import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, Trash2, ArrowLeft, Tag, X } from "lucide-react";
import { getCart, removeFromCart, updateCartItemQuantity, getCartTotal, clearCart, type Cart } from "@/lib/cart";
import { haversineDistance } from "@/lib/haversine";
import { resolveShipping, type DeliveryRule, type ShippingResult } from "@/lib/shipping";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import MaskedInput from "@/components/MaskedInput";
import { unmaskPhone } from "@/lib/masks";
import { getCustomer, saveCustomer } from "@/lib/customer";
import { pushCartToCloud, clearCloudCart } from "@/lib/cartSync";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  establishment: any;
  onCartChange: () => void;
}

const CartDrawer = ({ open, onOpenChange, slug, establishment, onCartChange }: Props) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cart, setCart] = useState<Cart | null>(null);
  const [step, setStep] = useState<"cart" | "checkout">("cart");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [cep, setCep] = useState("");
  const [addressText, setAddressText] = useState("");
  const [numero, setNumero] = useState("");
  const [customerLat, setCustomerLat] = useState<number | null>(null);
  const [customerLng, setCustomerLng] = useState<number | null>(null);
  const [shippingFee, setShippingFee] = useState(0);
  const [shippingLabel, setShippingLabel] = useState("");
  const [shippingBlocked, setShippingBlocked] = useState(false);
  const [deliveryRules, setDeliveryRules] = useState<DeliveryRule[]>([]);
  const [loadingCep, setLoadingCep] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [observations, setObservations] = useState("");

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const cepDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCepChange = useCallback((v: string) => {
    setCep(v);
    const digits = v.replace(/\D/g, "");
    if (digits.length < 8) {
      if (cepDebounceRef.current) clearTimeout(cepDebounceRef.current);
      setShippingFee(0);
      setShippingLabel("");
      setShippingBlocked(false);
      setAddressText("");
      setCustomerLat(null);
      setCustomerLng(null);
    } else if (digits.length === 8) {
      if (cepDebounceRef.current) clearTimeout(cepDebounceRef.current);
      cepDebounceRef.current = setTimeout(() => lookupCep(v), 500);
    }
  }, [deliveryRules, establishment]);

  useEffect(() => {
    if (open) {
      const c = getCart();
      setCart(c && c.establishmentSlug === slug ? c : null);
      setStep("cart");
      setAppliedCoupon(null);
      setCouponCode("");
      setCouponError("");
      setShippingLabel("");
      setShippingBlocked(false);
      setShippingFee(0);
      // Pre-fill customer data from localStorage
      const saved = getCustomer();
      if (saved) {
        if (!customerName) setCustomerName(saved.name);
        if (!customerPhone) setCustomerPhone(saved.phone);
      }
      // Fetch delivery rules for this establishment
      if (establishment?.id) {
        supabase
          .from("delivery_rules" as any)
          .select("*")
          .eq("establishment_id", establishment.id)
          .eq("is_active", true)
          .order("priority", { ascending: true })
          .then(({ data }) => setDeliveryRules((data as any as DeliveryRule[]) || []));
      }
    }
  }, [open, slug, establishment?.id]);

  const refreshCart = () => {
    const c = getCart();
    setCart(c && c.establishmentSlug === slug ? c : null);
    onCartChange();
  };

  const handleRemove = (i: number) => {
    removeFromCart(i);
    refreshCart();
    pushCartToCloud(slug);
  };

  const handleQty = (i: number, q: number) => {
    updateCartItemQuantity(i, q);
    refreshCart();
    pushCartToCloud(slug);
  };

  const lookupCep = async (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        const bairro = data.bairro || "";
        setAddressText(`${data.logradouro}, ${bairro}, ${data.localidade} - ${data.uf}`);

        let distanceKm: number | null = null;
        // Geocode customer address
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            `${data.logradouro}, ${bairro}, ${data.localidade}, ${data.uf}, Brasil`
          )}&limit=1`
        );
        const geo = await geoRes.json();
        if (geo.length > 0) {
          const lat = parseFloat(geo[0].lat);
          const lng = parseFloat(geo[0].lon);
          setCustomerLat(lat);
          setCustomerLng(lng);
          if (establishment.lat && establishment.lng) {
            distanceKm = haversineDistance(establishment.lat, establishment.lng, lat, lng);
          }
        }

        // Resolve shipping using rules
        if (deliveryRules.length > 0) {
          const result = resolveShipping(deliveryRules, digits, distanceKm);
          setShippingFee(result.fee);
          setShippingLabel(
            result.blocked
              ? result.label
              : result.fee === 0
              ? `Frete GRÁTIS${bairro ? ` para ${bairro}` : ""}`
              : `Frete para ${bairro || "seu endereço"}: R$ ${result.fee.toFixed(2)}`
          );
          setShippingBlocked(result.blocked);
        } else {
          // Fallback to legacy fields
          if (distanceKm !== null && establishment.base_fee != null) {
            const extraKm = Math.max(0, distanceKm - (establishment.km_included || 0));
            const fee = (establishment.base_fee || 0) + extraKm * (establishment.km_extra_price || 0);
            setShippingFee(Math.round(fee * 100) / 100);
            setShippingLabel(`Frete para ${bairro || "seu endereço"}: R$ ${(Math.round(fee * 100) / 100).toFixed(2)}`);
          }
          setShippingBlocked(false);
        }
      }
    } catch {
      // ignore
    }
    setLoadingCep(false);
  };

  // ─── Coupon validation ───
  const validateCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    setCouponError("");
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("establishment_id", establishment.id)
        .ilike("code", couponCode.trim())
        .maybeSingle();

      if (error || !data) {
        setCouponError("Cupom não encontrado.");
        setAppliedCoupon(null);
        setValidatingCoupon(false);
        return;
      }
      if (data.is_active === false) {
        setCouponError("Este cupom está inativo.");
        setAppliedCoupon(null);
        setValidatingCoupon(false);
        return;
      }
      const minPurchase = Number(data.min_purchase || 0);
      if (subtotal < minPurchase) {
        setCouponError(`Compra mínima de ${formatPrice(minPurchase)} não atingida.`);
        setAppliedCoupon(null);
        setValidatingCoupon(false);
        return;
      }
      setAppliedCoupon(data);
      setCouponError("");
      toast({ title: `Cupom "${data.code}" aplicado!` });
    } catch {
      setCouponError("Erro ao validar cupom.");
    }
    setValidatingCoupon(false);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
  };

  const formatPrice = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const subtotal = cart ? getCartTotal(cart.items) : 0;

  // Calculate discount
  let discount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === "percentage") {
      discount = Math.round(subtotal * (Number(appliedCoupon.value) / 100) * 100) / 100;
    } else {
      discount = Math.min(Number(appliedCoupon.value), subtotal);
    }
  }

  const total = Math.max(0, subtotal - discount + shippingFee);

  const handleSubmit = async () => {
    if (!cart || cart.items.length === 0) return;
    setSubmitting(true);
    try {
      const fullAddress = numero ? `${addressText}, ${numero}` : addressText;

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          establishment_id: establishment.id,
          customer_name: customerName,
          customer_phone: unmaskPhone(customerPhone),
          address_text: fullAddress,
          lat: customerLat,
          lng: customerLng,
          subtotal,
          shipping_fee: shippingFee,
          discount,
          total_price: total,
          payment_method: paymentMethod,
          coupon_code: appliedCoupon?.code || null,
          observations: observations.trim() || null,
          status: "pending",
        } as any)
        .select("id")
        .single();

      if (orderError) throw orderError;

      // Record coupon usage + increment counter
      if (appliedCoupon) {
        // Insert usage history via REST since table isn't in generated types
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        await fetch(`${supabaseUrl}/rest/v1/coupon_usage_history`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ coupon_id: appliedCoupon.id, order_id: order.id }),
        });
        // Increment usage_count
        await supabase
          .from("coupons")
          .update({ usage_count: (appliedCoupon.usage_count || 0) + 1 })
          .eq("id", appliedCoupon.id);
      }

      for (const item of cart.items) {
        const { data: oi, error: oiError } = await supabase
          .from("order_items")
          .insert({
            order_id: order.id,
            product_id: item.productId,
            product_name: item.productName,
            quantity: item.quantity,
            unit_price: item.basePrice,
            notes: item.notes || "",
          } as any)
          .select("id")
          .single();

        if (oiError) throw oiError;

        if (item.options.length > 0) {
          const { error: optError } = await supabase
            .from("order_item_options")
            .insert(
              item.options.map((o) => ({
                order_item_id: oi.id,
                option_name: o.name,
                option_price: o.price,
              }))
            );
          if (optError) throw optError;
        }
      }

      clearCart();
      onCartChange();
      // Save customer identity for "Meus Pedidos"
      const cleanPhone = unmaskPhone(customerPhone);
      saveCustomer({ phone: cleanPhone, name: customerName });
      // Clear cloud cart after order
      clearCloudCart(cleanPhone, slug);
      onOpenChange(false);
      navigate(`/pedido/${order.id}`);
    } catch (err: any) {
      toast({ title: "Erro ao finalizar pedido", description: err.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  if (!cart || cart.items.length === 0) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Sacola</SheetTitle>
          </SheetHeader>
          <div className="flex-1 flex items-center justify-center py-20">
            <p className="text-muted-foreground">Sua sacola está vazia.</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <div className="p-6 pb-0">
          <SheetHeader>
            <div className="flex items-center gap-2">
              {step === "checkout" && (
                <button onClick={() => setStep("cart")}>
                  <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                </button>
              )}
              <SheetTitle>{step === "cart" ? "Sacola" : "Finalizar pedido"}</SheetTitle>
            </div>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pt-4">
          {step === "cart" ? (
            <div className="space-y-4">
              {cart.items.map((item, i) => (
                <div key={i} className="flex gap-3 items-start">
                  {item.productImage && (
                    <img src={item.productImage} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-foreground truncate">{item.productName}</h4>
                    {item.options.length > 0 && (
                      <p className="text-xs text-muted-foreground truncate">
                        {item.options.map((o) => o.quantity > 1 ? `${o.quantity}x ${o.name}` : o.name).join(", ")}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-xs text-muted-foreground italic truncate">📝 {item.notes}</p>
                    )}
                    <p className="text-sm font-semibold text-primary mt-0.5">
                      {formatPrice((item.basePrice + item.options.reduce((s, o) => s + o.price * (o.quantity || 1), 0)) * item.quantity)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <button onClick={() => handleQty(i, item.quantity - 1)} className="w-6 h-6 rounded-full border border-border flex items-center justify-center">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                      <button onClick={() => handleQty(i, item.quantity + 1)} className="w-6 h-6 rounded-full border border-border flex items-center justify-center">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <button onClick={() => handleRemove(i)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Seu nome completo" />
              </div>
              <div>
                <Label>Telefone *</Label>
                <MaskedInput value={customerPhone} onValueChange={setCustomerPhone} mask="phone" placeholder="(99) 99999-9999" />
              </div>
              <Separator />
              <div>
                <Label>CEP *</Label>
                <MaskedInput
                  value={cep}
                  onValueChange={handleCepChange}
                  mask="cep"
                  placeholder="00000-000"
                />
              </div>
              {loadingCep && <p className="text-xs text-muted-foreground">Buscando endereço...</p>}
              {addressText && (
                <>
                  <div>
                    <Label>Endereço</Label>
                    <Input value={addressText} readOnly className="bg-muted" />
                  </div>
                  <div>
                    <Label>Número / Complemento</Label>
                    <Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="123, Apto 4" />
                  </div>
                </>
              )}
              <Separator />
              <div>
                <Label>Forma de pagamento</Label>
                <div className="flex gap-2 mt-2">
                  {["pix", "dinheiro", "cartão"].map((m) => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium capitalize transition-colors ${
                        paymentMethod === m
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-foreground"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* ─── Observações ─── */}
              <Separator />
              <div>
                <Label>Observação do pedido</Label>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Ex: Sem açúcar, entregar na portaria, tocar o interfone..."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-1 min-h-[72px] resize-none"
                  maxLength={500}
                />
              </div>

              {/* ─── Cupom ─── */}
              <Separator />
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" /> Cupom de desconto
                </Label>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
                    <div>
                      <span className="text-sm font-semibold text-primary">{appliedCoupon.code}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {appliedCoupon.type === "percentage"
                          ? `${appliedCoupon.value}% off`
                          : `${formatPrice(Number(appliedCoupon.value))} off`}
                      </span>
                    </div>
                    <button onClick={removeCoupon} className="text-muted-foreground hover:text-destructive">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value.toUpperCase());
                        setCouponError("");
                      }}
                      placeholder="Digite o código"
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={validateCoupon}
                      disabled={validatingCoupon || !couponCode.trim()}
                      className="shrink-0"
                    >
                      {validatingCoupon ? "..." : "Aplicar"}
                    </Button>
                  </div>
                )}
                {couponError && <p className="text-xs text-destructive">{couponError}</p>}
              </div>

              <Separator />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-primary">
                    <span>Desconto ({appliedCoupon?.code})</span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entrega</span>
                  {shippingBlocked ? (
                    <span className="text-destructive text-xs font-medium">{shippingLabel}</span>
                  ) : shippingLabel ? (
                    <span className={shippingFee === 0 ? "text-green-500 font-semibold" : ""}>
                      {shippingFee === 0 ? "GRÁTIS" : formatPrice(shippingFee)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">Calcular via CEP</span>
                  )}
                </div>
                {shippingLabel && !shippingBlocked && (
                  <p className={`text-xs ${shippingFee === 0 ? "text-green-500" : "text-muted-foreground"}`}>
                    {shippingLabel}
                  </p>
                )}
                <Separator />
                <div className="flex justify-between font-semibold text-base pt-1">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border">
          {step === "cart" ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm font-semibold">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <Button onClick={() => setStep("checkout")} className="w-full h-12 text-base font-semibold">
                Continuar
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!customerName || !customerPhone || !addressText || submitting || shippingBlocked}
              className="w-full h-12 text-base font-semibold"
            >
              {submitting ? "Finalizando..." : `Finalizar pedido ${formatPrice(total)}`}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
