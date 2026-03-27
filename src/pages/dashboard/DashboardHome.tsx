import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useEstablishment } from "@/components/EstablishmentProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingBag, Package, DollarSign, Store } from "lucide-react";

const DashboardHome = () => {
  const { user } = useAuth();
  const { establishment, refresh } = useEstablishment();
  const [stats, setStats] = useState({ orders: 0, products: 0, revenue: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!establishment) return;
    const fetchStats = async () => {
      setLoadingStats(true);
      const [{ count: ordersCount }, categoriesRes] = await Promise.all([
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("establishment_id", establishment.id),
        supabase.from("categories").select("id").eq("establishment_id", establishment.id),
      ]);

      const catIds = categoriesRes.data?.map(c => c.id) || [];
      const [productsRes, revenueRes] = await Promise.all([
        catIds.length > 0
          ? supabase.from("products").select("id").in("category_id", catIds)
          : Promise.resolve({ data: [] }),
        supabase.from("orders").select("total_price").eq("establishment_id", establishment.id).eq("status", "completed"),
      ]);

      const revenue = revenueRes.data?.reduce((sum, o) => sum + Number(o.total_price || 0), 0) || 0;
      setStats({ orders: ordersCount || 0, products: productsRes.data?.length || 0, revenue });
      setLoadingStats(false);
    };
    fetchStats();
  }, [establishment]);

  const toggleStore = async () => {
    if (!establishment) return;
    const { error } = await supabase
      .from("establishments")
      .update({ is_open: !establishment.is_open })
      .eq("id", establishment.id);
    if (!error) await refresh();
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
            Olá, {establishment?.name || ""}! 👋
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

      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DashboardHome;
