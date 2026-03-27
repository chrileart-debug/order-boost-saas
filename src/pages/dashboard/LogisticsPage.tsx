import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Truck } from "lucide-react";

const LogisticsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [establishment, setEstablishment] = useState<any>(null);
  const [form, setForm] = useState({ base_fee: "0", km_included: "0", km_extra_price: "0" });

  useEffect(() => {
    if (!user) return;
    supabase.from("establishments").select("*").eq("owner_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setEstablishment(data);
        setForm({ base_fee: String(data.base_fee), km_included: String(data.km_included), km_extra_price: String(data.km_extra_price) });
      }
    });
  }, [user]);

  const save = async () => {
    if (!establishment) return;
    const { error } = await supabase.from("establishments").update({
      base_fee: parseFloat(form.base_fee),
      km_included: parseFloat(form.km_included),
      km_extra_price: parseFloat(form.km_extra_price),
    }).eq("id", establishment.id);
    if (!error) toast({ title: "Logística atualizada!" });
  };

  if (!establishment) return <div className="text-center py-12 text-muted-foreground">Configure seu estabelecimento primeiro.</div>;

  return (
    <div className="space-y-6 animate-fade-in max-w-lg">
      <h1 className="text-2xl font-bold text-foreground">Logística</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Truck className="w-5 h-5 text-primary" /> Frete Híbrido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Taxa Base (R$)</Label>
            <Input type="number" step="0.01" value={form.base_fee} onChange={e => setForm({ ...form, base_fee: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>KM inclusos na taxa base</Label>
            <Input type="number" step="0.1" value={form.km_included} onChange={e => setForm({ ...form, km_included: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Preço por KM extra (R$)</Label>
            <Input type="number" step="0.01" value={form.km_extra_price} onChange={e => setForm({ ...form, km_extra_price: e.target.value })} />
          </div>
          <Button onClick={save} className="w-full">Salvar configurações</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default LogisticsPage;
