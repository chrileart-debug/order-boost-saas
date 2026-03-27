import { useEffect, useState, useCallback } from "react";
import { useEstablishment } from "@/components/EstablishmentProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, ImageIcon, Package, Layers, BookOpen, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import ImageCropper from "@/components/ImageCropper";

/* ─── types ─── */
interface Category { id: string; name: string; order_index: number; establishment_id: string }
interface Product { id: string; name: string; description: string | null; price: number; category_id: string; image_url: string | null; is_available: boolean; order_index: number }
interface OptionGroup { id: string; name: string; min_selection: number; max_selection: number; establishment_id: string; selection_type: string }
interface LibraryItem { id: string; establishment_id: string; name: string; description: string; price: number; is_available: boolean }
interface GroupItem { id: string; group_id: string; item_id: string; max_quantity: number; sort_order: number }

const ProductsPage = () => {
  const { establishment } = useEstablishment();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("products");
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

  /* modifier groups */
  const [allGroups, setAllGroups] = useState<OptionGroup[]>([]);

  /* item library */
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [groupItemLinks, setGroupItemLinks] = useState<GroupItem[]>([]);

  /* item library sheet */
  const [itemSheet, setItemSheet] = useState(false);
  const [editingItem, setEditingItem] = useState<LibraryItem | null>(null);
  const [itemForm, setItemForm] = useState({ name: "", description: "", price: "0" });
  const [creatingFromGroup, setCreatingFromGroup] = useState(false);

  /* group sheet */
  const [libSheet, setLibSheet] = useState(false);
  const [editingGroup, setEditingGroup] = useState<OptionGroup | null>(null);
  const [groupForm, setGroupForm] = useState({ name: "", min: "0", max: "1", selectionType: "selection" });
  const [groupItemMaxQty, setGroupItemMaxQty] = useState<Record<string, string>>({});
  const [itemSearch, setItemSearch] = useState("");

  /* linking modifiers to product */
  const [linkedGroupIds, setLinkedGroupIds] = useState<string[]>([]);

  /* ─── fetch ─── */
  const fetchData = useCallback(async () => {
    if (!establishment) return;
    setLoading(true);
    const [catsRes, groupsRes, itemsRes, giRes] = await Promise.all([
      supabase.from("categories").select("*").eq("establishment_id", establishment.id).order("order_index"),
      supabase.from("product_option_groups").select("*").eq("establishment_id", establishment.id).order("created_at"),
      supabase.from("item_library").select("*").eq("establishment_id", establishment.id).order("name"),
      supabase.from("group_items").select("*"),
    ]);

    const cats = catsRes.data || [];
    setCategories(cats);

    if (cats.length > 0) {
      const { data: prods } = await supabase.from("products").select("*").in("category_id", cats.map(c => c.id)).order("order_index");
      setProducts(prods || []);
    } else {
      setProducts([]);
    }

    const groups = (groupsRes.data || []) as OptionGroup[];
    setAllGroups(groups);
    setLibraryItems((itemsRes.data || []) as LibraryItem[]);

    // Filter group_items to only those belonging to our groups
    const groupIds = groups.map(g => g.id);
    setGroupItemLinks(((giRes.data || []) as GroupItem[]).filter(gi => groupIds.includes(gi.group_id)));

    setLoading(false);
  }, [establishment]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ─── ensure default category ─── */
  const ensureDefaultCategory = async (): Promise<string> => {
    const existing = categories.find(c => c.name === "Geral");
    if (existing) return existing.id;
    const { data } = await supabase.from("categories").insert({ establishment_id: establishment!.id, name: "Geral", order_index: categories.length }).select().single();
    if (data) { setCategories(prev => [...prev, data as Category]); return data.id; }
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
    if (products.some(p => p.category_id === id)) {
      toast({ title: "Categoria tem produtos", description: "Remova os produtos antes.", variant: "destructive" });
      return;
    }
    await supabase.from("categories").delete().eq("id", id);
    fetchData();
    toast({ title: "Categoria removida" });
  };

  /* ─── product sheet ─── */
  const openNewProduct = async () => {
    let defaultCatId = categories[0]?.id || "";
    if (!defaultCatId) { try { defaultCatId = await ensureDefaultCategory(); } catch { return; } }
    setProdForm({ name: "", description: "", price: "", category_id: defaultCatId });
    setEditingProd(null); setProdImageBlob(null); setLinkedGroupIds([]);
    setProdSheet(true);
  };

  const openEditProduct = async (prod: Product) => {
    setProdForm({ name: prod.name, description: prod.description || "", price: String(prod.price), category_id: prod.category_id });
    setEditingProd(prod); setProdImageBlob(null);
    const { data: mods } = await supabase.from("product_modifiers").select("*").eq("product_id", prod.id);
    setLinkedGroupIds((mods || []).map((m: any) => m.group_id));
    setProdSheet(true);
  };

  const saveProduct = async () => {
    if (!prodForm.name || !prodForm.price) return;
    setSavingProd(true);
    const categoryId = prodForm.category_id || (await ensureDefaultCategory());
    const payload: any = { name: prodForm.name, description: prodForm.description || null, price: parseFloat(prodForm.price), category_id: categoryId };
    try {
      let productId = editingProd?.id;
      if (editingProd) {
        await supabase.from("products").update(payload).eq("id", editingProd.id);
      } else {
        payload.order_index = products.length;
        const { data } = await supabase.from("products").insert(payload).select().single();
        productId = data?.id;
      }
      if (prodImageBlob && productId) {
        const path = `products/${productId}.webp`;
        await supabase.storage.from("establishments").upload(path, prodImageBlob, { upsert: true, contentType: "image/webp" });
        const { data: urlData } = supabase.storage.from("establishments").getPublicUrl(path);
        await supabase.from("products").update({ image_url: `${urlData.publicUrl}?t=${Date.now()}` }).eq("id", productId);
      }
      if (productId) {
        await supabase.from("product_modifiers").delete().eq("product_id", productId);
        if (linkedGroupIds.length > 0) {
          await supabase.from("product_modifiers").insert(linkedGroupIds.map(gid => ({ product_id: productId!, group_id: gid })));
        }
      }
      toast({ title: editingProd ? "Produto atualizado" : "Produto criado" });
      setProdSheet(false);
      fetchData();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setSavingProd(false); }
  };

  const deleteProduct = async (id: string) => {
    await supabase.from("product_modifiers").delete().eq("product_id", id);
    await supabase.from("products").delete().eq("id", id);
    fetchData();
    toast({ title: "Produto removido" });
  };

  const toggleAvailability = async (prod: Product) => {
    const newVal = !prod.is_available;
    await supabase.from("products").update({ is_available: newVal }).eq("id", prod.id);
    setProducts(prev => prev.map(p => p.id === prod.id ? { ...p, is_available: newVal } : p));
  };

  /* ═══════════════════════════════════════════════ */
  /*           ITEM LIBRARY CRUD                     */
  /* ═══════════════════════════════════════════════ */
  const openNewItem = () => {
    setEditingItem(null);
    setItemForm({ name: "", description: "", price: "0" });
    setItemSheet(true);
  };

  const openEditItem = (item: LibraryItem) => {
    setEditingItem(item);
    setItemForm({ name: item.name, description: item.description || "", price: String(item.price) });
    setItemSheet(true);
  };

  const saveItem = async () => {
    if (!establishment || !itemForm.name.trim()) return;
    const payload = { name: itemForm.name, description: itemForm.description, price: parseFloat(itemForm.price) || 0, establishment_id: establishment.id };
    let newItemId: string | null = null;
    if (editingItem) {
      await supabase.from("item_library").update(payload).eq("id", editingItem.id);
    } else {
      const { data } = await supabase.from("item_library").insert(payload).select("id").single();
      newItemId = data?.id || null;
    }
    setItemSheet(false);
    await fetchData();

    if (creatingFromGroup && newItemId && editingGroup) {
      // Auto-link the new item to the current group
      await supabase.from("group_items").insert({ group_id: editingGroup.id, item_id: newItemId, sort_order: groupItemLinks.filter(gl => gl.group_id === editingGroup.id).length });
      await fetchData();
      setCreatingFromGroup(false);
      setLibSheet(true);
      toast({ title: "Item adicionado à biblioteca e vinculado ao grupo" });
    } else if (creatingFromGroup) {
      setCreatingFromGroup(false);
      setLibSheet(true);
      toast({ title: "Item adicionado à biblioteca" });
    } else {
      toast({ title: editingItem ? "Item atualizado" : "Item criado" });
    }
  };

  const deleteItem = async (id: string) => {
    // Remove from all groups first
    await supabase.from("group_items").delete().eq("item_id", id);
    await supabase.from("item_library").delete().eq("id", id);
    fetchData();
    toast({ title: "Item removido da biblioteca e de todos os grupos" });
  };

  const toggleItemAvailability = async (item: LibraryItem) => {
    const newVal = !item.is_available;
    await supabase.from("item_library").update({ is_available: newVal }).eq("id", item.id);
    setLibraryItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: newVal } : i));
    toast({ title: newVal ? `${item.name} ativado` : `${item.name} pausado em todos os cardápios` });
  };

  /* ═══════════════════════════════════════════════ */
  /*           GROUP CRUD                            */
  /* ═══════════════════════════════════════════════ */
  const openNewGroup = () => {
    setEditingGroup(null);
    setGroupForm({ name: "", min: "0", max: "1", selectionType: "selection" });
    setGroupItemMaxQty({});
    setItemSearch("");
    setLibSheet(true);
  };

  const openEditGroup = (group: OptionGroup) => {
    setEditingGroup(group);
    setGroupForm({ name: group.name, min: String(group.min_selection), max: String(group.max_selection), selectionType: group.selection_type || "selection" });
    // Load max quantities for items in this group
    const mqMap: Record<string, string> = {};
    groupItemLinks.filter(gi => gi.group_id === group.id).forEach(gi => { mqMap[gi.item_id] = String(gi.max_quantity); });
    setGroupItemMaxQty(mqMap);
    setItemSearch("");
    setLibSheet(true);
  };

  const saveGroup = async () => {
    if (!establishment || !groupForm.name.trim()) return;
    const isQuantity = groupForm.selectionType === "quantity";
    const payload = {
      name: groupForm.name,
      min_selection: isQuantity ? (parseInt(groupForm.min) || 0) : 0,
      max_selection: isQuantity ? (parseInt(groupForm.max) || 1) : 1,
      selection_type: groupForm.selectionType,
      establishment_id: establishment.id,
    };

    let groupId = editingGroup?.id;
    if (editingGroup) {
      await supabase.from("product_option_groups").update(payload).eq("id", editingGroup.id);
    } else {
      const { data } = await supabase.from("product_option_groups").insert(payload).select().single();
      if (data) {
        groupId = data.id;
        setEditingGroup(data as OptionGroup);
      }
    }

    if (groupId) {
      // Sync group_items: delete old, insert new
      await supabase.from("group_items").delete().eq("group_id", groupId);
      const itemIds = Object.keys(groupItemMaxQty);
      if (itemIds.length > 0) {
        await supabase.from("group_items").insert(
          itemIds.map((itemId, i) => ({
            group_id: groupId!,
            item_id: itemId,
            max_quantity: parseInt(groupItemMaxQty[itemId]) || 1,
            sort_order: i,
          }))
        );
      }
    }

    fetchData();
    toast({ title: editingGroup ? "Grupo atualizado" : "Grupo criado" });
  };

  const deleteGroup = async (id: string) => {
    await supabase.from("group_items").delete().eq("group_id", id);
    await supabase.from("product_modifiers").delete().eq("group_id", id);
    await supabase.from("product_option_groups").delete().eq("id", id);
    setLibSheet(false);
    fetchData();
    toast({ title: "Grupo excluído e desvinculado de todos os produtos" });
  };

  const isItemInGroup = (itemId: string) => itemId in groupItemMaxQty;

  const toggleItemInGroup = (itemId: string) => {
    setGroupItemMaxQty(prev => {
      if (itemId in prev) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return { ...prev, [itemId]: "1" };
    });
  };

  const toggleGroupLink = (groupId: string) => {
    setLinkedGroupIds(prev => prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]);
  };

  /* ─── render ─── */
  if (!establishment) return <div className="text-center py-12 text-muted-foreground">Configure seu estabelecimento primeiro.</div>;

  if (loading) return (
    <div className="space-y-6 animate-fade-in">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
    </div>
  );

  const filteredLibItems = libraryItems.filter(i => !itemSearch || i.name.toLowerCase().includes(itemSearch.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs defaultValue="products">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <TabsList>
            <TabsTrigger value="products">Produtos</TabsTrigger>
            <TabsTrigger value="modifiers"><Layers className="w-4 h-4 mr-1" /> Complementos</TabsTrigger>
            <TabsTrigger value="library"><BookOpen className="w-4 h-4 mr-1" /> Biblioteca</TabsTrigger>
          </TabsList>
        </div>

        {/* ═══════════ TAB: PRODUTOS ═══════════ */}
        <TabsContent value="products" className="space-y-6 mt-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h1 className="text-2xl font-bold text-foreground">Produtos & Categorias</h1>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setCatName(""); setEditingCat(null); setCatDialog(true); }}>
                <Plus className="w-4 h-4 mr-1" /> Categoria
              </Button>
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
                {catProducts.length === 0 && <p className="text-sm text-muted-foreground pl-1">Nenhum produto nesta categoria.</p>}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {catProducts.map(prod => (
                    <div key={prod.id} className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                      <div className="aspect-square bg-muted relative">
                        {prod.image_url ? <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" /> : (
                          <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-10 h-10 text-muted-foreground/40" /></div>
                        )}
                        {!prod.is_available && (
                          <div className="absolute inset-0 bg-background/60 flex items-center justify-center"><Badge variant="secondary">Indisponível</Badge></div>
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
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditProduct(prod)}><Pencil className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteProduct(prod.id)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* ═══════════ TAB: COMPLEMENTOS (GRUPOS) ═══════════ */}
        <TabsContent value="modifiers" className="space-y-6 mt-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Grupos de Complementos</h1>
              <p className="text-sm text-muted-foreground mt-1">Crie grupos reutilizáveis com itens da sua Biblioteca.</p>
            </div>
            <Button size="sm" onClick={openNewGroup}>
              <Plus className="w-4 h-4 mr-1" /> Novo Grupo
            </Button>
          </div>

          {allGroups.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
              <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum grupo criado.</p>
              <Button className="mt-4" onClick={openNewGroup}><Plus className="w-4 h-4 mr-1" /> Criar primeiro grupo</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {allGroups.map(group => {
                const gLinks = groupItemLinks.filter(gi => gi.group_id === group.id);
                const itemNames = gLinks.map(gi => {
                  const item = libraryItems.find(i => i.id === gi.item_id);
                  return item?.name || "?";
                });
                return (
                  <div key={group.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{group.name}</h3>
                          {group.min_selection > 0 && <Badge variant="destructive" className="text-[10px]">Obrigatório</Badge>}
                          <Badge variant="outline" className="text-[10px]">
                            {group.selection_type === "quantity" ? "Contador +/-" : "Seleção"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Mín: {group.min_selection} · Máx: {group.max_selection} · {gLinks.length} {gLinks.length === 1 ? "item" : "itens"}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditGroup(group)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteGroup(group.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    {itemNames.length > 0 && (
                      <p className="text-xs text-muted-foreground">{itemNames.join(", ")}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ═══════════ TAB: BIBLIOTECA DE ITENS ═══════════ */}
        <TabsContent value="library" className="space-y-6 mt-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Biblioteca de Itens</h1>
              <p className="text-sm text-muted-foreground mt-1">Cadastre seus ingredientes e insumos uma única vez. Altere o preço aqui e ele reflete em todos os grupos.</p>
            </div>
            <Button size="sm" onClick={openNewItem}>
              <Plus className="w-4 h-4 mr-1" /> Novo Item
            </Button>
          </div>

          {libraryItems.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum item cadastrado na biblioteca.</p>
              <Button className="mt-4" onClick={openNewItem}><Plus className="w-4 h-4 mr-1" /> Criar primeiro item</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {libraryItems.map(item => {
                const usedInGroups = allGroups.filter(g => groupItemLinks.some(gi => gi.group_id === g.id && gi.item_id === item.id));
                return (
                  <div key={item.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Switch checked={item.is_available} onCheckedChange={() => toggleItemAvailability(item)} />
                      <div className="min-w-0">
                        <span className={`font-medium text-sm ${item.is_available ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                          {item.name}
                        </span>
                        {item.description && <p className="text-xs text-muted-foreground truncate">{item.description}</p>}
                        {usedInGroups.length > 0 && (
                          <p className="text-xs text-muted-foreground">Usado em: {usedInGroups.map(g => g.name).join(", ")}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-semibold text-primary">R$ {Number(item.price).toFixed(2)}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditItem(item)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteItem(item.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── category dialog ─── */}
      <Dialog open={catDialog} onOpenChange={setCatDialog}>
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

      {/* ─── product sheet ─── */}
      <Sheet open={prodSheet} onOpenChange={setProdSheet}>
        <SheetContent className="overflow-y-auto sm:max-w-lg w-full">
          <SheetHeader><SheetTitle>{editingProd ? "Editar" : "Novo"} Produto</SheetTitle></SheetHeader>
          <div className="space-y-5 mt-6">
            <ImageCropper aspectRatio={1} onCropped={setProdImageBlob} currentUrl={editingProd?.image_url || undefined} label="Foto do Produto" hint="Proporção 1:1 (quadrada)" />
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

            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Complementos vinculados</h3>
                <Button variant="outline" size="sm" onClick={openNewGroup}><Plus className="w-3 h-3 mr-1" /> Criar novo</Button>
              </div>
              {allGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum grupo criado ainda.</p>
              ) : (
                <div className="space-y-2">
                  {allGroups.map(g => {
                    const gLinks = groupItemLinks.filter(gi => gi.group_id === g.id);
                    const itemNames = gLinks.map(gi => libraryItems.find(i => i.id === gi.item_id)?.name).filter(Boolean);
                    const linked = linkedGroupIds.includes(g.id);
                    return (
                      <div key={g.id} className={`border rounded-lg p-3 transition-colors cursor-pointer ${linked ? 'border-primary bg-primary/5' : 'border-border'}`} onClick={() => toggleGroupLink(g.id)}>
                        <div className="flex items-center gap-3">
                          <Checkbox checked={linked} onCheckedChange={() => toggleGroupLink(g.id)} />
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-foreground text-sm">{g.name}</span>
                            <p className="text-xs text-muted-foreground">
                              {g.selection_type === "quantity" ? "Contador" : "Seleção"} · Mín: {g.min_selection} · Máx: {g.max_selection}
                              {g.min_selection > 0 && <Badge variant="destructive" className="ml-2 text-[10px]">Obrig.</Badge>}
                            </p>
                            {itemNames.length > 0 && <p className="text-xs text-muted-foreground mt-0.5">{itemNames.join(", ")}</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Button onClick={saveProduct} className="w-full" size="lg" disabled={savingProd || !prodForm.name || !prodForm.price}>
              {savingProd ? "Salvando..." : "Salvar Produto"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── item library sheet ─── */}
      <Sheet open={itemSheet} onOpenChange={setItemSheet}>
        <SheetContent className="overflow-y-auto sm:max-w-md w-full">
          <SheetHeader><SheetTitle>{editingItem ? "Editar" : "Novo"} Item da Biblioteca</SheetTitle></SheetHeader>
          <div className="space-y-5 mt-6">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} placeholder="Ex: Nutella" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} placeholder="Descrição opcional" />
            </div>
            <div className="space-y-2">
              <Label>Preço adicional (R$)</Label>
              <Input type="number" step="0.01" min="0" value={itemForm.price} onChange={e => setItemForm({ ...itemForm, price: e.target.value })} placeholder="0.00" />
            </div>
            <Button onClick={saveItem} className="w-full" disabled={!itemForm.name.trim()}>
              {editingItem ? "Atualizar Item" : "Criar Item"}
            </Button>
            {editingItem && (
              <Button variant="destructive" className="w-full" onClick={() => { deleteItem(editingItem.id); setItemSheet(false); }}>
                <Trash2 className="w-4 h-4 mr-1" /> Excluir Item
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── group sheet ─── */}
      <Sheet open={libSheet} onOpenChange={setLibSheet}>
        <SheetContent className="overflow-y-auto sm:max-w-lg w-full">
          <SheetHeader><SheetTitle>{editingGroup ? "Editar" : "Novo"} Grupo de Complementos</SheetTitle></SheetHeader>
          <div className="space-y-5 mt-6">
            <div className="space-y-2">
              <Label>Nome do Grupo *</Label>
              <Input value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} placeholder="Ex: Escolha o Recheio" />
            </div>

            <div className="space-y-2">
              <Label>Tipo de seleção</Label>
              <Select value={groupForm.selectionType} onValueChange={v => setGroupForm({ ...groupForm, selectionType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="selection">Seleção (checkbox/radio)</SelectItem>
                  <SelectItem value="quantity">Quantidade (contador +/-)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {groupForm.selectionType === "quantity" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Mín. seleção</Label>
                  <Input type="number" min="0" value={groupForm.min} onChange={e => setGroupForm({ ...groupForm, min: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Máx. seleção</Label>
                  <Input type="number" min="1" value={groupForm.max} onChange={e => setGroupForm({ ...groupForm, max: e.target.value })} />
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground text-sm">Itens da Biblioteca</h3>
                <Button variant="outline" size="sm" onClick={() => { setLibSheet(false); setCreatingFromGroup(true); openNewItem(); }}>
                  <Plus className="w-3 h-3 mr-1" /> Novo Item
                </Button>
              </div>

              {libraryItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">Crie itens na aba Biblioteca primeiro.</p>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={itemSearch} onChange={e => setItemSearch(e.target.value)} placeholder="Buscar item..." className="pl-9 h-9" />
                  </div>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {filteredLibItems.map(item => {
                      const inGroup = isItemInGroup(item.id);
                      return (
                        <div key={item.id} className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${inGroup ? 'bg-primary/5' : 'hover:bg-muted/50'}`}>
                          <Checkbox checked={inGroup} onCheckedChange={() => toggleItemInGroup(item.id)} />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-foreground">{item.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">R$ {Number(item.price).toFixed(2)}</span>
                          </div>
                          {inGroup && groupForm.selectionType === "selection" && (
                            <div className="flex items-center gap-1 shrink-0">
                              <Label className="text-xs text-muted-foreground">Máx:</Label>
                              <Input
                                type="number"
                                min="1"
                                value={groupItemMaxQty[item.id] || "1"}
                                onChange={e => setGroupItemMaxQty(prev => ({ ...prev, [item.id]: e.target.value }))}
                                className="w-14 h-7 text-xs"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <Button onClick={saveGroup} className="w-full" disabled={!groupForm.name.trim()}>
              {editingGroup ? "Atualizar Grupo" : "Criar Grupo"}
            </Button>

            {editingGroup && (
              <Button variant="destructive" className="w-full" onClick={() => deleteGroup(editingGroup.id)}>
                <Trash2 className="w-4 h-4 mr-1" /> Excluir Grupo
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ProductsPage;
