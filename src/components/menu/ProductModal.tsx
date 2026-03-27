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

interface Props {
  product: any;
  slug: string;
  onClose: () => void;
  onAdd: () => void;
}

const ProductModal = ({ product, slug, onClose, onAdd }: Props) => {
  const [groups, setGroups] = useState<any[]>([]);
  const [options, setOptions] = useState<any[]>([]);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);
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
        setGroups(g || []);

        if (g && g.length > 0) {
          const { data: o } = await supabase
            .from("product_options")
            .select("*")
            .in("group_id", g.map((x: any) => x.id))
            .order("created_at");
          setOptions(o || []);
        }
      }
      setLoading(false);
    };
    load();
  }, [product.id]);

  const toggleOption = (groupId: string, optionId: string, maxSel: number) => {
    setSelected((prev) => {
      const current = prev[groupId] || [];
      if (maxSel === 1) return { ...prev, [groupId]: [optionId] };
      if (current.includes(optionId)) return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
      if (current.length >= maxSel) return prev;
      return { ...prev, [groupId]: [...current, optionId] };
    });
  };

  const isValid = groups.every((g: any) => {
    const min = g.min_selection || 0;
    return (selected[g.id]?.length || 0) >= min;
  });

  const selectedOptions: CartItemOption[] = Object.values(selected)
    .flat()
    .map((optId) => {
      const opt = options.find((o: any) => o.id === optId);
      return opt ? { name: opt.name, price: opt.price || 0 } : null;
    })
    .filter(Boolean) as CartItemOption[];

  const unitPrice = product.price + selectedOptions.reduce((s, o) => s + o.price, 0);
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
    });
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
            groups.map((group: any) => {
              const groupOptions = options.filter((o: any) => o.group_id === group.id);
              const isRadio = (group.max_selection || 1) === 1;
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

                  {isRadio ? (
                    <RadioGroup
                      value={selected[group.id]?.[0] || ""}
                      onValueChange={(val) => toggleOption(group.id, val, 1)}
                    >
                      {groupOptions.map((opt: any) => (
                        <div key={opt.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value={opt.id} id={opt.id} />
                            <Label htmlFor={opt.id} className="cursor-pointer">{opt.name}</Label>
                          </div>
                          {(opt.price || 0) > 0 && (
                            <span className="text-sm text-muted-foreground">+ {formatPrice(opt.price)}</span>
                          )}
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <div className="space-y-0">
                      {groupOptions.map((opt: any) => {
                        const checked = selected[group.id]?.includes(opt.id) || false;
                        return (
                          <div key={opt.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={opt.id}
                                checked={checked}
                                onCheckedChange={() => toggleOption(group.id, opt.id, group.max_selection || 1)}
                              />
                              <Label htmlFor={opt.id} className="cursor-pointer">{opt.name}</Label>
                            </div>
                            {(opt.price || 0) > 0 && (
                              <span className="text-sm text-muted-foreground">+ {formatPrice(opt.price)}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-accent"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="font-semibold text-lg w-6 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-accent"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <Button
            onClick={handleAdd}
            disabled={!isValid}
            className="w-full h-12 text-base font-semibold"
          >
            Adicionar {formatPrice(totalPrice)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductModal;
