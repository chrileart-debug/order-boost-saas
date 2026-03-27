import { useEffect, useState, useCallback } from "react";
import { useEstablishment } from "@/components/EstablishmentProvider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Pencil, Trash2, ImageIcon, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import ImageCropper from "@/components/ImageCropper";

/* ─── types ─── */
interface Category { id: string; name: string; order_index: number; establishment_id: string }
interface Product { id: string; name: string; description: string | null; price: number; category_id: string; image_url: string | null; is_available: boolean; order_index: number }
interface OptionGroup { id: string; product_id: string; name: string; min_selection: number; max_selection: number }
interface Option { id: string; group_id: string; name: string; price: number }

const ProductsPage = () => {
  const { user } = useAuth();
  const { establishment } = useEstablishment();
  const { toast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  /* category dialog */
  const [catDialog, setCatDialog] = useState(false);
  const [catName, setCatName] = useState("");
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  /* product sheet */
  const [prodSheet, setProdSheet] = useState(false);
  const [editingProd, setEditingProd] = useState<Product | null>(null);
  const [prodForm, setProdForm] = useState({ name: "", description: "", price: "", category_id: "" });
  const [prodImageBlob, setProdImageBlob] = useState<Blob | null>(null);
  const [savingProd, setSavingProd] = useState(false);

  /* option groups */
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMin, setNewGroupMin] = useState("0");
  const [newGroupMax, setNewGroupMax] = useState("1");
  const [newOptionName, setNewOptionName] = useState("");
  const [newOptionPrice, setNewOptionPrice] = useState("0");
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  /* ─── fetch ─── */
  const fetchData = useCallback(async () => {
    if (!establishment) return;
    setLoading(true);
    const { data: cats } = await supabase.from("categories").select("*").eq("establishment_id", establishment.id).order("order_index");
    setCategories(cats || []);
    if (cats && cats.length > 0) {
      const { data: prods } = await supabase.from("products").select("*").in("category_id", cats.map(c => c.id)).order("order_index");
      setProducts(prods || []);
    } else {
      setProducts([]);
    }
    setLoading(false);
  }, [establishment]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ─── ensure default category ─── */
  const ensureDefaultCategory = async (): Promise<string> => {
    const existing = categories.find(c => c.name === "Geral");
    if (existing) return existing.id;
    const { data } = await supabase.from("categories").insert({ establishment_id: establishment!.id, name: "Geral", order_index: categories.length }).select().single();
    if (data) {
      setCategories(prev => [...prev, data as Category]);
      return data.id;
    }
    throw new Error("Falha ao criar categoria padrão");
  };

  /* ─── categories ─── */
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
    const prodsInCat = products.filter(p => p.category_id === id);
    if (prodsInCat.length > 0) {
      toast({ title: "Categoria tem produtos", description: "Remova os produtos antes de excluir.", variant: "destructive" });
      return;
    }
    await supabase.from("categories").delete().eq("id", id);
    fetchData();
    toast({ title: "Categoria removida" });
  };

  /* ─── product sheet open ─── */
  const openNewProduct = async () => {
    let defaultCatId = categories[0]?.id || "";
    if (!defaultCatId) {
      try { defaultCatId = await ensureDefaultCategory(); } catch { return; }
    }
    setProdForm({ name: "", description: "", price: "", category_id: defaultCatId });
    setEditingProd(null);
    setProdImageBlob(null);
    setOptionGroups([]);
    setOptions([]);
    setProdSheet(true);
  };

  const openEditProduct = async (prod: Product) => {
    setProdForm({ name: prod.name, description: prod.description || "", price: String(prod.price), category_id: prod.category_id });
    setEditingProd(prod);
    setProdImageBlob(null);
    setProdSheet(true);
    // fetch option groups and options for this product
    const { data: groups } = await supabase.from("product_option_groups").select("*").eq("product_id", prod.id).order("created_at");
    setOptionGroups(groups || []);
    if (groups && groups.length > 0) {
      const { data: opts } = await supabase.from("product_options").select("*").in("group_id", groups.map(g => g.id)).order("created_at");
      setOptions(opts || []);
    } else {
      setOptions([]);
    }
  };

  /* ─── save product ─── */
  const saveProduct = async () => {
    if (!prodForm.name || !prodForm.price) return;
    setSavingProd(true);
    const categoryId = prodForm.category_id || (await ensureDefaultCategory());
    const payload: any = {
      name: prodForm.name,
      description: prodForm.description || null,
      price: parseFloat(prodForm.price),
      category_id: categoryId,
    };

    try {
      let productId = editingProd?.id;
      if (editingProd) {
        await supabase.from("products").update(payload).eq("id", editingProd.id);
      } else {
        payload.order_index = products.length;
        const { data } = await supabase.from("products").insert(payload).select().single();
        productId = data?.id;
      }

      // upload image if changed
      if (prodImageBlob && productId) {
        const path = `products/${productId}.webp`;
        await supabase.storage.from("establishments").upload(path, prodImageBlob, { upsert: true, contentType: "image/webp" });
        const { data: urlData } = supabase.storage.from("establishments").getPublicUrl(path);
        await supabase.from("products").update({ image_url: `${urlData.publicUrl}?t=${Date.now()}` }).eq("id", productId);
      }

      toast({ title: editingProd ? "Produto atualizado" : "Produto criado" });
      setProdSheet(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSavingProd(false);
    }
  };

  const deleteProduct = async (id: string) => {
    await supabase.from("products").delete().eq("id", id);
    fetchData();
    toast({ title: "Produto removido" });
  };

  const toggleAvailability = async (prod: Product) => {
    const newVal = !prod.is_available;
    await supabase.from("products").update({ is_available: newVal }).eq("id", prod.id);
    setProducts(prev => prev.map(p => p.id === prod.id ? { ...p, is_available: newVal } : p));
  };

  /* ─── option groups ─── */
  const addOptionGroup = async () => {
    if (!editingProd || !newGroupName.trim()) return;
    const { data } = await supabase.from("product_option_groups").insert({
      product_id: editingProd.id,
      name: newGroupName,
      min_selection: parseInt(newGroupMin) || 0,
      max_selection: parseInt(newGroupMax) || 1,
    }).select().single();
    if (data) setOptionGroups(prev => [...prev, data as OptionGroup]);
    setNewGroupName(""); setNewGroupMin("0"); setNewGroupMax("1");
  };

  const deleteOptionGroup = async (id: string) => {
    await supabase.from("product_options").delete().eq("group_id", id);
    await supabase.from("product_option_groups").delete().eq("id", id);
    setOptionGroups(prev => prev.filter(g => g.id !== id));
    setOptions(prev => prev.filter(o => o.group_id !== id));
  };

  const addOption = async (groupId: string) => {
    if (!newOptionName.trim()) return;
    const { data } = await supabase.from("product_options").insert({
      group_id: groupId,
      name: newOptionName,
      price: parseFloat(newOptionPrice) || 0,
    }).select().single();
    if (data) setOptions(prev => [...prev, data as Option]);
    setNewOptionName(""); setNewOptionPrice("0"); setActiveGroupId(null);
  };

  const deleteOption = async (id: string) => {
    await supabase.from("product_options").delete().eq("id", id);
    setOptions(prev => prev.filter(o => o.id !== id));
  };

  /* ─── render ─── */
  if (!establishment) {
    return <div className="text-center py-12 text-muted-foreground">Configure seu estabelecimento primeiro.</div>;
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Produtos & Categorias</h1>
        <div className="flex gap-2">
          <Dialog open={catDialog} onOpenChange={setCatDialog}>
            <Button variant="outline" size="sm" onClick={() => { setCatName(""); setEditingCat(null); setCatDialog(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Categoria
            </Button>
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
          <Button size="sm" onClick={openNewProduct}>
            <Plus className="w-4 h-4 mr-1" /> Produto
          </Button>
        </div>
      </div>

      {categories.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Nenhum produto cadastrado.</p>
          <Button className="mt-4" onClick={openNewProduct}><Plus className="w-4 h-4 mr-1" /> Criar primeiro produto</Button>
        </div>
      )}

      {categories.map(cat => {
        const catProducts = products.filter(p => p.category_id === cat.id);
        return (
          <div key={cat.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">{cat.name}</h2>
                <Badge variant="secondary" className="text-xs">{catProducts.length}</Badge>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => { setCatName(cat.name); setEditingCat(cat); setCatDialog(true); }}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => deleteCategory(cat.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>

            {catProducts.length === 0 && (
              <p className="text-sm text-muted-foreground pl-1">Nenhum produto nesta categoria.</p>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {catProducts.map(prod => (
                <div key={prod.id} className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                  {/* thumbnail */}
                  <div className="aspect-square bg-muted relative">
                    {prod.image_url ? (
                      <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-10 h-10 text-muted-foreground/40" />
                      </div>
                    )}
                    {!prod.is_available && (
                      <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                        <Badge variant="secondary">Indisponível</Badge>
                      </div>
                    )}
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-medium text-foreground truncate">{prod.name}</h3>
                        {prod.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{prod.description}</p>}
                      </div>
                      <span className="text-primary font-bold text-sm whitespace-nowrap">R$ {Number(prod.price).toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch checked={prod.is_available} onCheckedChange={() => toggleAvailability(prod)} />
                        <span className="text-xs text-muted-foreground">{prod.is_available ? "Ativo" : "Inativo"}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditProduct(prod)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteProduct(prod.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* ─── product sheet ─── */}
      <Sheet open={prodSheet} onOpenChange={setProdSheet}>
        <SheetContent className="overflow-y-auto sm:max-w-lg w-full">
          <SheetHeader>
            <SheetTitle>{editingProd ? "Editar" : "Novo"} Produto</SheetTitle>
          </SheetHeader>
          <div className="space-y-5 mt-6">
            {/* image */}
            <ImageCropper
              aspectRatio={1}
              onCropped={setProdImageBlob}
              currentUrl={editingProd?.image_url || undefined}
              label="Foto do Produto"
              hint="Proporção 1:1 (quadrada)"
            />

            {/* basic fields */}
            <div className="space-y-2">
              <Label>Categoria</Label>
              <select className="w-full rounded-lg border border-input px-3 py-2 text-sm bg-background" value={prodForm.category_id} onChange={e => setProdForm({ ...prodForm, category_id: e.target.value })}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={prodForm.name} onChange={e => setProdForm({ ...prodForm, name: e.target.value })} placeholder="Ex: Cookie de chocolate" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={prodForm.description} onChange={e => setProdForm({ ...prodForm, description: e.target.value })} placeholder="Descrição do produto" />
            </div>
            <div className="space-y-2">
              <Label>Preço (R$) *</Label>
              <Input type="number" step="0.01" min="0" value={prodForm.price} onChange={e => setProdForm({ ...prodForm, price: e.target.value })} placeholder="0.00" />
            </div>

            {/* ─── option groups (edit mode only) ─── */}
            {editingProd && (
              <div className="space-y-4 border-t border-border pt-4">
                <h3 className="font-semibold text-foreground">Grupos de Adicionais</h3>

                {optionGroups.map(group => (
                  <div key={group.id} className="border border-border rounded-lg p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-foreground text-sm">{group.name}</span>
                        <p className="text-xs text-muted-foreground">
                          Mín: {group.min_selection} · Máx: {group.max_selection}
                          {group.min_selection > 0 && <Badge variant="secondary" className="ml-2 text-[10px]">Obrigatório</Badge>}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteOptionGroup(group.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>

                    {/* options list */}
                    {options.filter(o => o.group_id === group.id).map(opt => (
                      <div key={opt.id} className="flex items-center justify-between pl-3 text-sm">
                        <span className="text-foreground">{opt.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">+ R$ {Number(opt.price).toFixed(2)}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteOption(opt.id)}>
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* add option inline */}
                    {activeGroupId === group.id ? (
                      <div className="flex gap-2 items-end">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">Nome</Label>
                          <Input value={newOptionName} onChange={e => setNewOptionName(e.target.value)} placeholder="Ex: Nutella" className="h-8 text-sm" />
                        </div>
                        <div className="w-24 space-y-1">
                          <Label className="text-xs">Preço</Label>
                          <Input type="number" step="0.01" min="0" value={newOptionPrice} onChange={e => setNewOptionPrice(e.target.value)} className="h-8 text-sm" />
                        </div>
                        <Button size="sm" className="h-8" onClick={() => addOption(group.id)}>Adicionar</Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" className="w-full" onClick={() => { setActiveGroupId(group.id); setNewOptionName(""); setNewOptionPrice("0"); }}>
                        <Plus className="w-3 h-3 mr-1" /> Opção
                      </Button>
                    )}
                  </div>
                ))}

                {/* add new group */}
                <div className="border border-dashed border-border rounded-lg p-3 space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Novo Grupo</p>
                  <div className="space-y-2">
                    <Input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Ex: Escolha o Recheio" className="h-8 text-sm" />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Mín. seleção</Label>
                        <Input type="number" min="0" value={newGroupMin} onChange={e => setNewGroupMin(e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Máx. seleção</Label>
                        <Input type="number" min="1" value={newGroupMax} onChange={e => setNewGroupMax(e.target.value)} className="h-8 text-sm" />
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full" onClick={addOptionGroup} disabled={!newGroupName.trim()}>
                    <Plus className="w-3 h-3 mr-1" /> Criar Grupo
                  </Button>
                </div>
              </div>
            )}

            {!editingProd && (
              <p className="text-xs text-muted-foreground">💡 Salve o produto primeiro para adicionar grupos de adicionais.</p>
            )}

            <Button onClick={saveProduct} className="w-full" size="lg" disabled={savingProd || !prodForm.name || !prodForm.price}>
              {savingProd ? "Salvando..." : "Salvar Produto"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ProductsPage;
