import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, Trash2, ArrowLeft } from "lucide-react";
import { getCart, saveCart, removeFromCart, updateCartItemQuantity, getCartTotal, clearCart, type Cart } from "@/lib/cart";
import { haversineDistance, calculateShipping } from "@/lib/haversine";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import MaskedInput from "@/components/MaskedInput";
import { unmaskPhone } from "@/lib/masks";

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
  const [loadingCep, setLoadingCep] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("pix");

  useEffect(() => {
    if (open) {
      const c = getCart();
      setCart(c && c.establishmentSlug === slug ? c : null);
      setStep("cart");
    }
  }, [open, slug]);

  const refreshCart = () => {
    const c = getCart();
    setCart(c && c.establishmentSlug === slug ? c : null);
    onCartChange();
  };

  const handleRemove = (i: number) => {
    removeFromCart(i);
    refreshCart();
  };

  const handleQty = (i: number, q: number) => {
    updateCartItemQuantity(i, q);
    refreshCart();
  };

  const lookupCep = async (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddressText(`${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`);
        // Geocode via nominatim
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            `${data.logradouro}, ${data.bairro}, ${data.localidade}, ${data.uf}, Brasil`
          )}&limit=1`
        );
        const geo = await geoRes.json();
        if (geo.length > 0) {
          setCustomerLat(parseFloat(geo[0].lat));
          setCustomerLng(parseFloat(geo[0].lon));
          if (establishment.lat && establishment.lng) {
            const dist = haversineDistance(
              establishment.lat, establishment.lng,
              parseFloat(geo[0].lat), parseFloat(geo[0].lon)
            );
            const fee = calculateShipping(
              dist,
              establishment.base_fee || 0,
              establishment.km_included || 0,
              establishment.km_extra_price || 0
            );
            setShippingFee(Math.round(fee * 100) / 100);
          }
        }
      }
    } catch {
      // ignore
    }
    setLoadingCep(false);
  };

  const formatPrice = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const subtotal = cart ? getCartTotal(cart.items) : 0;
  const total = subtotal + shippingFee;

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
          discount: 0,
          total_price: total,
          payment_method: paymentMethod,
          status: "pending",
        })
        .select("id")
        .single();

      if (orderError) throw orderError;

      for (const item of cart.items) {
        const { data: oi, error: oiError } = await supabase
          .from("order_items")
          .insert({
            order_id: order.id,
            product_id: item.productId,
            product_name: item.productName,
            quantity: item.quantity,
            unit_price: item.basePrice,
          })
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
                        {item.options.map((o) => o.name).join(", ")}
                      </p>
                    )}
                    <p className="text-sm font-semibold text-primary mt-0.5">
                      {formatPrice((item.basePrice + item.options.reduce((s, o) => s + o.price, 0)) * item.quantity)}
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
                  onValueChange={(v) => {
                    setCep(v);
                    if (v.replace(/\D/g, "").length === 8) lookupCep(v);
                  }}
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
              <Separator />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entrega</span>
                  <span>{shippingFee > 0 ? formatPrice(shippingFee) : "Calcular via CEP"}</span>
                </div>
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
              disabled={!customerName || !customerPhone || !addressText || submitting}
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
