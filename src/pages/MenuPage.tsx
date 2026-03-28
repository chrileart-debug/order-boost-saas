import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingBag, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ProductModal from "@/components/menu/ProductModal";
import CartDrawer from "@/components/menu/CartDrawer";
import MyOrdersTab from "@/components/menu/MyOrdersTab";
import { getCart } from "@/lib/cart";
import { getCustomer } from "@/lib/customer";

const MenuPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [establishment, setEstablishment] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"menu" | "orders">("menu");
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const navRef = useRef<HTMLDivElement>(null);

  const refreshCartCount = useCallback(() => {
    const cart = getCart();
    setCartCount(cart && cart.establishmentSlug === slug ? cart.items.length : 0);
  }, [slug]);

  useEffect(() => {
    refreshCartCount();
  }, [refreshCartCount]);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      setLoading(true);
      const { data: est } = await supabase
        .from("establishments")
        .select("*")
        .eq("slug", slug)
        .eq("onboarding_completed", true)
        .maybeSingle();

      if (!est) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setEstablishment(est);

      const { data: cats } = await supabase
        .from("categories")
        .select("*")
        .eq("establishment_id", est.id)
        .order("order_index");

      setCategories(cats || []);
      if (cats && cats.length > 0) setActiveCategory(cats[0].id);

      const { data: prods } = await supabase
        .from("products")
        .select("*")
        .in("category_id", (cats || []).map((c: any) => c.id))
        .eq("is_available", true)
        .order("order_index");

      setProducts(prods || []);
      setLoading(false);
    };
    load();
  }, [slug]);

  const scrollToCategory = (catId: string) => {
    setActiveCategory(catId);
    categoryRefs.current[catId]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const formatPrice = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Loja não encontrada</h1>
          <p className="text-muted-foreground">Verifique o link e tente novamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pb-24">
      {/* Cover */}
      <div className="relative h-44 md:h-56 bg-muted">
        {establishment.cover_url && (
          <img src={establishment.cover_url} alt="Capa" className="w-full h-full object-cover" />
        )}
        <div className="absolute -bottom-10 left-4 md:left-8">
          <div className="w-20 h-20 rounded-full border-4 border-background bg-background overflow-hidden shadow-lg">
            {establishment.logo_url ? (
              <img src={establishment.logo_url} alt={establishment.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary text-primary-foreground font-bold text-2xl">
                {establishment.name?.[0]}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Store info */}
      <div className="pt-14 px-4 md:px-8 pb-4">
        <h1 className="text-xl font-bold text-foreground">{establishment.name}</h1>
        <div className="flex items-center gap-2 mt-1">
          {establishment.niche && (
            <span className="text-sm text-muted-foreground">{establishment.niche}</span>
          )}
          <Badge variant={establishment.is_open ? "default" : "secondary"} className="text-xs">
            {establishment.is_open ? "Aberto" : "Fechado"}
          </Badge>
        </div>
      </div>

      {/* Sticky category nav */}
      <div
        ref={navRef}
        className="sticky top-0 z-20 bg-background border-b border-border px-4 md:px-8 overflow-x-auto flex gap-1 scrollbar-hide"
      >
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => scrollToCategory(cat.id)}
            className={`whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeCategory === cat.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Products by category */}
      <div className="px-4 md:px-8 mt-4 space-y-8">
        {categories.map((cat) => {
          const catProducts = products.filter((p) => p.category_id === cat.id);
          if (catProducts.length === 0) return null;
          return (
            <div
              key={cat.id}
              ref={(el) => { categoryRefs.current[cat.id] = el; }}
              className="scroll-mt-14"
            >
              <h2 className="text-lg font-semibold text-foreground mb-3">{cat.name}</h2>
              <div className="space-y-3">
                {catProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => setSelectedProduct(product)}
                    className="w-full flex items-center gap-4 p-3 rounded-lg bg-card border border-border hover:shadow-md transition-shadow text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground truncate">{product.name}</h3>
                      {product.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                          {product.description}
                        </p>
                      )}
                      <p className="text-sm font-semibold text-primary mt-1">
                        {formatPrice(product.price)}
                      </p>
                    </div>
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-20 h-20 rounded-lg object-cover shrink-0"
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cart FAB */}
      {cartCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:w-96 z-30">
          <Button
            onClick={() => setCartOpen(true)}
            className="w-full h-14 text-base font-semibold shadow-lg gap-2"
          >
            <ShoppingBag className="h-5 w-5" />
            Ver sacola ({cartCount} {cartCount === 1 ? "item" : "itens"})
          </Button>
        </div>
      )}

      {/* Product Modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          slug={slug!}
          onClose={() => setSelectedProduct(null)}
          onAdd={() => {
            refreshCartCount();
            setSelectedProduct(null);
          }}
        />
      )}

      {/* Cart Drawer */}
      <CartDrawer
        open={cartOpen}
        onOpenChange={setCartOpen}
        slug={slug!}
        establishment={establishment}
        onCartChange={refreshCartCount}
      />
    </div>
  );
};

export default MenuPage;
