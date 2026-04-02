import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useEstablishment } from "@/components/EstablishmentProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Truck, Plus, Trash2, MapPin, Package, Crown } from "lucide-react";
import MaskedInput from "@/components/MaskedInput";
import { getPlanLimits } from "@/lib/planLimits";
import { useNavigate } from "react-router-dom";

type DeliveryRule = {
  id: string;
  establishment_id: string;
  name: string;
  type: string;
  value: number;
  min_cep: string | null;
  max_cep: string | null;
  min_km: number | null;
  max_km: number | null;
  is_active: boolean;
  priority: number;
};

const TYPE_LABELS: Record<string, string> = {
  free: "Frete Grátis",
  fixed_zip: "Valor fixo por faixa de CEP",
  fixed_global: "Valor fixo global",
  per_km: "Valor por KM",
};

const LogisticsPage = () => {
  const { user } = useAuth();
  const { establishment, loading: estLoading } = useEstablishment();
  const { toast } = useToast();
  const navigate = useNavigate();
  const planLimits = getPlanLimits(establishment?.plan_name);
  const [rules, setRules] = useState<DeliveryRule[]>([]);
  const [dialog, setDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<DeliveryRule | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "fixed_global",
    value: "0",
    min_cep: "",
    max_cep: "",
    min_km: "",
    max_km: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (establishment?.id) {
      fetchRules(establishment.id);
    }
  }, [establishment?.id]);

  const fetchRules = async (estId: string) => {
    const { data } = await supabase
      .from("delivery_rules" as any)
      .select("*")
      .eq("establishment_id", estId)
      .order("priority", { ascending: true });
    setRules((data as any as DeliveryRule[]) || []);
  };

  const openCreate = () => {
    setEditingRule(null);
    setForm({ name: "", type: "fixed_global", value: "0", min_cep: "", max_cep: "", min_km: "", max_km: "" });
    setDialog(true);
  };

  const openEdit = (r: DeliveryRule) => {
    setEditingRule(r);
    setForm({
      name: r.name,
      type: r.type,
      value: String(r.value),
      min_cep: r.min_cep || "",
      max_cep: r.max_cep || "",
      min_km: r.min_km != null ? String(r.min_km) : "0",
      max_km: r.max_km ? String(r.max_km) : "",
    });
    setDialog(true);
  };

  const handleSave = async () => {
    if (!establishment) return;
    setSaving(true);

    const payload: any = {
      establishment_id: establishment.id,
      name: form.name,
      type: form.type,
      value: form.type === "free" ? 0 : parseFloat(form.value) || 0,
      min_cep: form.type === "fixed_zip" || form.type === "free" ? form.min_cep.replace(/\D/g, "") || null : null,
      max_cep: form.type === "fixed_zip" || form.type === "free" ? form.max_cep.replace(/\D/g, "") || null : null,
      min_km: form.type === "per_km" ? parseFloat(form.min_km) || 0 : null,
      max_km: form.type === "per_km" ? parseFloat(form.max_km) || null : null,
      priority: editingRule?.priority ?? rules.length,
    };

    let error;
    if (editingRule) {
      ({ error } = await supabase.from("delivery_rules" as any).update(payload).eq("id", editingRule.id));
    } else {
      ({ error } = await supabase.from("delivery_rules" as any).insert(payload));
    }

    if (!error) {
      toast({ title: editingRule ? "Regra atualizada!" : "Regra criada!" });
      setDialog(false);
      fetchRules(establishment.id);
    } else {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!establishment) return;
    await supabase.from("delivery_rules" as any).delete().eq("id", id);
    toast({ title: "Regra removida" });
    fetchRules(establishment.id);
  };

  const toggleActive = async (r: DeliveryRule) => {
    await supabase.from("delivery_rules" as any).update({ is_active: !r.is_active }).eq("id", r.id);
    fetchRules(establishment.id);
  };

  if (estLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i}><CardContent className="p-6 space-y-3"><Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-20" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (!establishment)
    return (
      <div className="text-center py-12 text-muted-foreground">
        Configure seu estabelecimento primeiro.
      </div>
    );

  const showCepFields = form.type === "fixed_zip" || form.type === "free";
  const showKmField = form.type === "per_km";
  const showValueField = form.type !== "free";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Logística de Entrega</h1>
        {!planLimits.allowMultipleDeliveryRules && rules.length >= 1 ? (
          <Button size="sm" variant="outline" className="gap-1.5 border-primary/30 text-primary" onClick={() => navigate("/dashboard/subscription")}>
            <Crown className="w-4 h-4" /> Limite do plano Essential
          </Button>
        ) : (
          <Button onClick={openCreate} size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" /> Adicionar Regra
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Defina regras de entrega por CEP ou distância. A prioridade é automática: regras de CEP específico têm prioridade sobre regras por KM, que têm prioridade sobre regras globais.
      </p>

      {rules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <Truck className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">Nenhuma regra de entrega cadastrada.</p>
            <Button onClick={openCreate} variant="outline" size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" /> Criar primeira regra
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {rules.map((r) => (
            <Card
              key={r.id}
              className={`cursor-pointer transition-opacity ${!r.is_active ? "opacity-50" : ""}`}
              onClick={() => openEdit(r)}
            >
              <CardContent className="flex items-center gap-4 py-4 px-5">
                <div className="shrink-0">
                  {r.type === "per_km" || r.type === "fixed_global" ? (
                    <Truck className="w-5 h-5 text-primary" />
                  ) : r.type === "free" ? (
                    <Package className="w-5 h-5 text-green-500" />
                  ) : (
                    <MapPin className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm text-foreground truncate">{r.name || TYPE_LABELS[r.type]}</h3>
                  <p className="text-xs text-muted-foreground">
                    {r.type === "free" && "Frete Grátis"}
                    {r.type === "fixed_zip" && `R$ ${Number(r.value).toFixed(2)} · CEP ${r.min_cep}–${r.max_cep}`}
                    {r.type === "fixed_global" && `R$ ${Number(r.value).toFixed(2)} fixo`}
                    {r.type === "per_km" && `R$ ${Number(r.value).toFixed(2)} · ${Number(r.min_km) || 0}–${r.max_km ?? "∞"} km`}
                  </p>
                </div>
                <Switch
                  checked={r.is_active}
                  onCheckedChange={(e) => {
                    e; // prevent propagation
                    toggleActive(r);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(r.id);
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog for Create/Edit */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Editar Regra" : "Nova Regra de Entrega"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Nome da regra</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Centro - Frete Grátis"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Frete Grátis (por faixa de CEP)</SelectItem>
                  <SelectItem value="fixed_zip">Valor fixo por faixa de CEP</SelectItem>
                  <SelectItem value="fixed_global">Valor fixo global</SelectItem>
                  <SelectItem value="per_km">Valor fixo por faixa de KM (escadinha)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showCepFields && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>CEP inicial</Label>
                  <MaskedInput value={form.min_cep} onValueChange={(v) => setForm({ ...form, min_cep: v })} mask="cep" placeholder="00000-000" />
                </div>
                <div className="space-y-2">
                  <Label>CEP final</Label>
                  <MaskedInput value={form.max_cep} onValueChange={(v) => setForm({ ...form, max_cep: v })} mask="cep" placeholder="99999-999" />
                </div>
              </div>
            )}

            {showValueField && (
              <div className="space-y-2">
                <Label>{form.type === "per_km" ? "Valor fixo do frete (R$)" : "Valor do frete (R$)"}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                />
              </div>
            )}

            {showKmField && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Distância Inicial (KM)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.min_km}
                    onChange={(e) => setForm({ ...form, min_km: e.target.value })}
                    placeholder="Ex: 0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Distância Final (KM)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.max_km}
                    onChange={(e) => setForm({ ...form, max_km: e.target.value })}
                    placeholder="Ex: 15"
                  />
                </div>
              </div>
            )}

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Salvando..." : editingRule ? "Atualizar Regra" : "Criar Regra"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LogisticsPage;
