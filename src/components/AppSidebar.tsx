import { getPublicStoreUrl } from "@/lib/publicStoreUrl";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";
import { useEstablishment } from "@/components/EstablishmentProvider";
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
import { LayoutDashboard, ShoppingBag, Package, Truck, Ticket, Settings, LogOut, Utensils, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const menuItems = [
  { title: "Painel", url: "/dashboard", icon: LayoutDashboard },
  { title: "Pedidos", url: "/dashboard/orders", icon: ShoppingBag },
  { title: "Produtos", url: "/dashboard/products", icon: Package },
  { title: "Logística", url: "/dashboard/logistics", icon: Truck },
  { title: "Cupons", url: "/dashboard/coupons", icon: Ticket },
  { title: "Configurações", url: "/dashboard/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();
  const { establishment } = useEstablishment();

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
              {menuItems.map((item) => (
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
