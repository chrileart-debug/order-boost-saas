import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Ticket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CouponsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [establishment, setEstablishment] = useState<any>(null);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ code: "", type: "percentage", value: "", min_purchase: "0" });

  const fetchData = async () => {
    if (!user) return;
    const { data: est } = await supabase.from("establishments").select("*").eq("owner_id", user.id).maybeSingle();
    setEstablishment(est);
    if (est) {
      const { data } = await supabase.from("coupons").select("*").eq("establishment_id", est.id).order("created_at", { ascending: false });
      setCoupons(data || []);
    }
  };

  useEffect(() => { fetchData(); }, [user]);

  const save = async () => {
    if (!establishment || !form.code || !form.value) return;
    await supabase.from("coupons").insert({
      establishment_id: establishment.id,
      code: form.code.toUpperCase(),
      type: form.type,
      value: parseFloat(form.value),
      min_purchase: parseFloat(form.min_purchase || "0"),
    });
    setDialog(false);
    setForm({ code: "", type: "percentage", value: "", min_purchase: "0" });
    fetchData();
    toast({ title: "Cupom criado!" });
  };

  const deleteCoupon = async (id: string) => {
    await supabase.from("coupons").delete().eq("id", id);
    fetchData();
    toast({ title: "Cupom removido" });
  };

  if (!establishment) return <div className="text-center py-12 text-muted-foreground">Configure seu estabelecimento primeiro.</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Cupons</h1>
        <Dialog open={dialog} onOpenChange={setDialog}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Novo Cupom</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Cupom</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Código</Label>
                <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="EX: PROMO10" />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <select className="w-full rounded-lg border border-input px-3 py-2 text-sm bg-background" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="percentage">Porcentagem (%)</option>
                  <option value="fixed">Valor Fixo (R$)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Valor</Label>
                <Input type="number" step="0.01" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Compra mínima (R$)</Label>
                <Input type="number" step="0.01" value={form.min_purchase} onChange={e => setForm({ ...form, min_purchase: e.target.value })} />
              </div>
              <Button onClick={save} className="w-full">Criar Cupom</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {coupons.map(c => (
          <Card key={c.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Ticket className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{c.code}</p>
                  <p className="text-sm text-muted-foreground">
                    {c.type === "percentage" ? `${c.value}%` : `R$ ${Number(c.value).toFixed(2)}`} off
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => deleteCoupon(c.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {coupons.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">Nenhum cupom criado.</p>}
      </div>
    </div>
  );
};

export default CouponsPage;
