import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Package, DollarSign, Store } from "lucide-react";

const DashboardHome = () => {
  const { user } = useAuth();
  const [establishment, setEstablishment] = useState<any>(null);
  const [stats, setStats] = useState({ orders: 0, products: 0, revenue: 0 });

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: est } = await supabase
        .from("establishments")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();
      setEstablishment(est);

      if (est) {
        const { count: ordersCount } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("establishment_id", est.id);

        const { data: products } = await supabase
          .from("products")
          .select("id, category_id")
          .in("category_id", (
            await supabase.from("categories").select("id").eq("establishment_id", est.id)
          ).data?.map(c => c.id) || []);

        const { data: orders } = await supabase
          .from("orders")
          .select("total_price")
          .eq("establishment_id", est.id)
          .eq("status", "completed");

        const revenue = orders?.reduce((sum, o) => sum + Number(o.total_price || 0), 0) || 0;

        setStats({
          orders: ordersCount || 0,
          products: products?.length || 0,
          revenue,
        });
      }
    };
    fetchData();
  }, [user]);

  const toggleStore = async () => {
    if (!establishment) return;
    const { error } = await supabase
      .from("establishments")
      .update({ is_open: !establishment.is_open })
      .eq("id", establishment.id);
    if (!error) setEstablishment({ ...establishment, is_open: !establishment.is_open });
  };

  const statCards = [
    { title: "Pedidos", value: stats.orders, icon: ShoppingBag, color: "text-primary" },
    { title: "Produtos", value: stats.products, icon: Package, color: "text-success" },
    { title: "Receita", value: `R$ ${stats.revenue.toFixed(2)}`, icon: DollarSign, color: "text-warning" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Olá{establishment ? `, ${establishment.name}` : ""}! 👋
          </h1>
          <p className="text-muted-foreground">Visão geral do seu negócio</p>
        </div>
        {establishment && (
          <Button variant={establishment.is_open ? "destructive" : "hero"} onClick={toggleStore} className="gap-2">
            <Store className="w-4 h-4" />
            {establishment.is_open ? "Fechar Loja" : "Abrir Loja"}
          </Button>
        )}
      </div>

      {!establishment && (
        <Card className="border-dashed border-2 border-primary/30">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Store className="w-12 h-12 text-primary/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Configure seu estabelecimento</h3>
            <p className="text-muted-foreground text-center mb-4">Complete o cadastro para começar a receber pedidos.</p>
            <Button variant="hero" asChild>
              <a href="/dashboard/settings">Configurar agora</a>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DashboardHome;
