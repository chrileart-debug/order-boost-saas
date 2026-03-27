import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ProductsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [establishment, setEstablishment] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [catDialog, setCatDialog] = useState(false);
  const [prodDialog, setProdDialog] = useState(false);
  const [catName, setCatName] = useState("");
  const [editingCat, setEditingCat] = useState<any>(null);
  const [prodForm, setProdForm] = useState({ name: "", description: "", price: "", category_id: "" });
  const [editingProd, setEditingProd] = useState<any>(null);

  const fetchData = async () => {
    if (!user) return;
    const { data: est } = await supabase.from("establishments").select("*").eq("owner_id", user.id).maybeSingle();
    setEstablishment(est);
    if (est) {
      const { data: cats } = await supabase.from("categories").select("*").eq("establishment_id", est.id).order("order_index");
      setCategories(cats || []);
      if (cats && cats.length > 0) {
        const { data: prods } = await supabase.from("products").select("*").in("category_id", cats.map(c => c.id)).order("order_index");
        setProducts(prods || []);
      }
    }
  };

  useEffect(() => { fetchData(); }, [user]);

  const saveCategory = async () => {
    if (!establishment || !catName.trim()) return;
    if (editingCat) {
      await supabase.from("categories").update({ name: catName }).eq("id", editingCat.id);
    } else {
      await supabase.from("categories").insert({ establishment_id: establishment.id, name: catName, order_index: categories.length });
    }
    setCatDialog(false); setCatName(""); setEditingCat(null);
    fetchData();
    toast({ title: editingCat ? "Categoria atualizada" : "Categoria criada" });
  };

  const deleteCategory = async (id: string) => {
    await supabase.from("categories").delete().eq("id", id);
    fetchData();
    toast({ title: "Categoria removida" });
  };

  const saveProduct = async () => {
    if (!prodForm.name || !prodForm.category_id || !prodForm.price) return;
    const payload = { ...prodForm, price: parseFloat(prodForm.price), order_index: products.length };
    if (editingProd) {
      await supabase.from("products").update(payload).eq("id", editingProd.id);
    } else {
      await supabase.from("products").insert(payload);
    }
    setProdDialog(false); setProdForm({ name: "", description: "", price: "", category_id: "" }); setEditingProd(null);
    fetchData();
    toast({ title: editingProd ? "Produto atualizado" : "Produto criado" });
  };

  const deleteProduct = async (id: string) => {
    await supabase.from("products").delete().eq("id", id);
    fetchData();
    toast({ title: "Produto removido" });
  };

  if (!establishment) {
    return <div className="text-center py-12 text-muted-foreground">Configure seu estabelecimento primeiro nas Configurações.</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Produtos & Categorias</h1>
        <div className="flex gap-2">
          <Dialog open={catDialog} onOpenChange={setCatDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => { setCatName(""); setEditingCat(null); }}>
                <Plus className="w-4 h-4 mr-1" /> Categoria
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingCat ? "Editar" : "Nova"} Categoria</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Ex: Doces" />
                </div>
                <Button onClick={saveCategory} className="w-full">Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={prodDialog} onOpenChange={setProdDialog}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => { setProdForm({ name: "", description: "", price: "", category_id: categories[0]?.id || "" }); setEditingProd(null); }}>
                <Plus className="w-4 h-4 mr-1" /> Produto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingProd ? "Editar" : "Novo"} Produto</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <select className="w-full rounded-lg border border-input px-3 py-2 text-sm bg-background" value={prodForm.category_id} onChange={e => setProdForm({ ...prodForm, category_id: e.target.value })}>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={prodForm.name} onChange={e => setProdForm({ ...prodForm, name: e.target.value })} placeholder="Ex: Cookie de chocolate" />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input value={prodForm.description} onChange={e => setProdForm({ ...prodForm, description: e.target.value })} placeholder="Descrição do produto" />
                </div>
                <div className="space-y-2">
                  <Label>Preço (R$)</Label>
                  <Input type="number" step="0.01" value={prodForm.price} onChange={e => setProdForm({ ...prodForm, price: e.target.value })} placeholder="0.00" />
                </div>
                <Button onClick={saveProduct} className="w-full">Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {categories.map(cat => (
        <div key={cat.id} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">{cat.name}</h2>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => { setCatName(cat.name); setEditingCat(cat); setCatDialog(true); }}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => deleteCategory(cat.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {products.filter(p => p.category_id === cat.id).map(prod => (
              <Card key={prod.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-foreground">{prod.name}</h3>
                      {prod.description && <p className="text-sm text-muted-foreground mt-1">{prod.description}</p>}
                      <p className="text-primary font-semibold mt-2">R$ {Number(prod.price).toFixed(2)}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setProdForm({ name: prod.name, description: prod.description || "", price: String(prod.price), category_id: prod.category_id }); setEditingProd(prod); setProdDialog(true); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteProduct(prod.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductsPage;
