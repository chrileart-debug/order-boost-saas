import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Ticket, BarChart3, Percent, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const CouponsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [establishment, setEstablishment] = useState<any>(null);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [dialog, setDialog] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [form, setForm] = useState({
    code: "",
    description: "",
    type: "percentage",
    value: "",
    min_purchase: "0",
  });

  const fetchData = async () => {
    if (!user) return;
    const { data: est } = await supabase
      .from("establishments")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();
    setEstablishment(est);
    if (est) {
      const { data } = await supabase
        .from("coupons")
        .select("*")
        .eq("establishment_id", est.id)
        .order("created_at", { ascending: false });
      setCoupons(data || []);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const resetForm = () => {
    setForm({ code: "", description: "", type: "percentage", value: "", min_purchase: "0" });
    setEditingCoupon(null);
  };

  const openCreate = () => {
    resetForm();
    setDialog(true);
  };

  const openEdit = (c: any) => {
    setEditingCoupon(c);
    setForm({
      code: c.code,
      description: c.description || "",
      type: c.type,
      value: String(c.value),
      min_purchase: String(c.min_purchase || 0),
    });
    setDialog(true);
  };

  const save = async () => {
    if (!establishment || !form.code || !form.value) return;
    const payload = {
      establishment_id: establishment.id,
      code: form.code.toUpperCase(),
      description: form.description,
      type: form.type,
      value: parseFloat(form.value),
      min_purchase: parseFloat(form.min_purchase || "0"),
    };

    if (editingCoupon) {
      await supabase.from("coupons").update(payload).eq("id", editingCoupon.id);
      toast({ title: "Cupom atualizado!" });
    } else {
      await supabase.from("coupons").insert(payload);
      toast({ title: "Cupom criado!" });
    }
    setDialog(false);
    resetForm();
    fetchData();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("coupons").update({ is_active: !current }).eq("id", id);
    fetchData();
  };

  const deleteCoupon = async (id: string) => {
    await supabase.from("coupons").delete().eq("id", id);
    fetchData();
    toast({ title: "Cupom removido" });
  };

  const formatPrice = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const chartData = coupons
    .filter((c) => (c.usage_count || 0) > 0)
    .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
    .slice(0, 10)
    .map((c) => ({ code: c.code, usos: c.usage_count || 0 }));

  if (!establishment)
    return (
      <div className="text-center py-12 text-muted-foreground">
        Configure seu estabelecimento primeiro.
      </div>
    );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Cupons</h1>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" /> Novo Cupom
        </Button>
      </div>

      <Tabs defaultValue="gestao">
        <TabsList>
          <TabsTrigger value="gestao">
            <Ticket className="w-4 h-4 mr-1" /> Gestão
          </TabsTrigger>
          <TabsTrigger value="performance">
            <BarChart3 className="w-4 h-4 mr-1" /> Performance
          </TabsTrigger>
        </TabsList>

        {/* ─── Aba Gestão ─── */}
        <TabsContent value="gestao">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-4">
            {coupons.map((c) => (
              <Card
                key={c.id}
                className={`transition-opacity ${!c.is_active ? "opacity-50" : ""}`}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        {c.type === "percentage" ? (
                          <Percent className="w-5 h-5 text-primary" />
                        ) : (
                          <DollarSign className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{c.code}</p>
                        <p className="text-sm text-muted-foreground">
                          {c.type === "percentage"
                            ? `${c.value}% off`
                            : `${formatPrice(Number(c.value))} off`}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={c.is_active !== false}
                      onCheckedChange={() => toggleActive(c.id, c.is_active !== false)}
                    />
                  </div>

                  {c.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Mín: {formatPrice(Number(c.min_purchase || 0))}
                    </span>
                    <span>{c.usage_count || 0} usos</span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEdit(c)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => deleteCoupon(c.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {coupons.length === 0 && (
              <p className="text-muted-foreground col-span-full text-center py-8">
                Nenhum cupom criado.
              </p>
            )}
          </div>
        </TabsContent>

        {/* ─── Aba Performance ─── */}
        <TabsContent value="performance">
          <div className="mt-4">
            {chartData.length > 0 ? (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Ranking de Cupons Mais Utilizados
                  </h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="code" className="text-xs" />
                        <YAxis allowDecimals={false} className="text-xs" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar dataKey="usos" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum dado de uso ainda.</p>
                <p className="text-sm">O gráfico aparecerá quando os cupons forem utilizados.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── Modal Criar/Editar ─── */}
      <Dialog
        open={dialog}
        onOpenChange={(v) => {
          setDialog(v);
          if (!v) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCoupon ? "Editar Cupom" : "Criar Cupom"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="EX: PROMO10"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ex: 10% de desconto em compras acima de R$50"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Desconto</Label>
              <div className="flex gap-2">
                {[
                  { value: "percentage", label: "Porcentagem (%)", icon: Percent },
                  { value: "fixed", label: "Valor Fixo (R$)", icon: DollarSign },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setForm({ ...form, type: opt.value })}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      form.type === opt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-foreground"
                    }`}
                  >
                    <opt.icon className="w-4 h-4" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>
                Valor {form.type === "percentage" ? "(%)" : "(R$)"}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {form.type === "percentage" ? "%" : "R$"}
                </span>
                <Input
                  type="number"
                  step="0.01"
                  className="pl-10"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  placeholder={form.type === "percentage" ? "10" : "5.00"}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Compra mínima (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.min_purchase}
                onChange={(e) => setForm({ ...form, min_purchase: e.target.value })}
              />
            </div>
            <Button onClick={save} className="w-full">
              {editingCoupon ? "Atualizar Cupom" : "Criar Cupom"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CouponsPage;
