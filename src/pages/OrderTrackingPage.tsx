import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, Clock, ChefHat, Truck, CheckCircle2 } from "lucide-react";
import OrderSuccessInstallCard from "@/components/pwa/OrderSuccessInstallCard";
import PushConsentModal, { shouldShowPushConsent } from "@/components/pwa/PushConsentModal";

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: "Pendente", icon: Clock, color: "bg-warning text-warning-foreground" },
  preparing: { label: "Preparando", icon: ChefHat, color: "bg-primary text-primary-foreground" },
  shipping: { label: "Saiu para entrega", icon: Truck, color: "bg-primary text-primary-foreground" },
  completed: { label: "Entregue", icon: CheckCircle2, color: "bg-success text-success-foreground" },
};

const OrderTrackingPage = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [establishment, setEstablishment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pushModalOpen, setPushModalOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data: o } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
      if (!o) { setLoading(false); return; }
      setOrder(o);

      const [{ data: its }, { data: est }] = await Promise.all([
        supabase.from("order_items").select("*, order_item_options(*)").eq("order_id", id),
        supabase.from("establishments").select("name, whatsapp, logo_url").eq("id", o.establishment_id).maybeSingle(),
      ]);
      setItems(its || []);
      setEstablishment(est);
      setLoading(false);
      // Show push consent modal after order loads
      if (shouldShowPushConsent()) {
        setTimeout(() => setPushModalOpen(true), 1500);
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

    return () => { supabase.removeChannel(channel); };
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
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <p className="text-muted-foreground">Pedido não encontrado.</p>
      </div>
    );
  }

  const status = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-surface p-4 md:p-8 flex justify-center">
      <div className="w-full max-w-lg space-y-4">
        {/* Status */}
        <Card>
          <CardContent className="pt-6 flex flex-col items-center text-center gap-3">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${status.color}`}>
              <StatusIcon className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{status.label}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Pedido #{order.id.slice(0, 6).toUpperCase()}
              </p>
            </div>
          </CardContent>
        </Card>

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

        {/* Progress */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              {Object.entries(statusConfig).map(([key, cfg], i) => {
                const keys = Object.keys(statusConfig);
                const currentIdx = keys.indexOf(order.status);
                const thisIdx = i;
                const done = thisIdx <= currentIdx;
                const Icon = cfg.icon;
                return (
                  <div key={key} className="flex flex-col items-center gap-1 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className={`text-[10px] ${done ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Itens do pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item) => (
              <div key={item.id}>
                <div className="flex justify-between">
                  <span className="text-sm">{item.quantity}x {item.product_name}</span>
                  <span className="text-sm font-medium">{formatPrice(item.unit_price * item.quantity)}</span>
                </div>
                {item.order_item_options?.length > 0 && (
                  <p className="text-xs text-muted-foreground pl-4">
                    {item.order_item_options.map((o: any) => o.option_name).join(", ")}
                  </p>
                )}
              </div>
            ))}
            <Separator />
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatPrice(order.subtotal || 0)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Entrega</span><span>{formatPrice(order.shipping_fee || 0)}</span></div>
              <Separator />
              <div className="flex justify-between font-semibold text-base"><span>Total</span><span>{formatPrice(order.total_price || 0)}</span></div>
            </div>
          </CardContent>
        </Card>

        {/* PWA Install */}
        {establishment && (
          <OrderSuccessInstallCard storeName={establishment.name} logoUrl={establishment.logo_url} />
        )}

        {/* WhatsApp */}
        {establishment?.whatsapp && (
          <Button onClick={sendWhatsApp} className="w-full h-12 text-base font-semibold gap-2 bg-[hsl(142,71%,45%)] hover:bg-[hsl(142,71%,40%)] text-[hsl(0,0%,100%)]">
            <MessageCircle className="h-5 w-5" />
            Enviar pedido via WhatsApp
          </Button>
        )}
      </div>
    </div>
  );
};

export default OrderTrackingPage;
