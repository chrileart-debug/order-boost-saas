import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus } from "lucide-react";
import { addToCart, type CartItemOption } from "@/lib/cart";
import { pushCartToCloud } from "@/lib/cartSync";

interface Props {
  product: any;
  slug: string;
  onClose: () => void;
  onAdd: () => void;
}

interface GroupData {
  id: string;
  name: string;
  min_selection: number;
  max_selection: number;
  selection_type: string; // 'selection' | 'quantity'
}

interface GroupItemData {
  id: string;
  group_id: string;
  item_id: string;
  max_quantity: number;
  item_name: string;
  item_price: number;
}

const ProductModal = ({ product, slug, onClose, onAdd }: Props) => {
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [groupItems, setGroupItems] = useState<GroupItemData[]>([]);
  // For selection type: selected item ids per group
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  // For quantity type: quantity per group_item id
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      // Fetch groups via product_modifiers junction table
      const { data: modifiers } = await supabase
        .from("product_modifiers")
        .select("group_id")
        .eq("product_id", product.id);

      const groupIds = (modifiers || []).map((m: any) => m.group_id);

      if (groupIds.length > 0) {
        const { data: g } = await supabase
          .from("product_option_groups")
          .select("*")
          .in("id", groupIds)
          .order("created_at");
        setGroups((g || []) as GroupData[]);

        if (g && g.length > 0) {
          // Fetch group_items + item_library data
          const { data: gi } = await supabase
            .from("group_items")
            .select("*")
            .in("group_id", g.map((x: any) => x.id))
            .order("sort_order");

          if (gi && gi.length > 0) {
            const itemIds = [...new Set(gi.map((x: any) => x.item_id))];
            const { data: items } = await supabase
              .from("item_library")
              .select("*")
              .in("id", itemIds)
              .eq("is_available", true);

            const itemMap = new Map((items || []).map((i: any) => [i.id, i]));
            const resolved: GroupItemData[] = gi
              .filter((x: any) => itemMap.has(x.item_id))
              .map((x: any) => {
                const item = itemMap.get(x.item_id)!;
                return {
                  id: x.id,
                  group_id: x.group_id,
                  item_id: x.item_id,
                  max_quantity: x.max_quantity || 1,
                  item_name: item.name,
                  item_price: Number(item.price) || 0,
                };
              });
            setGroupItems(resolved);
          }
        }
      }
      setLoading(false);
    };
    load();
  }, [product.id]);

  /* ─── selection type handlers ─── */
  const toggleOption = (groupId: string, itemId: string, maxSel: number) => {
    setSelected((prev) => {
      const current = prev[groupId] || [];
      if (maxSel === 1) return { ...prev, [groupId]: [itemId] };
      if (current.includes(itemId)) return { ...prev, [groupId]: current.filter((id) => id !== itemId) };
      if (current.length >= maxSel) return prev;
      return { ...prev, [groupId]: [...current, itemId] };
    });
  };

  /* ─── quantity type handlers ─── */
  const setItemQty = (giId: string, groupId: string, delta: number, maxQty: number, groupMax: number) => {
    setQuantities((prev) => {
      const current = prev[giId] || 0;
      const newQty = Math.max(0, current + delta);
      // Enforce individual item max_quantity
      if (maxQty > 0 && newQty > maxQty) return prev;
      // Enforce group total limit
      const groupGiIds = groupItems.filter(gi => gi.group_id === groupId).map(gi => gi.id);
      const groupTotal = groupGiIds.reduce((s, id) => s + (id === giId ? newQty : (prev[id] || 0)), 0);
      if (groupTotal > groupMax) return prev;
      return { ...prev, [giId]: newQty };
    });
  };

  /* ─── validation ─── */
  const isValid = groups.every((g) => {
    const min = g.min_selection || 0;
    if (min === 0) return true;
    if (g.selection_type === "quantity") {
      const gItems = groupItems.filter(gi => gi.group_id === g.id);
      const totalQty = gItems.reduce((s, gi) => s + (quantities[gi.id] || 0), 0);
      return totalQty >= min;
    }
    return (selected[g.id]?.length || 0) >= min;
  });

  /* ─── build selected options for cart ─── */
  const buildCartOptions = (): CartItemOption[] => {
    const opts: CartItemOption[] = [];
    groups.forEach((g) => {
      const gItems = groupItems.filter(gi => gi.group_id === g.id);
      if (g.selection_type === "quantity") {
        gItems.forEach((gi) => {
          const qty = quantities[gi.id] || 0;
          if (qty > 0) {
            opts.push({ name: gi.item_name, price: gi.item_price, quantity: qty });
          }
        });
      } else {
        const sel = selected[g.id] || [];
        gItems.forEach((gi) => {
          if (sel.includes(gi.item_id)) {
            opts.push({ name: gi.item_name, price: gi.item_price, quantity: 1 });
          }
        });
      }
    });
    return opts;
  };

  const selectedOptions = buildCartOptions();
  const unitPrice = product.price + selectedOptions.reduce((s, o) => s + o.price * o.quantity, 0);
  const totalPrice = unitPrice * quantity;

  const formatPrice = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleAdd = () => {
    addToCart(slug, {
      productId: product.id,
      productName: product.name,
      productImage: product.image_url,
      basePrice: product.price,
      quantity,
      options: selectedOptions,
      notes: notes.trim() || undefined,
    });
    pushCartToCloud(slug);
    onAdd();
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        {product.image_url && (
          <img src={product.image_url} alt={product.name} className="w-full h-48 object-cover rounded-t-lg" />
        )}
        <div className="p-6 space-y-5">
          <DialogHeader>
            <DialogTitle className="text-xl">{product.name}</DialogTitle>
            {product.description && (
              <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
            )}
            <p className="text-lg font-semibold text-primary mt-2">{formatPrice(product.price)}</p>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : (
            groups.map((group) => {
              const gItems = groupItems.filter((gi) => gi.group_id === group.id);
              if (gItems.length === 0) return null;
              const isRequired = (group.min_selection || 0) > 0;

              return (
                <div key={group.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground">{group.name}</h3>
                    {isRequired && <Badge variant="destructive" className="text-[10px]">Obrigatório</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isRequired ? `Escolha ${group.min_selection}` : "Opcional"}
                    {group.max_selection > 1 ? ` (máx. ${group.max_selection})` : ""}
                  </p>

                  {group.selection_type === "quantity" ? (
                    /* ═══ QUANTITY MODE ═══ */
                    <div className="space-y-0">
                      {gItems.map((gi) => {
                        const qty = quantities[gi.id] || 0;
                        return (
                          <div key={gi.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-foreground">{gi.item_name}</span>
                              {gi.item_price > 0 && (
                                <span className="text-sm text-muted-foreground ml-2">+ {formatPrice(gi.item_price)}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setItemQty(gi.id, group.id, -1, gi.max_quantity, group.max_selection || 99)}
                                disabled={qty === 0}
                                className="w-7 h-7 rounded-full border border-border flex items-center justify-center hover:bg-accent disabled:opacity-30"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="text-sm font-semibold w-5 text-center">{qty}</span>
                              {(() => {
                                const groupGiIds = groupItems.filter(g => g.group_id === group.id).map(g => g.id);
                                const groupTotal = groupGiIds.reduce((s, id) => s + (quantities[id] || 0), 0);
                                const atGroupMax = groupTotal >= (group.max_selection || 99);
                                const atItemMax = gi.max_quantity > 0 && qty >= gi.max_quantity;
                                return (
                                  <button
                                    onClick={() => setItemQty(gi.id, group.id, 1, gi.max_quantity, group.max_selection || 99)}
                                    disabled={atGroupMax || atItemMax}
                                    className="w-7 h-7 rounded-full border border-primary text-primary flex items-center justify-center hover:bg-primary/10 disabled:opacity-30"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* ═══ SELECTION MODE ═══ */
                    (group.max_selection || 1) === 1 ? (
                      <RadioGroup
                        value={selected[group.id]?.[0] || ""}
                        onValueChange={(val) => toggleOption(group.id, val, 1)}
                      >
                        {gItems.map((gi) => (
                          <div key={gi.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                            <div className="flex items-center gap-2">
                              <RadioGroupItem value={gi.item_id} id={gi.id} />
                              <Label htmlFor={gi.id} className="cursor-pointer">{gi.item_name}</Label>
                            </div>
                            {gi.item_price > 0 && (
                              <span className="text-sm text-muted-foreground">+ {formatPrice(gi.item_price)}</span>
                            )}
                          </div>
                        ))}
                      </RadioGroup>
                    ) : (
                      <div className="space-y-0">
                        {gItems.map((gi) => {
                          const checked = selected[group.id]?.includes(gi.item_id) || false;
                          return (
                            <div key={gi.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={gi.id}
                                  checked={checked}
                                  onCheckedChange={() => toggleOption(group.id, gi.item_id, group.max_selection || 1)}
                                />
                                <Label htmlFor={gi.id} className="cursor-pointer">{gi.item_name}</Label>
                              </div>
                              {gi.item_price > 0 && (
                                <span className="text-sm text-muted-foreground">+ {formatPrice(gi.item_price)}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )
                  )}
                </div>
              );
            })
          )}

          {/* Observations */}
          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">Alguma observação?</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Tirar alface, sem cebola, ponto da carne, etc..."
              maxLength={140}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[60px] resize-none"
            />
            <p className="text-[10px] text-muted-foreground text-right">{notes.length}/140</p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-accent"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="font-semibold text-lg w-6 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-accent"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button
              onClick={handleAdd}
              disabled={!isValid}
              className="flex-1 h-11 text-base font-semibold"
            >
              Adicionar {formatPrice(totalPrice)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductModal;
