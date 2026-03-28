import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getCustomer } from "@/lib/customer";
import { addToCart, clearCart, type CartItem } from "@/lib/cart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, ChefHat, Truck, CheckCircle2, RotateCcw, Eye } from "lucide-react";
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
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const customer = getCustomer();

  useEffect(() => {
    if (!customer?.phone) {
      setLoading(false);
      return;
    }

    const phone = customer.phone.replace(/\D/g, "");
    const load = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("establishment_id", establishmentId)
        .eq("customer_phone", phone)
        .order("created_at", { ascending: false })
        .limit(6);

      const fetched = data || [];
      setOrders(fetched);

      // Load items for all orders
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

    // Realtime for active orders
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

    // Clear current cart for this slug
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

  const activeOrder = orders.find((o) => ["pending", "preparing", "shipping"].includes(o.status));
  const pastOrders = orders.filter((o) => o.status === "completed").slice(0, 5);

  return (
    <div className="px-4 md:px-8 py-4 space-y-6">
      {/* Active order */}
      {activeOrder && (() => {
        const st = statusConfig[activeOrder.status] || statusConfig.pending;
        const Icon = st.icon;
        return (
          <div>
            <h2 className="text-base font-semibold text-foreground mb-2">Pedido em andamento</h2>
            <Card className="border-primary/30">
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
                    onClick={() => navigate(`/pedido/${activeOrder.id}`)}
                    className="gap-1"
                  >
                    <Eye className="h-3.5 w-3.5" /> Acompanhar
                  </Button>
                </div>

                {/* Progress bar */}
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
          </div>
        );
      })()}

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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReorder(order.id)}
                        className="gap-1 shrink-0 ml-2"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Pedir novamente
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyOrdersTab;
