import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, Clock, ChefHat, Truck, CheckCircle2, Package } from "lucide-react";
import OrderSuccessInstallCard from "@/components/pwa/OrderSuccessInstallCard";
import PushConsentModal, { shouldShowPushConsent } from "@/components/pwa/PushConsentModal";
import { setDynamicManifest, removeDynamicManifest } from "@/lib/dynamicManifest";

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: "Pendente", icon: Clock, color: "bg-warning text-warning-foreground" },
  preparing: { label: "Preparando", icon: ChefHat, color: "bg-primary text-primary-foreground" },
  shipping: { label: "A caminho", icon: Truck, color: "bg-primary text-primary-foreground" },
  completed: { label: "Entregue", icon: CheckCircle2, color: "bg-success text-success-foreground" },
};

const OrderTrackingPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [establishment, setEstablishment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pushModalOpen, setPushModalOpen] = useState(false);

  // Redirect standalone PWA from stale order URL to menu
  useEffect(() => {
    if (!establishment?.slug) return;
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
    const isColdStart = !sessionStorage.getItem("pwa_navigated");
    if (isStandalone && isColdStart) {
      sessionStorage.setItem("pwa_navigated", "true");
      navigate(`/${establishment.slug}`, { replace: true });
    }
  }, [establishment, navigate]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data: o } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
      if (!o) { setLoading(false); return; }
      setOrder(o);

      const [{ data: its }, { data: est }] = await Promise.all([
        supabase.from("order_items").select("*, order_item_options(*)").eq("order_id", id),
        supabase.from("establishments").select("name, whatsapp, logo_url, slug").eq("id", o.establishment_id).maybeSingle(),
      ]);
      setItems(its || []);
      setEstablishment(est);
      setLoading(false);

      // Set dynamic manifest for PWA branding
      if (est) {
        setDynamicManifest({ name: est.name, logo_url: est.logo_url, slug: est.slug });
      }

      // Show push consent modal after order loads
      if (shouldShowPushConsent()) {
        setTimeout(() => setPushModalOpen(true), 2000);
      }
    };
    load();

    // Realtime
    const channel = supabase
      .channel(`order-${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` }, (payload) => {
        setOrder((prev: any) => ({ ...prev, ...payload.new }));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); removeDynamicManifest(); };
  }, [id]);

  const formatPrice = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const sendWhatsApp = () => {
    if (!establishment?.whatsapp || !order) return;
    const phone = establishment.whatsapp.replace(/\D/g, "");
    const itemsText = items
      .map((i) => `${i.quantity}x ${i.product_name} - ${formatPrice(i.unit_price * i.quantity)}`)
      .join("\n");
    const msg = `🛒 *Pedido #${order.id.slice(0, 6)}*\n\n${itemsText}\n\n📍 ${order.address_text}\n💰 Total: ${formatPrice(order.total_price)}\n💳 ${order.payment_method}`;
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3 px-4">
        <Package className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground text-center">Pedido não encontrado.</p>
      </div>
    );
  }

  const status = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = status.icon;
  const statusKeys = Object.keys(statusConfig);
  const currentIdx = statusKeys.indexOf(order.status);

  return (
    <div className="min-h-screen bg-background">
      {/* Store header */}
      {establishment && (
        <div className="bg-card border-b px-4 py-3 flex items-center gap-3">
          {establishment.logo_url ? (
            <img src={establishment.logo_url} alt={establishment.name} className="w-9 h-9 rounded-lg object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">{establishment.name.charAt(0)}</span>
            </div>
          )}
          <span className="font-semibold text-foreground text-sm truncate">{establishment.name}</span>
        </div>
      )}

      <div className="px-4 py-5 max-w-lg mx-auto space-y-4">
        {/* Status card */}
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 pb-4 flex flex-col items-center text-center gap-2">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${status.color}`}>
              <StatusIcon className="h-7 w-7" />
            </div>
            <h1 className="text-lg font-bold text-foreground">{status.label}</h1>
            <p className="text-xs text-muted-foreground">
              Pedido #{order.id.slice(0, 6).toUpperCase()}
            </p>
          </CardContent>
        </Card>

        {/* Progress bar */}
        <Card className="border-0 shadow-sm">
          <CardContent className="py-4">
            <div className="flex items-center justify-between relative">
              {/* Connecting line */}
              <div className="absolute top-4 left-[16%] right-[16%] h-0.5 bg-muted" />
              <div
                className="absolute top-4 left-[16%] h-0.5 bg-primary transition-all duration-500"
                style={{ width: `${Math.max(0, (currentIdx / (statusKeys.length - 1)) * 68)}%` }}
              />
              {statusKeys.map((key, i) => {
                const cfg = statusConfig[key];
                const done = i <= currentIdx;
                const Icon = cfg.icon;
                return (
                  <div key={key} className="flex flex-col items-center gap-1.5 z-10 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className={`text-[10px] leading-tight text-center ${done ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Itens do pedido</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {items.map((item) => (
              <div key={item.id}>
                <div className="flex justify-between items-start">
                  <span className="text-sm text-foreground">{item.quantity}x {item.product_name}</span>
                  <span className="text-sm font-medium text-foreground ml-2 shrink-0">{formatPrice(item.unit_price * item.quantity)}</span>
                </div>
                {item.order_item_options?.length > 0 && (
                  <p className="text-xs text-muted-foreground pl-4 mt-0.5">
                    {item.order_item_options.map((o: any) => o.option_name).join(", ")}
                  </p>
                )}
              </div>
            ))}
            <Separator className="my-2" />
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(order.subtotal || 0)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Entrega</span><span>{formatPrice(order.shipping_fee || 0)}</span></div>
              {(order.discount || 0) > 0 && (
                <div className="flex justify-between text-success"><span>Desconto</span><span>-{formatPrice(order.discount)}</span></div>
              )}
              <Separator className="my-1" />
              <div className="flex justify-between font-semibold"><span>Total</span><span>{formatPrice(order.total_price || 0)}</span></div>
            </div>
          </CardContent>
        </Card>

        {/* PWA Install */}
        {establishment && (
          <OrderSuccessInstallCard storeName={establishment.name} logoUrl={establishment.logo_url} />
        )}

        {/* WhatsApp */}
        {establishment?.whatsapp && (
          <Button onClick={sendWhatsApp} className="w-full h-11 text-sm font-semibold gap-2 bg-[hsl(142,71%,45%)] hover:bg-[hsl(142,71%,40%)] text-[hsl(0,0%,100%)]">
            <MessageCircle className="h-4 w-4" />
            Enviar pedido via WhatsApp
          </Button>
        )}
      </div>

      {/* Push Consent Modal */}
      {order.customer_phone && establishment && (
        <PushConsentModal
          open={pushModalOpen}
          onOpenChange={setPushModalOpen}
          phone={order.customer_phone}
          establishmentId={order.establishment_id}
          storeName={establishment.name}
          logoUrl={establishment.logo_url}
        />
      )}
    </div>
  );
};

export default OrderTrackingPage;
