import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Utensils, ArrowRight, ArrowLeft, Check } from "lucide-react";
import ImageCropper from "@/components/ImageCropper";
import MaskedInput from "@/components/MaskedInput";
import { unmask, maskCnpj } from "@/lib/masks";

const niches = ["Açaí", "Pizzaria", "Hamburgueria", "Cookies", "Doceria", "Restaurante", "Sushi", "Padaria", "Cafeteria", "Outro"];

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [establishmentId, setEstablishmentId] = useState<string | null>(null);

  // Step 1
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [niche, setNiche] = useState("");

  // Step 2
  const [cep, setCep] = useState("");
  const [address, setAddress] = useState<any>({});
  const [numero, setNumero] = useState("");
  const [loadingCep, setLoadingCep] = useState(false);

  // Step 3
  const [logoBlob, setLogoBlob] = useState<Blob | null>(null);
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("establishments").select("*").eq("owner_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setEstablishmentId(data.id);
        if (data.onboarding_completed) {
          navigate("/dashboard", { replace: true });
        }
        if (data.name) setName(data.name);
        if (data.whatsapp) setWhatsapp(data.whatsapp);
        if (data.cnpj) setCnpj(maskCnpj(data.cnpj));
        if (data.niche) setNiche(data.niche);
      }
    });
  }, [user, navigate]);

  const searchCep = async () => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length < 8) return;
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) { toast({ title: "CEP não encontrado", variant: "destructive" }); return; }
      setAddress({ cep: data.cep, rua: data.logradouro, bairro: data.bairro, cidade: data.localidade, uf: data.uf });
    } catch {
      toast({ title: "Erro ao buscar CEP", variant: "destructive" });
    } finally {
      setLoadingCep(false);
    }
  };

  const uploadImage = async (blob: Blob, path: string): Promise<string> => {
    const { error } = await supabase.storage.from("establishments").upload(path, blob, { upsert: true, contentType: "image/webp" });
    if (error) throw error;
    const { data } = supabase.storage.from("establishments").getPublicUrl(path);
    return data.publicUrl;
  };

  const saveStep1 = async () => {
    if (!user || !name) return;
    const cnpjDigits = cnpj.replace(/\D/g, "").length;
    if (cnpjDigits > 0 && cnpjDigits < 14) {
      toast({ title: "CNPJ incompleto", description: "Informe os 14 dígitos.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");
    const payload = { name, slug, whatsapp: unmask(whatsapp), cnpj: unmask(cnpj), niche, owner_id: user.id };

    if (establishmentId) {
      await supabase.from("establishments").update(payload).eq("id", establishmentId);
    } else {
      const { data } = await supabase.from("establishments").insert(payload).select().single();
      if (data) setEstablishmentId(data.id);
    }
    setSaving(false);
    setStep(2);
  };

  const saveStep2 = async () => {
    if (!establishmentId || !address.cep) return;
    setSaving(true);
    const fullAddress = { ...address, numero };

    let lat = 0, lng = 0;
    try {
      const q = `${address.rua}, ${numero}, ${address.cidade}, ${address.uf}, Brazil`;
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`);
      const geoData = await geoRes.json();
      if (geoData.length > 0) {
        lat = parseFloat(geoData[0].lat);
        lng = parseFloat(geoData[0].lon);
      }
    } catch { /* silently skip geocoding */ }

    await supabase.from("establishments").update({ address: fullAddress, lat, lng }).eq("id", establishmentId);
    setSaving(false);
    setStep(3);
  };

  const saveStep3 = async () => {
    if (!establishmentId || !user) return;
    setSaving(true);
    try {
      let logoUrl = "";
      let coverUrl = "";

      if (logoBlob) {
        logoUrl = await uploadImage(logoBlob, `${user.id}/logo.webp`);
      }
      if (coverBlob) {
        coverUrl = await uploadImage(coverBlob, `${user.id}/cover.webp`);
      }

      const updatePayload: any = { onboarding_completed: true };
      if (logoUrl) updatePayload.logo_url = logoUrl;
      if (coverUrl) updatePayload.cover_url = coverUrl;

      await supabase.from("establishments").update(updatePayload).eq("id", establishmentId);
      toast({ title: "Tudo pronto!", description: "Seu estabelecimento foi configurado." });
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      toast({ title: "Erro ao salvar imagens", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const whatsappDigits = whatsapp.replace(/\D/g, "").length;
  const cnpjDigits = cnpj.replace(/\D/g, "").length;
  const step1Valid = name.trim().length > 0 && niche.length > 0 && whatsappDigits >= 10 && (cnpjDigits === 0 || cnpjDigits === 14);
  const step2Valid = !!address.cep && numero.trim().length > 0;
  const step3Valid = !!logoBlob || !!coverBlob;

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="h-16 border-b border-border bg-card flex items-center px-6">
        <Utensils className="w-6 h-6 text-primary mr-2" />
        <span className="text-xl font-bold text-foreground">EPRATO</span>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <div className="mb-8">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Passo {step} de 3</span>
              <span>{Math.round((step / 3) * 100)}%</span>
            </div>
            <Progress value={(step / 3) * 100} className="h-2" />
          </div>

          <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
            {step === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Dados do Negócio</h2>
                  <p className="text-muted-foreground mt-1">Preencha as informações básicas do seu estabelecimento.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome do negócio *</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Açaí da Vila" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nicho *</Label>
                    <select className="w-full rounded-lg border border-input px-3 py-2 text-sm bg-background" value={niche} onChange={e => setNiche(e.target.value)}>
                      <option value="">Selecione...</option>
                      {niches.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>WhatsApp *</Label>
                      <MaskedInput mask="phone" value={whatsapp} onValueChange={setWhatsapp} placeholder="(00) 00000-0000" />
                    </div>
                    <div className="space-y-2">
                      <Label>CNPJ (opcional)</Label>
                      <MaskedInput mask="cnpj" value={cnpj} onValueChange={setCnpj} placeholder="00.000.000/0000-00" />
                    </div>
                  </div>
                </div>

                <Button className="w-full" size="lg" onClick={saveStep1} disabled={!step1Valid || saving}>
                  {saving ? "Salvando..." : "Próximo"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Endereço</h2>
                  <p className="text-muted-foreground mt-1">Informe o endereço para cálculo de frete.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>CEP *</Label>
                    <div className="flex gap-2">
                      <MaskedInput mask="cep" value={cep} onValueChange={setCep} placeholder="00000-000" />
                      <Button variant="outline" onClick={searchCep} disabled={loadingCep}>
                        {loadingCep ? "Buscando..." : "Buscar"}
                      </Button>
                    </div>
                  </div>

                  {address.cep && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="space-y-2">
                        <Label>Rua</Label>
                        <Input value={address.rua || ""} readOnly className="bg-muted" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Número *</Label>
                          <Input value={numero} onChange={e => setNumero(e.target.value)} placeholder="Nº" />
                        </div>
                        <div className="space-y-2">
                          <Label>Bairro</Label>
                          <Input value={address.bairro || ""} readOnly className="bg-muted" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Cidade</Label>
                          <Input value={address.cidade || ""} readOnly className="bg-muted" />
                        </div>
                        <div className="space-y-2">
                          <Label>UF</Label>
                          <Input value={address.uf || ""} readOnly className="bg-muted" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" size="lg" onClick={() => setStep(1)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar
                  </Button>
                  <Button className="flex-1" size="lg" onClick={saveStep2} disabled={!step2Valid || saving}>
                    {saving ? "Salvando..." : "Próximo"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Identidade Visual</h2>
                  <p className="text-muted-foreground mt-1">Adicione o logo e a capa do seu cardápio.</p>
                </div>

                <ImageCropper aspectRatio={1} onCropped={setLogoBlob} label="Logo" hint="Proporção 1:1 (quadrado)" />
                <ImageCropper aspectRatio={16 / 9} onCropped={setCoverBlob} label="Capa" hint="Proporção 16:9 (banner)" />

                <div className="flex gap-3">
                  <Button variant="outline" size="lg" onClick={() => setStep(2)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar
                  </Button>
                  <Button className="flex-1" size="lg" onClick={saveStep3} disabled={saving}>
                    {saving ? "Salvando..." : "Finalizar"}
                    <Check className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
