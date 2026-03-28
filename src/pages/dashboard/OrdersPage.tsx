import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, ChefHat, Truck, CheckCircle, Printer, MapPin, CreditCard, Tag } from "lucide-react";

const statusConfig = {
  pending: { label: "Pendente", icon: Clock, color: "bg-warning/10 text-warning" },
  preparing: { label: "Preparando", icon: ChefHat, color: "bg-primary/10 text-primary" },
  shipping: { label: "Entrega", icon: Truck, color: "bg-blue-100 text-blue-700" },
  completed: { label: "Concluído", icon: CheckCircle, color: "bg-success/10 text-success" },
};

const formatPrice = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  order_item_options?: { option_name: string; option_price: number }[];
}

const OrdersPage = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem[]>>({});
  const [establishment, setEstablishment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const fetchOrders = async () => {
      setLoading(true);
      const { data: est } = await supabase.from("establishments").select("*").eq("owner_id", user.id).maybeSingle();
      setEstablishment(est);
      if (est) {
        const { data } = await supabase
          .from("orders")
          .select("*")
          .eq("establishment_id", est.id)
          .order("created_at", { ascending: false });
        const ordersList = data || [];
        setOrders(ordersList);

        // Fetch items for all orders
        if (ordersList.length > 0) {
          const ids = ordersList.map((o: any) => o.id);
          const { data: items } = await supabase
            .from("order_items")
            .select("*, order_item_options(*)")
            .in("order_id", ids);

          const grouped: Record<string, OrderItem[]> = {};
          (items || []).forEach((item: any) => {
            if (!grouped[item.order_id]) grouped[item.order_id] = [];
            grouped[item.order_id].push(item);
          });
          setOrderItems(grouped);
        }
      }
      setLoading(false);
    };
    fetchOrders();
  }, [user]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  };

  const nextStatus: Record<string, string> = { pending: "preparing", preparing: "shipping", shipping: "completed" };

  const handlePrint = useCallback((order: any) => {
    const items = orderItems[order.id] || [];
    const date = new Date(order.created_at);
    const dateStr = date.toLocaleDateString("pt-BR") + " " + date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    const itemsHtml = items.map(item => {
      const opts = (item.order_item_options || []).map(o => o.option_name).join(", ");
      return `
        <div style="margin-bottom:6px;font-size:14px;">
          <span><b>${item.quantity}x</b> ${item.product_name}</span>
          ${opts ? `<div style="padding-left:14px;font-size:12px;color:#555;">+ ${opts}</div>` : ""}
        </div>`;
    }).join("");

    const printWindow = window.open("", "_blank", "width=300,height=600");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Pedido #${order.id.slice(0, 6)}</title>
        <style>
          @page { margin: 2mm; size: 80mm auto; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; font-size: 12px; width: 76mm; padding: 2mm; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .sep { border-top: 1px dashed #000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; }
          .section { margin-bottom: 6px; }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size:16px;margin-bottom:4px;">PEDIDO #${order.id.slice(0, 6).toUpperCase()}</div>
        <div class="center" style="font-size:11px;margin-bottom:2px;">${dateStr}</div>
        <div class="center" style="font-size:11px;">${order.customer_name}${order.customer_phone ? " • " + order.customer_phone : ""}</div>
        <div class="sep"></div>
        <div class="section bold">ITENS:</div>
        ${itemsHtml}
        <div class="sep"></div>
        ${order.address_text ? `<div class="section"><span class="bold">ENTREGA:</span><br/>${order.address_text}</div><div class="sep"></div>` : ""}
        <div class="section"><span class="bold">PAGAMENTO:</span> ${order.payment_method || "—"}</div>
        <div class="sep"></div>
        <div class="row"><span>Subtotal</span><span>${formatPrice(order.subtotal || 0)}</span></div>
        <div class="row"><span>Frete</span><span>${formatPrice(order.shipping_fee || 0)}</span></div>
        ${Number(order.discount) > 0 ? `<div class="row"><span>Desconto${order.coupon_code ? " (" + order.coupon_code + ")" : ""}</span><span>-${formatPrice(order.discount)}</span></div>` : ""}
        <div class="sep"></div>
        <div class="row bold" style="font-size:14px;"><span>TOTAL</span><span>${formatPrice(order.total_price || 0)}</span></div>
        <div class="sep"></div>
        <div class="center" style="margin-top:8px;font-size:10px;">*** Obrigado! ***</div>
        <script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }, [orderItems]);

  const renderOrders = (status: string) => {
    const filtered = orders.filter(o => o.status === status);
    if (filtered.length === 0) {
      return <p className="text-muted-foreground text-center py-8">Nenhum pedido {statusConfig[status as keyof typeof statusConfig]?.label.toLowerCase()}.</p>;
    }
    return (
      <div className="space-y-4">
        {filtered.map(order => {
          const config = statusConfig[order.status as keyof typeof statusConfig];
          const items = orderItems[order.id] || [];
          const date = new Date(order.created_at);
          const dateStr = date.toLocaleDateString("pt-BR") + " " + date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

          return (
            <Card key={order.id} className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground text-lg">#{order.id.slice(0, 6).toUpperCase()}</span>
                      <Badge variant="secondary" className={config?.color}>{config?.label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{order.customer_name}{order.customer_phone ? ` • ${order.customer_phone}` : ""}</p>
                    <p className="text-xs text-muted-foreground">{dateStr}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handlePrint(order)}>
                      <Printer className="h-4 w-4" />
                      <span className="hidden sm:inline">Imprimir</span>
                    </Button>
                    {nextStatus[order.status] && (
                      <Button size="sm" onClick={() => updateStatus(order.id, nextStatus[order.status])}>
                        Avançar
                      </Button>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Items */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Itens</p>
                  {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">Carregando itens...</p>
                  ) : (
                    items.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <div>
                          <span className="text-foreground">{item.quantity}x {item.product_name}</span>
                          {item.order_item_options && item.order_item_options.length > 0 && (
                            <p className="text-xs text-muted-foreground pl-3">
                              + {item.order_item_options.map(o => o.option_name).join(", ")}
                            </p>
                          )}
                        </div>
                        <span className="text-foreground font-medium whitespace-nowrap ml-2">
                          {formatPrice(item.unit_price * item.quantity)}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <Separator />

                {/* Address & Payment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {order.address_text && (
                    <div className="flex gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <span className="text-foreground">{order.address_text}</span>
                    </div>
                  )}
                  {order.payment_method && (
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-foreground">{order.payment_method}</span>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Financial Summary */}
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">{formatPrice(order.subtotal || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frete</span>
                    <span className="text-foreground">{formatPrice(order.shipping_fee || 0)}</span>
                  </div>
                  {Number(order.discount) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        Desconto {order.coupon_code ? `(${order.coupon_code})` : ""}
                      </span>
                      <span className="text-success">-{formatPrice(order.discount)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold text-base">
                    <span className="text-foreground">Total</span>
                    <span className="text-foreground">{formatPrice(order.total_price || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full max-w-lg" />
        {[1, 2].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Pedidos</h1>
      <Tabs defaultValue="pending">
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="pending">Pendentes</TabsTrigger>
          <TabsTrigger value="preparing">Preparando</TabsTrigger>
          <TabsTrigger value="shipping">Entrega</TabsTrigger>
          <TabsTrigger value="completed">Concluídos</TabsTrigger>
        </TabsList>
        {Object.keys(statusConfig).map(s => (
          <TabsContent key={s} value={s}>{renderOrders(s)}</TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default OrdersPage;
