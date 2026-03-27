import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, ChefHat, Truck, CheckCircle } from "lucide-react";

const statusConfig = {
  pending: { label: "Pendente", icon: Clock, color: "bg-warning/10 text-warning" },
  preparing: { label: "Preparando", icon: ChefHat, color: "bg-primary/10 text-primary" },
  shipping: { label: "Entrega", icon: Truck, color: "bg-blue-100 text-blue-700" },
  completed: { label: "Concluído", icon: CheckCircle, color: "bg-success/10 text-success" },
};

const OrdersPage = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [establishment, setEstablishment] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    const fetchOrders = async () => {
      const { data: est } = await supabase.from("establishments").select("*").eq("owner_id", user.id).maybeSingle();
      setEstablishment(est);
      if (est) {
        const { data } = await supabase.from("orders").select("*").eq("establishment_id", est.id).order("created_at", { ascending: false });
        setOrders(data || []);
      }
    };
    fetchOrders();
  }, [user]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  };

  const nextStatus: Record<string, string> = { pending: "preparing", preparing: "shipping", shipping: "completed" };

  const renderOrders = (status: string) => {
    const filtered = orders.filter(o => o.status === status);
    if (filtered.length === 0) return <p className="text-muted-foreground text-center py-8">Nenhum pedido {statusConfig[status as keyof typeof statusConfig]?.label.toLowerCase()}.</p>;
    return (
      <div className="space-y-3">
        {filtered.map(order => {
          const config = statusConfig[order.status as keyof typeof statusConfig];
          return (
            <Card key={order.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">#{order.id.slice(0, 8)}</span>
                    <Badge variant="secondary" className={config?.color}>{config?.label}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{order.customer_name} • {order.customer_phone}</p>
                  <p className="text-sm font-medium text-foreground">R$ {Number(order.total_price).toFixed(2)}</p>
                </div>
                {nextStatus[order.status] && (
                  <Button size="sm" onClick={() => updateStatus(order.id, nextStatus[order.status])}>
                    Avançar
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

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
