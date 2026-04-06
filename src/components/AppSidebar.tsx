import { getPublicStoreUrl } from "@/lib/publicStoreUrl";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";
import { useEstablishment } from "@/components/EstablishmentProvider";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { LayoutDashboard, ShoppingBag, Package, Truck, Ticket, Settings, LogOut, Utensils, ExternalLink, CreditCard, Users, ScrollText, Headphones, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const ownerOnlyPaths = ["/dashboard/drivers", "/dashboard/logistics"];
const paidOnlyPaths = ["/dashboard/orders", "/dashboard/products", "/dashboard/logistics", "/dashboard/coupons"];
const adminOnlyPaths = ["/dashboard/admin-support"];

const menuItems = [
  { title: "Painel", url: "/dashboard", icon: LayoutDashboard },
  { title: "Pedidos", url: "/dashboard/orders", icon: ShoppingBag },
  { title: "Produtos", url: "/dashboard/products", icon: Package },
  { title: "Logística", url: "/dashboard/logistics", icon: Truck },
  { title: "Motoristas", url: "/dashboard/drivers", icon: Users },
  { title: "Cupons", url: "/dashboard/coupons", icon: Ticket },
  { title: "Suporte", url: "/dashboard/support", icon: Headphones },
  { title: "Assinatura", url: "/dashboard/subscription", icon: CreditCard },
  { title: "Termos", url: "/dashboard/terms", icon: ScrollText },
  { title: "Configurações", url: "/dashboard/settings", icon: Settings },
  { title: "Admin Suporte", url: "/dashboard/admin-support", icon: ShieldCheck },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut, user } = useAuth();
  const { establishment } = useEstablishment();
  const [isOwner, setIsOwner] = useState(false);
  const [roleLoaded, setRoleLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsOwner(false);
      setRoleLoaded(false);
      return;
    }
    // Fetch role immediately and cache result
    supabase.rpc("has_role", { _user_id: user.id, _role: "owner" }).then(({ data }) => {
      setIsOwner(!!data);
      setRoleLoaded(true);
    });
  }, [user]);

  const isFree = establishment?.plan_name === "free";
  const isAdmin = user?.email === "chrileart@gmail.com";

  // Show all items while loading role to avoid flash, filter once loaded
  const visibleItems = (!roleLoaded
    ? menuItems.filter((item) => !ownerOnlyPaths.includes(item.url))
    : menuItems.filter((item) => !ownerOnlyPaths.includes(item.url) || isOwner)
  )
    .filter((item) => !isFree || !paidOnlyPaths.includes(item.url))
    .filter((item) => !adminOnlyPaths.includes(item.url) || isAdmin);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 flex items-center gap-2">
          <Utensils className="w-6 h-6 text-primary shrink-0" />
          {!collapsed && <span className="text-lg font-bold text-foreground">EPRATO</span>}
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === "/dashboard"} className="hover:bg-accent/50" activeClassName="bg-accent text-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className={cn("space-y-1", collapsed ? "p-1" : "p-3")}>
        {establishment?.slug && (
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "w-full gap-2 text-primary border-primary/30 hover:bg-primary/10",
              collapsed ? "justify-center p-0 h-8 w-8 mx-auto border-0" : "justify-start"
            )}
            onClick={() => window.open(getPublicStoreUrl(establishment.slug), "_blank")}
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Ver Minha Loja</span>}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full gap-2 text-muted-foreground hover:text-foreground",
            collapsed ? "justify-center p-0 h-8 w-8 mx-auto" : "justify-start"
          )}
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
