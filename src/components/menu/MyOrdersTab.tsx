import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCustomer } from "@/lib/customer";
import { addToCart, clearCart, type CartItem } from "@/lib/cart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Clock, ChefHat, Truck, CheckCircle2, RotateCcw, Eye, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  slug: string;
  establishmentId: string;
  onCartChange: () => void;
}

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: "Pendente", icon: Clock, color: "bg-warning text-warning-foreground" },
  preparing: { label: "Preparando", icon: ChefHat, color: "bg-primary text-primary-foreground" },
  shipping: { label: "Saiu para entrega", icon: Truck, color: "bg-primary text-primary-foreground" },
  completed: { label: "Entregue", icon: CheckCircle2, color: "bg-green-500 text-white" },
};

const MyOrdersTab = ({ slug, establishmentId, onCartChange }: Props) => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [establishment, setEstablishment] = useState<any>(null);
  const customer = getCustomer();

  useEffect(() => {
    if (!customer?.phone) {
      setLoading(false);
      return;
    }

    const phone = customer.phone.replace(/\D/g, "");
    const load = async () => {
      const [{ data }, { data: est }] = await Promise.all([
        supabase
          .from("orders")
          .select("*")
          .eq("establishment_id", establishmentId)
          .eq("customer_phone", phone)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("establishments")
          .select("name, whatsapp, logo_url")
          .eq("id", establishmentId)
          .maybeSingle(),
      ]);

      const fetched = data || [];
      setOrders(fetched);
      setEstablishment(est);

      if (fetched.length > 0) {
        const { data: items } = await supabase
          .from("order_items")
          .select("*, order_item_options(*)")
          .in("order_id", fetched.map((o: any) => o.id));

        const grouped: Record<string, any[]> = {};
        (items || []).forEach((item: any) => {
          if (!grouped[item.order_id]) grouped[item.order_id] = [];
          grouped[item.order_id].push(item);
        });
        setOrderItems(grouped);
      }
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("my-orders")
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "orders",
        filter: `establishment_id=eq.${establishmentId}`,
      }, (payload) => {
        setOrders((prev) =>
          prev.map((o) => (o.id === payload.new.id ? { ...o, ...payload.new } : o))
        );
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [customer?.phone, establishmentId]);

  const formatPrice = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleReorder = (orderId: string) => {
    const items = orderItems[orderId];
    if (!items || items.length === 0) return;

    clearCart();
    items.forEach((item: any) => {
      const cartItem: CartItem = {
        productId: item.product_id || "",
        productName: item.product_name,
        productImage: null,
        basePrice: Number(item.unit_price),
        quantity: item.quantity,
        options: (item.order_item_options || []).map((o: any) => ({
          name: o.option_name,
          price: Number(o.option_price || 0),
          quantity: 1,
        })),
        notes: item.notes || undefined,
      };
      addToCart(slug, cartItem);
    });

    onCartChange();
    toast({ title: "Itens adicionados à sacola!" });
  };

  const sendWhatsApp = (order: any) => {
    if (!establishment?.whatsapp || !order) return;
    const phone = establishment.whatsapp.replace(/\D/g, "");
    const items = orderItems[order.id] || [];
    const itemsText = items
      .map((i: any) => `${i.quantity}x ${i.product_name} - ${formatPrice(i.unit_price * i.quantity)}`)
      .join("\n");
    const msg = `🛒 *Pedido #${order.id.slice(0, 6)}*\n\n${itemsText}\n\n📍 ${order.address_text}\n💰 Total: ${formatPrice(order.total_price)}\n💳 ${order.payment_method}`;
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const trackingOrder = trackingOrderId ? orders.find((o) => o.id === trackingOrderId) : null;
  const trackingItems = trackingOrderId ? (orderItems[trackingOrderId] || []) : [];
  const trackingStatus = trackingOrder ? (statusConfig[trackingOrder.status] || statusConfig.pending) : null;

  if (!customer?.phone) {
    return (
      <div className="px-4 md:px-8 py-8 text-center">
        <p className="text-muted-foreground text-sm">
          Faça seu primeiro pedido para ver seu histórico aqui.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="px-4 md:px-8 py-8 text-center">
        <p className="text-muted-foreground text-sm">Nenhum pedido encontrado.</p>
      </div>
    );
  }

  const activeOrders = orders.filter((o) => ["pending", "preparing", "shipping"].includes(o.status));
  const pastOrders = orders.filter((o) => !["pending", "preparing", "shipping"].includes(o.status));

  return (
    <div className="px-4 md:px-8 py-4 space-y-6">
      {/* Active orders */}
      {activeOrders.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-2">
            {activeOrders.length === 1 ? "Pedido em andamento" : "Pedidos em andamento"}
          </h2>
          <div className="space-y-3">
            {activeOrders.map((activeOrder) => {
              const st = statusConfig[activeOrder.status] || statusConfig.pending;
              const Icon = st.icon;
              return (
                <Card key={activeOrder.id} className="border-primary/30">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${st.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">{st.label}</p>
                          <p className="text-xs text-muted-foreground">
                            #{activeOrder.id.slice(0, 6).toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setTrackingOrderId(activeOrder.id)}
                        className="gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" /> Acompanhar
                      </Button>
                    </div>

                    <div className="flex gap-1">
                      {Object.keys(statusConfig).map((key, i) => {
                        const currentIdx = Object.keys(statusConfig).indexOf(activeOrder.status);
                        return (
                          <div
                            key={key}
                            className={`h-1.5 flex-1 rounded-full ${i <= currentIdx ? "bg-primary" : "bg-muted"}`}
                          />
                        );
                      })}
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {(orderItems[activeOrder.id] || []).length} item(s)
                      </span>
                      <span className="font-semibold">{formatPrice(Number(activeOrder.total_price || 0))}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Past orders */}
      {pastOrders.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-foreground mb-2">Últimos pedidos</h2>
          <div className="space-y-3">
            {pastOrders.map((order) => {
              const items = orderItems[order.id] || [];
              return (
                <Card key={order.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs text-muted-foreground">
                            #{order.id.slice(0, 6).toUpperCase()}
                          </p>
                          <Badge variant="secondary" className="text-[10px]">
                            {new Date(order.created_at).toLocaleDateString("pt-BR")}
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground truncate">
                          {items.map((i: any) => `${i.quantity}x ${i.product_name}`).join(", ") || "—"}
                        </p>
                        <p className="text-sm font-semibold text-primary mt-1">
                          {formatPrice(Number(order.total_price || 0))}
                        </p>
                      </div>
                      <div className="flex gap-1.5 shrink-0 ml-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setTrackingOrderId(order.id)}
                          className="gap-1 px-2"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReorder(order.id)}
                          className="gap-1"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Pedir novamente
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Tracking Modal */}
      <Dialog open={!!trackingOrderId} onOpenChange={(open) => !open && setTrackingOrderId(null)}>
        <DialogContent className="max-w-lg p-0 gap-0 max-h-[90vh] overflow-y-auto">
          {trackingOrder && trackingStatus && (() => {
            const StatusIcon = trackingStatus.icon;
            return (
              <div className="space-y-4 p-6">
                {/* Status header */}
                <div className="flex flex-col items-center text-center gap-3">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${trackingStatus.color}`}>
                    <StatusIcon className="h-8 w-8" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{trackingStatus.label}</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Pedido #{trackingOrder.id.slice(0, 6).toUpperCase()}
                    </p>
                  </div>
                </div>

                {/* Progress steps */}
                <div className="flex justify-between px-2">
                  {Object.entries(statusConfig).map(([key, cfg], i) => {
                    const keys = Object.keys(statusConfig);
                    const currentIdx = keys.indexOf(trackingOrder.status);
                    const done = i <= currentIdx;
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

                <Separator />

                {/* Items */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Itens do pedido</h3>
                  {trackingItems.map((item: any) => (
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
                      {item.notes && (
                        <p className="text-xs italic text-muted-foreground pl-4">📝 {item.notes}</p>
                      )}
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Financial summary */}
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(trackingOrder.subtotal || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Entrega</span>
                    <span>{formatPrice(trackingOrder.shipping_fee || 0)}</span>
                  </div>
                  {Number(trackingOrder.discount) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Desconto</span>
                      <span className="text-green-600">-{formatPrice(trackingOrder.discount)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold text-base">
                    <span>Total</span>
                    <span>{formatPrice(trackingOrder.total_price || 0)}</span>
                  </div>
                </div>

                {/* WhatsApp */}
                {establishment?.whatsapp && (
                  <Button
                    onClick={() => sendWhatsApp(trackingOrder)}
                    className="w-full h-12 text-base font-semibold gap-2 bg-[hsl(142,71%,45%)] hover:bg-[hsl(142,71%,40%)] text-white"
                  >
                    <MessageCircle className="h-5 w-5" />
                    Enviar pedido via WhatsApp
                  </Button>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyOrdersTab;
